
# Plano: Correção do Erro ao Salvar Representante

## Problema Identificado

O erro **"violates foreign key constraint 'sales_representative_id_fkey'"** ocorre porque:

1. A coluna `sales.representative_id` tem uma **foreign key apontando para `auth.users.id`**
2. Porém, o código está tentando salvar o **ID da tabela `representatives`** (que é diferente)
3. Como o UUID do representante não existe na tabela `auth.users`, a constraint falha

### Situação Atual do Banco

| Coluna | Foreign Key Atual | Problema |
|--------|-------------------|----------|
| `internal_seller_id` | `auth.users.id` | ✅ Correto (vendedores são usuários) |
| `representative_id` | `auth.users.id` | ❌ **Incorreto** (representantes são empresas externas) |

---

## Solução Proposta

### Alterar a Foreign Key no Banco de Dados

A FK `sales_representative_id_fkey` precisa ser alterada para referenciar a tabela `representatives`:

```sql
-- 1. Remover a constraint existente (que aponta para auth.users)
ALTER TABLE sales 
DROP CONSTRAINT IF EXISTS sales_representative_id_fkey;

-- 2. Adicionar nova constraint apontando para representatives
ALTER TABLE sales
ADD CONSTRAINT sales_representative_id_fkey 
FOREIGN KEY (representative_id) 
REFERENCES representatives(id) 
ON DELETE SET NULL;
```

---

## Comportamento Esperado Após Correção

| Ação | Antes | Depois |
|------|-------|--------|
| Selecionar representante e salvar | ❌ Erro FK | ✅ Salva normalmente |
| ID armazenado | - | UUID da tabela `representatives` |

---

## Impacto

- **Sem impacto no código React** - o código já está correto
- **Apenas mudança no schema do banco de dados**
- Dados existentes não serão afetados (nenhum valor válido em `representative_id` atualmente)

---

## Resumo Técnico

| Item | Ação |
|------|------|
| Migração SQL | Dropar FK antiga, criar FK nova para `representatives.id` |
| Código React | Nenhuma alteração necessária |
| RLS | Nenhuma alteração necessária |
