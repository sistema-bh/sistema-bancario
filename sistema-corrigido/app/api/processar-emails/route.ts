import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Função para extrair informações de PIX do corpo do e-mail do Itaú
function extrairInfoPix(emailBody: string): { nome: string; valor: number } | null {
  try {
    // Padrões comuns em notificações de PIX do Itaú
    const regexValor = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/;
    const matchValor = emailBody.match(regexValor);
    
    if (!matchValor) return null;
    
    const valorStr = matchValor[1].replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(valorStr);
    
    // Extrair nome do pagador
    // Novo padrão: "de EDUARDO CPF XXX..."
    const regexNome = /de\s+([A-Z\s]+)CPF/;
    const matchNome = emailBody.match(regexNome);
    
    if (!matchNome) return null;
    
    const nome = matchNome[1].trim();
    
    return { nome, valor };
  } catch (error) {
    console.error('Erro ao extrair info do PIX:', error);
    return null;
  }
}

// Função para normalizar nomes para comparação
function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

// Função para calcular similaridade entre dois nomes
function calcularSimilaridade(nome1: string, nome2: string): number {
  const n1 = normalizarNome(nome1);
  const n2 = normalizarNome(nome2);
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  const palavras1 = n1.split(' ');
  const palavras2 = n2.split(' ');
  
  let matches = 0;
  for (const p1 of palavras1) {
    for (const p2 of palavras2) {
      if (p1 === p2 && p1.length > 2) {
        matches++;
      }
    }
  }
  
  const maxPalavras = Math.max(palavras1.length, palavras2.length);
  return matches / maxPalavras;
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { emails } = body;
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const resultados = [];
    
    for (const email of emails) {
      const infoPix = extrairInfoPix(email.body);
      
      if (!infoPix) {
        resultados.push({ email: email.id, status: 'info_nao_extraida' });
        continue;
      }

      const nomeNormalizado = normalizarNome(infoPix.nome);
      
      // PASSO 1: Verificar se já existe um vínculo conhecido para este nome de PIX
      const { data: nomePix, error: errorNomePix } = await supabase
        .from('Nomes_PIX')
        .select('*, devedor:Devedores(*)')
        .eq('nome_normalizado', nomeNormalizado)
        .eq('ativo', true)
        .single();
      
      let devedorVinculado = null;
      let nomePixId = null;
      
      if (nomePix && nomePix.devedor_id) {
        // Já existe um vínculo conhecido!
        devedorVinculado = nomePix.devedor;
        nomePixId = nomePix.id;
        
        // Atualizar estatísticas do nome PIX
        await supabase
          .from('Nomes_PIX')
          .update({
            ultima_ocorrencia: new Date().toISOString(),
            total_ocorrencias: nomePix.total_ocorrencias + 1
          })
          .eq('id', nomePix.id);
      } else {
        // PASSO 2: Não existe vínculo. Tentar encontrar correspondência automática
        const { data: clientes } = await supabase
          .from('Devedores')
          .select('*')
          .eq('ativo', true);
        
        let melhorMatch: any = null;
        let melhorSimilaridade = 0;
        
        if (clientes) {
          for (const cliente of clientes) {
            const similaridade = calcularSimilaridade(infoPix.nome, cliente.nome_devedor);
            if (similaridade > melhorSimilaridade) {
              melhorSimilaridade = similaridade;
              melhorMatch = cliente;
            }
          }
        }
        
        // Se similaridade >= 80%, consideramos uma correspondência automática
        if (melhorMatch && melhorSimilaridade >= 0.8) {
          devedorVinculado = melhorMatch;
          
          // Criar ou atualizar registro de nome PIX com vínculo automático
          if (nomePix) {
            await supabase
              .from('Nomes_PIX')
              .update({
                devedor_id: melhorMatch.id,
                ultima_ocorrencia: new Date().toISOString(),
                total_ocorrencias: nomePix.total_ocorrencias + 1,
                vinculo_manual: false
              })
              .eq('id', nomePix.id);
            nomePixId = nomePix.id;
          } else {
            const { data: novoNomePix } = await supabase
              .from('Nomes_PIX')
              .insert({
                nome_pix: infoPix.nome,
                nome_normalizado: nomeNormalizado,
                devedor_id: melhorMatch.id,
                vinculo_manual: false
              })
              .select()
              .single();
            nomePixId = novoNomePix?.id;
          }
        } else {
          // Não encontrou correspondência. Salvar nome PIX sem vínculo para revisão manual
          if (!nomePix) {
            const { data: novoNomePix } = await supabase
              .from('Nomes_PIX')
              .insert({
                nome_pix: infoPix.nome,
                nome_normalizado: nomeNormalizado,
                devedor_id: null,
                vinculo_manual: false
              })
              .select()
              .single();
            nomePixId = novoNomePix?.id;
          } else {
            nomePixId = nomePix.id;
            await supabase
              .from('Nomes_PIX')
              .update({
                ultima_ocorrencia: new Date().toISOString(),
                total_ocorrencias: nomePix.total_ocorrencias + 1
              })
              .eq('id', nomePix.id);
          }
        }
      }
      
      // PASSO 3: Se encontrou devedor vinculado, buscar movimentação pendente e dar baixa
      let movimentacaoBaixada = null;
      
      if (devedorVinculado) {
        const { data: movimentacoes } = await supabase
          .from('Movimentacoes_Dia')
          .select('*')
          .eq('devedor_id', devedorVinculado.id)
          .eq('tipo', 'Débito')
          .in('status_pagamento', ['Aguardando', 'Atrasado'])
          .eq('valor', infoPix.valor)
          .limit(1);
        
        if (movimentacoes && movimentacoes.length > 0) {
          const mov = movimentacoes[0];
          
          // Dar baixa na movimentação
          await supabase
            .from('Movimentacoes_Dia')
            .update({
              status_pagamento: 'Recebido',
              metodo_pagamento: 'PIX',
              data_movimentacao: new Date().toISOString().split('T')[0]
            })
            .eq('id', mov.id);
          
          movimentacaoBaixada = mov;
        }
      }
      
      // PASSO 4: Registrar no histórico de PIX
      await supabase
        .from('Historico_PIX')
        .insert({
          nome_pix_id: nomePixId,
          devedor_id: devedorVinculado?.id || null,
          valor: infoPix.valor,
          identificado_automaticamente: !!devedorVinculado,
          movimentacao_id: movimentacaoBaixada?.id || null,
          email_id: email.id,
          corpo_email: email.body
        });
      
      // PASSO 5: Retornar resultado
      if (movimentacaoBaixada) {
        resultados.push({
          email: email.id,
          status: 'baixa_realizada',
          devedor: devedorVinculado.nome_devedor,
          nome_pix: infoPix.nome,
          valor: infoPix.valor,
          movimentacao_id: movimentacaoBaixada.id
        });
      } else if (devedorVinculado) {
        resultados.push({
          email: email.id,
          status: 'devedor_identificado_sem_movimentacao',
          devedor: devedorVinculado.nome_devedor,
          nome_pix: infoPix.nome,
          valor: infoPix.valor
        });
      } else {
        resultados.push({
          email: email.id,
          status: 'aguardando_vinculo_manual',
          nome_pix: infoPix.nome,
          valor: infoPix.valor,
          nome_pix_id: nomePixId
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      processados: emails.length,
      resultados
    });
    
  } catch (error) {
    console.error('Erro ao processar e-mails:', error);
    return NextResponse.json({ error: 'Erro ao processar e-mails' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Endpoint de processamento de e-mails configurado',
      instrucoes: 'Use POST para enviar e-mails para processamento'
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
