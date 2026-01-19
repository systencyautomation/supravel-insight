-- Adicionar colunas para dados extraídos do <infAdProd> do XML
ALTER TABLE sales ADD COLUMN IF NOT EXISTS produto_marca TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS produto_modelo TEXT; -- Este é o código FIPE!
ALTER TABLE sales ADD COLUMN IF NOT EXISTS produto_numero_serie TEXT;

-- Comentários para documentação
COMMENT ON COLUMN sales.produto_marca IS 'Marca do equipamento extraída do campo <infAdProd> do XML';
COMMENT ON COLUMN sales.produto_modelo IS 'Modelo/Código FIPE extraído do campo <infAdProd> do XML - usado para busca na tabela FIPE';
COMMENT ON COLUMN sales.produto_numero_serie IS 'Número de série extraído do campo <infAdProd> do XML';