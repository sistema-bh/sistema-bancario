-- Tabela para armazenar todos os nomes de PIX recebidos
CREATE TABLE IF NOT EXISTS Nomes_PIX (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_pix TEXT NOT NULL,
    nome_normalizado TEXT NOT NULL, -- Nome sem acentos e em minúsculas para comparação
    devedor_id UUID REFERENCES Devedores(id) ON DELETE SET NULL, -- Vínculo com cliente cadastrado
    primeira_ocorrencia TIMESTAMP DEFAULT NOW(),
    ultima_ocorrencia TIMESTAMP DEFAULT NOW(),
    total_ocorrencias INTEGER DEFAULT 1,
    vinculo_manual BOOLEAN DEFAULT FALSE, -- Se foi vinculado manualmente pelo operador
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_nomes_pix_normalizado ON Nomes_PIX(nome_normalizado);
CREATE INDEX IF NOT EXISTS idx_nomes_pix_devedor ON Nomes_PIX(devedor_id);

-- Tabela para registrar histórico de PIX recebidos
CREATE TABLE IF NOT EXISTS Historico_PIX (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_pix_id UUID REFERENCES Nomes_PIX(id) ON DELETE CASCADE,
    devedor_id UUID REFERENCES Devedores(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_recebimento TIMESTAMP DEFAULT NOW(),
    identificado_automaticamente BOOLEAN DEFAULT FALSE,
    movimentacao_id UUID REFERENCES Movimentacoes_Dia(id) ON DELETE SET NULL, -- Vínculo com a movimentação que foi baixada
    email_id TEXT, -- ID do e-mail original
    corpo_email TEXT, -- Corpo do e-mail para referência
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_historico_pix_data ON Historico_PIX(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_historico_pix_devedor ON Historico_PIX(devedor_id);
CREATE INDEX IF NOT EXISTS idx_historico_pix_movimentacao ON Historico_PIX(movimentacao_id);

-- Função para normalizar nomes (remover acentos e converter para minúsculas)
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

COMMENT ON TABLE Nomes_PIX IS 'Armazena todos os nomes únicos de pagadores de PIX recebidos e seus vínculos com clientes cadastrados';
COMMENT ON TABLE Historico_PIX IS 'Registra cada PIX recebido para auditoria e análise';
COMMENT ON FUNCTION normalizar_nome IS 'Remove acentos e converte para minúsculas para facilitar comparação de nomes';
