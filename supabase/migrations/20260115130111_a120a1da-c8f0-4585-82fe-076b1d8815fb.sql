-- Adicionar campos na tabela sales para aprovação
ALTER TABLE sales ADD COLUMN IF NOT EXISTS produto_codigo TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS produto_descricao TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS percentual_icms DECIMAL(5,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS percentual_comissao DECIMAL(5,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS over_price_liquido DECIMAL(15,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS valor_entrada DECIMAL(15,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES profiles(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

-- Expandir tabela inventory (Tabela FIPE)
-- Informações do produto
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS classe_tipo TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS capacidade TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS mastro TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS bateria TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS carregador TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS acessorios TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS pneus TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS garfos TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cor TEXT;

-- Preços por região ICMS
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS moeda VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS valor_icms_12 DECIMAL(15,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS valor_icms_7 DECIMAL(15,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS valor_icms_4 DECIMAL(15,2);

-- Estoque detalhado
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS qtd_reservado INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS qtd_dealer INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS qtd_demo INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS qtd_patio INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS disponibilidade_data DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índice para busca por código interno
CREATE INDEX IF NOT EXISTS idx_inventory_internal_code ON inventory(internal_code);