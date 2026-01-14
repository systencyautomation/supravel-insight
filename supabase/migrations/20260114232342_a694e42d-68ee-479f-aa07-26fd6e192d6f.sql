-- Adicionar novas colunas para dados de NFe na tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_key TEXT UNIQUE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_model TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_series TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS emitente_cnpj TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS emitente_nome TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS emitente_uf TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_produtos DECIMAL(15,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_ipi DECIMAL(15,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_email_from TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_filename TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS nfe_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índice para busca por chave NFe
CREATE INDEX IF NOT EXISTS idx_sales_nfe_key ON sales(nfe_key);

-- Criar índice para busca por emitente
CREATE INDEX IF NOT EXISTS idx_sales_emitente_cnpj ON sales(emitente_cnpj);