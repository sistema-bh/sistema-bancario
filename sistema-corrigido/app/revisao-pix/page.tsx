"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NomePix {
  id: string;
  nome_pix: string;
  devedor_id: string | null;
  total_ocorrencias: number;
  primeira_ocorrencia: string;
  ultima_ocorrencia: string;
  vinculo_manual: boolean;
  devedor?: {
    id: string;
    nome_devedor: string;
  };
}

interface Devedor {
  id: string;
  nome_devedor: string;
  rota: string | null;
}

interface HistoricoPix {
  id: string;
  valor: number;
  data_recebimento: string;
  identificado_automaticamente: boolean;
  nome_pix: NomePix;
  devedor?: Devedor;
}

export default function RevisaoPix() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [nomesPix, setNomesPix] = useState<NomePix[]>([]);
  const [clientes, setClientes] = useState<Devedor[]>([]);
  const [historico, setHistorico] = useState<HistoricoPix[]>([]);
  const [vinculando, setVinculando] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        carregarDados();
      }
    };
    checkUser();
  }, [supabase, router]);

  const carregarDados = async () => {
    try {
      // Carregar nomes de PIX
      const { data: nomesData, error: nomesError } = await supabase
        .from('Nomes_PIX')
        .select(`
          *,
          devedor:Devedores(*)
        `)
        .eq('ativo', true)
        .order('ultima_ocorrencia', { ascending: false });
      
      if (nomesError) throw nomesError;
      setNomesPix(nomesData || []);

      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('Devedores')
        .select('*')
        .eq('ativo', true)
        .order('nome_devedor');
      
      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

      // Carregar histórico recente
      const { data: historicoData, error: historicoError } = await supabase
        .from('Historico_PIX')
        .select(`
          *,
          nome_pix:Nomes_PIX(*),
          devedor:Devedores(*)
        `)
        .order('data_recebimento', { ascending: false })
        .limit(50);
      
      if (historicoError) throw historicoError;
      setHistorico(historicoData || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const vincularCliente = async (nomePixId: string, clienteId: string) => {
    try {
      const { error } = await supabase
        .from('Nomes_PIX')
        .update({
          devedor_id: clienteId,
          vinculo_manual: true
        })
        .eq('id', nomePixId);
      
      if (error) throw error;
      
      setVinculando(null);
      carregarDados();
      alert('Vínculo criado com sucesso! Próximos PIX deste nome serão identificados automaticamente.');
    } catch (error) {
      console.error('Erro ao vincular:', error);
      alert('Erro ao criar vínculo');
    }
  };

  const desvincularCliente = async (nomePixId: string) => {
    if (!confirm('Tem certeza que deseja remover este vínculo?')) return;

    try {
      const { error } = await supabase
        .from('Nomes_PIX')
        .update({
          devedor_id: null,
          vinculo_manual: false
        })
        .eq('id', nomePixId);
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao desvincular:', error);
      alert('Erro ao remover vínculo');
    }
  };

  const nomesSemVinculo = nomesPix.filter(n => !n.devedor_id);
  const nomesVinculados = nomesPix.filter(n => n.devedor_id);

  if (loading || !user) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '10px' }}>Revisão de PIX Recebidos</h1>
          <nav style={{ display: 'flex', gap: '15px' }}>
            <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← Balanço do Dia</Link>
            <Link href="/clientes" style={{ color: '#2563eb', textDecoration: 'none' }}>Cartela de Clientes</Link>
          </nav>
        </div>
        <div>
          <span style={{marginRight: '20px'}}>Olá, {user.email}</span>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </header>

      {/* PIX NÃO IDENTIFICADOS */}
      {nomesSemVinculo.length > 0 && (
        <section style={{ backgroundColor: '#fef2f2', padding: '25px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #f87171' }}>
          <h2 style={{ fontSize: '20px', color: '#dc2626', marginBottom: '15px' }}>
            ⚠️ PIX Não Identificados ({nomesSemVinculo.length})
          </h2>
          <p style={{ color: '#991b1b', marginBottom: '20px' }}>
            Estes nomes de PIX foram recebidos mas não foram vinculados a nenhum cliente. Clique em "Vincular" para associá-los.
          </p>

          <div style={{ display: 'grid', gap: '15px' }}>
            {nomesSemVinculo.map(nomePix => (
              <div key={nomePix.id} style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '1px solid #fecaca' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: '500', color: '#111', marginBottom: '10px' }}>
                      {nomePix.nome_pix}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Primeira vez: {new Date(nomePix.primeira_ocorrencia).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Última vez: {new Date(nomePix.ultima_ocorrencia).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Total de PIX recebidos: {nomePix.total_ocorrencias}
                    </div>
                  </div>

                  <div>
                    {vinculando === nomePix.id ? (
                      <div style={{ minWidth: '250px' }}>
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              vincularCliente(nomePix.id, e.target.value);
                            }
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '10px', 
                            fontSize: '14px', 
                            border: '2px solid #2563eb', 
                            borderRadius: '5px', 
                            marginBottom: '10px' 
                          }}
                        >
                          <option value="">Selecione um cliente...</option>
                          {clientes.map(cliente => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome_devedor} {cliente.rota && `(${cliente.rota})`}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => setVinculando(null)}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            fontSize: '14px', 
                            backgroundColor: '#6b7280', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setVinculando(nomePix.id)}
                        style={{ 
                          padding: '10px 20px', 
                          fontSize: '14px', 
                          backgroundColor: '#2563eb', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '5px', 
                          cursor: 'pointer' 
                        }}
                      >
                        Vincular Cliente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PIX VINCULADOS */}
      <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '15px' }}>
          ✅ Nomes de PIX Vinculados ({nomesVinculados.length})
        </h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Estes nomes de PIX já estão vinculados a clientes. Futuros PIX destes nomes serão identificados automaticamente.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Nome no PIX</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Cliente Vinculado</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Ocorrências</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {nomesVinculados.map(nomePix => (
              <tr key={nomePix.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{nomePix.nome_pix}</td>
                <td style={{ padding: '12px', fontWeight: '500' }}>
                  {nomePix.devedor?.nome_devedor}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '5px', 
                    fontSize: '12px', 
                    backgroundColor: nomePix.vinculo_manual ? '#dbeafe' : '#fef3c7',
                    color: nomePix.vinculo_manual ? '#1e40af' : '#92400e'
                  }}>
                    {nomePix.vinculo_manual ? 'Manual' : 'Automático'}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{nomePix.total_ocorrencias}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => desvincularCliente(nomePix.id)}
                    style={{ 
                      padding: '5px 15px', 
                      fontSize: '12px', 
                      backgroundColor: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Desvincular
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {nomesVinculados.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            Nenhum nome de PIX vinculado ainda.
          </p>
        )}
      </section>

      {/* HISTÓRICO RECENTE */}
      <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', color: '#111827', marginBottom: '15px' }}>
          📋 Histórico Recente de PIX
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Data/Hora</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Nome no PIX</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Valor</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Cliente</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {historico.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  {new Date(h.data_recebimento).toLocaleString('pt-BR')}
                </td>
                <td style={{ padding: '12px' }}>{h.nome_pix?.nome_pix || 'N/A'}</td>
                <td style={{ padding: '12px', fontWeight: '500' }}>
                  R$ {h.valor.toFixed(2).replace('.', ',')}
                </td>
                <td style={{ padding: '12px' }}>
                  {h.devedor?.nome_devedor || <span style={{ color: '#999' }}>Não identificado</span>}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '5px', 
                    fontSize: '12px', 
                    backgroundColor: h.identificado_automaticamente ? '#dcfce7' : '#fef3c7',
                    color: h.identificado_automaticamente ? '#166534' : '#92400e'
                  }}>
                    {h.identificado_automaticamente ? '✓ Auto' : '⚠ Manual'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {historico.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            Nenhum PIX recebido ainda.
          </p>
        )}
      </section>
    </div>
  );
}
