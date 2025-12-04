"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Componente para os cards de saldo no topo
const SaldoCard = ({ titulo, valor, cor }: { titulo: string, valor: string, cor: string }) => (
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flex: 1, minWidth: '200px', margin: '10px' }}>
    <h3 style={{ margin: 0, color: '#555', fontSize: '16px' }}>{titulo}</h3>
    <p style={{ margin: '10px 0 0', color: cor, fontSize: '28px', fontWeight: 'bold' }}>{valor}</p>
  </div>
);

// Componente para cada item na lista de devedores
const DevedorItem = ({ nome, valor, status }: { nome: string, valor: string, status: 'Aguardando' | 'Recebido' | 'Atrasado' }) => {
  const cores = {
    Aguardando: { bg: '#fffbe6', text: '#facc15' }, // Amarelo
    Recebido: { bg: '#f0fdf4', text: '#4ade80' },   // Verde
    Atrasado: { bg: '#fef2f2', text: '#f87171' },   // Vermelho
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: cores[status].bg, borderLeft: `5px solid ${cores[status].text}`, marginBottom: '10px', borderRadius: '5px' }}>
      <span style={{ fontWeight: '500', color: '#333' }}>{nome}</span>
      <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#111' }}>R$ {valor}</span>
    </div>
  );
};

export default function BalancoPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    };
    checkUser();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>Carregando...</div>;
  }

  // Dados de exemplo
  const saldos = [
    { titulo: 'Dinheiro em Mãos', valor: '1.250,50', cor: '#333' },
    { titulo: 'Com Cobradores', valor: '3.400,00', cor: '#333' },
    { titulo: 'Conta Nubank (Diego)', valor: '10.150,00', cor: '#333' },
    { titulo: 'Total em Caixa', valor: '14.800,50', cor: '#2563eb' },
    { titulo: 'Total em Débito', valor: '8.950,00', cor: '#ef4444' },
  ];

  const devedores = [
    { nome: 'Carlos Alberto', valor: '150,00', status: 'Recebido' as const },
    { nome: 'Mariana Silva', valor: '300,00', status: 'Aguardando' as const },
    { nome: 'José Pereira', valor: '250,00', status: 'Atrasado' as const },
    { nome: 'Fernanda Costa', valor: '500,00', status: 'Aguardando' as const },
  ];

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', color: '#111827' }}>Balanço do Dia</h1>
        <div>
          <span style={{marginRight: '20px'}}>Olá, {user.email}</span>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </header>

      <section style={{ display: 'flex', flexWrap: 'wrap', margin: '-10px' }}>
        {saldos.map(saldo => <SaldoCard key={saldo.titulo} {...saldo} />)}
      </section>

      <section style={{ marginTop: '40px' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 style={{ fontSize: '22px', color: '#111827', marginBottom: '20px' }}>Devedores do Dia</h2>
          <button style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '16px', cursor: 'pointer', height: 'fit-content' }}>
            + Adicionar Movimentação
          </button>
        </div>
        <div>
          {devedores.map(devedor => <DevedorItem key={devedor.nome} {...devedor} />)}
        </div>
      </section>
    </div>
  );
}
