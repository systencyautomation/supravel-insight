-- Corrigir foreign key de sales.representative_id
-- Atualmente aponta para auth.users, mas deve apontar para representatives

-- 1. Remover a constraint existente (que aponta para auth.users)
ALTER TABLE sales 
DROP CONSTRAINT IF EXISTS sales_representative_id_fkey;

-- 2. Adicionar nova constraint apontando para representatives
ALTER TABLE sales
ADD CONSTRAINT sales_representative_id_fkey 
FOREIGN KEY (representative_id) 
REFERENCES representatives(id) 
ON DELETE SET NULL;