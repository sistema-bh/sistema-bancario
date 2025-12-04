-- =====================================================
-- SQL COMPLETO PARA CRIAR TODAS AS TABELAS DO SISTEMA
-- Execute este arquivo COMPLETO no Supabase SQL Editor
-- =====================================================

-- PASSO 1: Criar tabela de Devedores (Clientes)
CREATE TABLE IF NOT EXISTS Devedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_devedor TEXT NOT NULL,
    rota TEXT, -- DV, R1, R2, B3
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PASSO 2: Criar tabela de Saldos de Caixa
CREATE TABLE IF NOT EXISTS Saldos_Caixa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_caixa TEXT NOT NULL UNIQUE,
    saldo_atual DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PASSO 3: Criar tabela de Movimentações do Dia
CREATE TABLE IF NOT EXISTS Movimentacoes_Dia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    devedor_id UUID REFERENCES Devedores(id) ON DELETE SET NULL,
    descricao TEXT,
    valor DECIMAL(10, 2) NOT NULL,
    tipo TEXT CHECK (tipo IN ('Crédito', 'Débito')),
    status_pagamento TEXT CHECK (status_pagamento IN ('Aguardando', 'Recebido', 'Atrasado', 'Não Identificado')),
    metodo_pagamento TEXT, -- PIX, Dinheiro, etc.
    data_movimentacao DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PASSO 4: Criar tabela de Nomes de PIX (para correlação automática)
CREATE TABLE IF NOT EXISTS Nomes_PIX (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_pix TEXT NOT NULL,
    nome_normalizado TEXT NOT NULL,
    devedor_id UUID REFERENCES Devedores(id) ON DELETE SET NULL,
    primeira_ocorrencia TIMESTAMP DEFAULT NOW(),
    ultima_ocorrencia TIMESTAMP DEFAULT NOW(),
    total_ocorrencias INTEGER DEFAULT 1,
    vinculo_manual BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PASSO 5: Criar tabela de Histórico de PIX Recebidos
CREATE TABLE IF NOT EXISTS Historico_PIX (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_pix_id UUID REFERENCES Nomes_PIX(id) ON DELETE CASCADE,
    devedor_id UUID REFERENCES Devedores(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_recebimento TIMESTAMP DEFAULT NOW(),
    identificado_automaticamente BOOLEAN DEFAULT FALSE,
    movimentacao_id UUID REFERENCES Movimentacoes_Dia(id) ON DELETE SET NULL,
    email_id TEXT,
    corpo_email TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PASSO 6: Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_devedores_nome ON Devedores(nome_devedor);
CREATE INDEX IF NOT EXISTS idx_devedores_ativo ON Devedores(ativo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_devedor ON Movimentacoes_Dia(devedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON Movimentacoes_Dia(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON Movimentacoes_Dia(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_nomes_pix_normalizado ON Nomes_PIX(nome_normalizado);
CREATE INDEX IF NOT EXISTS idx_nomes_pix_devedor ON Nomes_PIX(devedor_id);
CREATE INDEX IF NOT EXISTS idx_historico_pix_data ON Historico_PIX(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_historico_pix_devedor ON Historico_PIX(devedor_id);
CREATE INDEX IF NOT EXISTS idx_historico_pix_movimentacao ON Historico_PIX(movimentacao_id);

-- PASSO 7: Criar função para normalizar nomes
CREATE OR REPLACE FUNCTION normalizar_nome(nome TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        TRANSLATE(
            nome,
            'ÁÀÂÃÄÅĀĂĄǺáàâãäåāăąǻÉÈÊËĒĔĖĘĚéèêëēĕėęěÍÌÎÏĨĪĬĮİíìîïĩīĭįıÓÒÔÕÖØŌŎŐǾóòôõöøōŏőǿÚÙÛÜŨŪŬŮŰŲúùûüũūŭůűųÝŶŸýÿŷÇçÑñ',
            'AAAAAAAAAAAaaaaaaaaaaEEEEEEEEEeeeeeeeeeIIIIIIIIIiiiiiiiiiOOOOOOOOOOoooooooooUUUUUUUUUUuuuuuuuuuuYYYyyyC cNn'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- PASSO 8: Inserir dados iniciais de Saldos de Caixa
INSERT INTO Saldos_Caixa (nome_caixa, saldo_atual) VALUES
    ('Dinheiro em Mãos', 0.00),
    ('Dinheiro com Cobradores', 0.00),
    ('Conta Nubank Diego', 0.00)
ON CONFLICT (nome_caixa) DO NOTHING;

-- =====================================================
-- PRONTO! Todas as tabelas foram criadas.
-- =====================================================

-- Você pode verificar se tudo foi criado corretamente executando:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
