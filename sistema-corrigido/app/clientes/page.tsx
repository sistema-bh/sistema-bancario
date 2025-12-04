"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Devedor {
  id: string;
  nome_devedor: string;
  rota: string | null;
  ativo: boolean;
}

interface Movimentacao {
  id: string;
  devedor_id: string | null;
  descricao: string;
  valor: number;
  status_pagamento: 'Aguardando' | 'Recebido' | 'Atrasado';
  devedor?: Devedor;
}

export default function ClientesPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para gerenciamento de clientes
  const [clientes, setClientes] = useState<Devedor[]>([]);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [nomeNovoCliente, setNomeNovoCliente] = useState('');
  const [rotaNovoCliente, setRotaNovoCliente] = useState('');
  const [clienteEditando, setClienteEditando] = useState<Devedor | null>(null);
  
  // Estados para tabela de movimentações
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [celulaEditando, setCelulaEditando] = useState<{id: string, campo: string} | null>(null);
  const [valorTemp, setValorTemp] = useState('');
  const [buscaNome, setBuscaNome] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Devedor[]>([]);

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
      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('Devedores')
        .select('*')
        .eq('ativo', true)
        .order('nome_devedor');
      
      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

      // Carregar movimentações
      const { data: movimentacoesData, error: movimentacoesError } = await supabase
        .from('Movimentacoes_Dia')
        .select(`
          *,
          devedor:Devedores(*)
        `)
        .eq('tipo', 'Débito')
        .order('data_movimentacao', { ascending: false });
      
      if (movimentacoesError) throw movimentacoesError;
      setMovimentacoes(movimentacoesData || []);
      
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

  // GERENCIAMENTO DE CLIENTES

  const adicionarCliente = async () => {
    if (!nomeNovoCliente.trim()) {
      alert('Digite o nome do cliente');
      return;
    }

    try {
      const { error } = await supabase
        .from('Devedores')
        .insert({
          nome_devedor: nomeNovoCliente,
          rota: rotaNovoCliente || null,
          ativo: true
        });
      
      if (error) throw error;
      
      setMostrarFormCliente(false);
      setNomeNovoCliente('');
      setRotaNovoCliente('');
      carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      alert('Erro ao adicionar cliente');
    }
  };

  const editarCliente = async (cliente: Devedor) => {
    const novoNome = prompt('Digite o novo nome:', cliente.nome_devedor);
    if (!novoNome) return;

    try {
      const { error } = await supabase
        .from('Devedores')
        .update({ nome_devedor: novoNome })
        .eq('id', cliente.id);
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao editar cliente:', error);
      alert('Erro ao editar cliente');
    }
  };

  const removerCliente = async (clienteId: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente?')) return;

    try {
      const { error } = await supabase
        .from('Devedores')
        .update({ ativo: false })
        .eq('id', clienteId);
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover cliente:', error);
      alert('Erro ao remover cliente');
    }
  };

  // GERENCIAMENTO DE MOVIMENTAÇÕES

  const adicionarMovimentacao = async () => {
    try {
      const { error } = await supabase
        .from('Movimentacoes_Dia')
        .insert({
          descricao: 'Nova movimentação',
          valor: 0,
          tipo: 'Débito',
          status_pagamento: 'Aguardando',
          data_movimentacao: new Date().toISOString().split('T')[0]
        });
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error);
      alert('Erro ao adicionar movimentação');
    }
  };

  const atualizarMovimentacao = async (movId: string, campo: string, valor: any) => {
    try {
      const updateData: any = {};
      updateData[campo] = valor;
      
      const { error } = await supabase
        .from('Movimentacoes_Dia')
        .update(updateData)
        .eq('id', movId);
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar movimentação:', error);
      alert('Erro ao atualizar movimentação');
    }
  };

  const removerMovimentacao = async (movId: string) => {
    if (!confirm('Tem certeza que deseja remover esta movimentação?')) return;

    try {
      const { error } = await supabase
        .from('Movimentacoes_Dia')
        .delete()
        .eq('id', movId);
      
      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover movimentação:', error);
      alert('Erro ao remover movimentação');
    }
  };

  const iniciarEdicaoNome = (movId: string) => {
    setCelulaEditando({ id: movId, campo: 'nome' });
    setBuscaNome('');
    setClientesFiltrados(clientes);
  };

  const selecionarCliente = async (movId: string, clienteId: string) => {
    await atualizarMovimentacao(movId, 'devedor_id', clienteId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      await atualizarMovimentacao(movId, 'descricao', cliente.nome_devedor);
    }
    setCelulaEditando(null);
  };

  const filtrarClientes = (busca: string) => {
    setBuscaNome(busca);
    if (!busca.trim()) {
      setClientesFiltrados(clientes);
    } else {
      const filtrados = clientes.filter(c => 
        c.nome_devedor.toLowerCase().includes(busca.toLowerCase())
      );
      setClientesFiltrados(filtrados);
    }
  };

  const cores = {
    Aguardando: { bg: '#fffbe6', text: '#facc15', label: 'Pendente' },
    Recebido: { bg: '#f0fdf4', text: '#4ade80', label: 'Pago' },
    Atrasado: { bg: '#fef2f2', text: '#f87171', label: 'Atrasado' }
  };

  if (loading || !user) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#111827', marginBottom: '10px' }}>Cartela de Clientes</h1>
          <nav style={{ display: 'flex', gap: '15px' }}>
            <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← Balanço do Dia</Link>
          </nav>
        </div>
        <div>
          <span style={{marginRight: '20px'}}>Olá, {user.email}</span>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </header>

      {/* SEÇÃO 1: GERENCIAR CADASTRO DE CLIENTES */}
      <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#111827', margin: 0 }}>Gerenciar Cadastro de Clientes</h2>
          <button 
            onClick={() => setMostrarFormCliente(true)}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            + Adicionar Cliente
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
          {clientes.map(cliente => (
            <div key={cliente.id} style={{ 
              padding: '15px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '8px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontWeight: '500', color: '#111' }}>{cliente.nome_devedor}</div>
                {cliente.rota && <div style={{ fontSize: '12px', color: '#666' }}>Rota: {cliente.rota}</div>}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => editarCliente(cliente)}
                  style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button 
                  onClick={() => removerCliente(cliente.id)}
                  style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO 2: TABELA DE MOVIMENTAÇÕES */}
      <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#111827', margin: 0 }}>Tabela de Movimentações</h2>
          <button 
            onClick={adicionarMovimentacao}
            style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            + Adicionar Linha
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Saldo Devido</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Situação</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map(mov => {
              const cor = cores[mov.status_pagamento];
              return (
                <tr key={mov.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {/* COLUNA NOME */}
                  <td style={{ padding: '12px', position: 'relative' }}>
                    {celulaEditando?.id === mov.id && celulaEditando?.campo === 'nome' ? (
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text"
                          value={buscaNome}
                          onChange={(e) => filtrarClientes(e.target.value)}
                          placeholder="Digite para buscar..."
                          style={{ width: '100%', padding: '8px', border: '2px solid #2563eb', borderRadius: '5px', fontSize: '14px' }}
                          autoFocus
                        />
                        {clientesFiltrados.length > 0 && (
                          <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            backgroundColor: 'white', 
                            border: '1px solid #ddd', 
                            borderRadius: '5px', 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            zIndex: 1000,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}>
                            {clientesFiltrados.map(cliente => (
                              <div 
                                key={cliente.id}
                                onClick={() => selecionarCliente(mov.id, cliente.id)}
                                style={{ 
                                  padding: '10px', 
                                  cursor: 'pointer', 
                                  borderBottom: '1px solid #f3f4f6',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                              >
                                {cliente.nome_devedor}
                                {cliente.rota && <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>({cliente.rota})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => setCelulaEditando(null)}
                          style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => iniciarEdicaoNome(mov.id)}
                        style={{ cursor: 'pointer', padding: '5px', borderRadius: '5px', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {mov.devedor?.nome_devedor || mov.descricao || 'Clique para selecionar'}
                      </div>
                    )}
                  </td>

                  {/* COLUNA VALOR */}
                  <td style={{ padding: '12px' }}>
                    {celulaEditando?.id === mov.id && celulaEditando?.campo === 'valor' ? (
                      <div>
                        <input 
                          type="number"
                          value={valorTemp}
                          onChange={(e) => setValorTemp(e.target.value)}
                          style={{ width: '120px', padding: '8px', border: '2px solid #2563eb', borderRadius: '5px', fontSize: '14px' }}
                          autoFocus
                          onBlur={() => {
                            if (valorTemp) {
                              atualizarMovimentacao(mov.id, 'valor', parseFloat(valorTemp));
                            }
                            setCelulaEditando(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              if (valorTemp) {
                                atualizarMovimentacao(mov.id, 'valor', parseFloat(valorTemp));
                              }
                              setCelulaEditando(null);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setCelulaEditando({ id: mov.id, campo: 'valor' });
                          setValorTemp(mov.valor.toString());
                        }}
                        style={{ cursor: 'pointer', padding: '5px', borderRadius: '5px', fontWeight: '500', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        R$ {mov.valor.toFixed(2).replace('.', ',')}
                      </div>
                    )}
                  </td>

                  {/* COLUNA SITUAÇÃO */}
                  <td style={{ padding: '12px' }}>
                    {celulaEditando?.id === mov.id && celulaEditando?.campo === 'situacao' ? (
                      <select 
                        value={mov.status_pagamento}
                        onChange={(e) => {
                          atualizarMovimentacao(mov.id, 'status_pagamento', e.target.value);
                          setCelulaEditando(null);
                        }}
                        style={{ padding: '8px', border: '2px solid #2563eb', borderRadius: '5px', fontSize: '14px', cursor: 'pointer' }}
                        autoFocus
                      >
                        <option value="Aguardando">Pendente</option>
                        <option value="Recebido">Pago</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    ) : (
                      <div 
                        onClick={() => setCelulaEditando({ id: mov.id, campo: 'situacao' })}
                        style={{ 
                          cursor: 'pointer', 
                          padding: '8px 12px', 
                          borderRadius: '5px', 
                          backgroundColor: cor.bg, 
                          color: cor.text, 
                          fontWeight: '500',
                          display: 'inline-block',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {cor.label}
                      </div>
                    )}
                  </td>

                  {/* COLUNA AÇÕES */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => removerMovimentacao(mov.id)}
                      style={{ padding: '5px 15px', fontSize: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {movimentacoes.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            Nenhuma movimentação cadastrada. Clique em "+ Adicionar Linha" para começar.
          </p>
        )}
      </section>

      {/* MODAL ADICIONAR CLIENTE */}
      {mostrarFormCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ marginBottom: '20px' }}>Adicionar Novo Cliente</h3>
            <input 
              type="text" 
              value={nomeNovoCliente}
              onChange={(e) => setNomeNovoCliente(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '15px' }}
              placeholder="Nome do cliente"
            />
            <input 
              type="text" 
              value={rotaNovoCliente}
              onChange={(e) => setRotaNovoCliente(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '5px', marginBottom: '20px' }}
              placeholder="Rota (DV, R1, R2, B3) - Opcional"
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={adicionarCliente}
                style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                Adicionar
              </button>
              <button 
                onClick={() => setMostrarFormCliente(false)}
                style={{ flex: 1, backgroundColor: '#6b7280', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
