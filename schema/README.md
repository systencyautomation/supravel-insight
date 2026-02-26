# Schema de Migração

Arquivos SQL organizados para recriar o banco de dados completo do projeto.

## Ordem de Execução

Execute os arquivos **nesta ordem exata** no SQL Editor do Supabase:

```
1. 04_enums.sql           -- Tipos ENUM (dependência de todas as tabelas)
2. 01_tables.sql           -- Criação das 17 tabelas
3. 02_functions.sql        -- Funções + trigger handle_new_user
4. 03_rls_policies.sql     -- Habilitação de RLS + políticas
5. 05_storage.sql          -- Bucket de storage
```

## Notas

- O trigger `on_auth_user_created` em `02_functions.sql` requer acesso ao schema `auth`. Em projetos Supabase isso funciona automaticamente.
- Todas as políticas usam `SECURITY DEFINER` para evitar recursão de RLS.
- As FKs de `sales.representative_id → representative_companies.id` são adicionadas via `ALTER TABLE` no final de `01_tables.sql`.
- Os arquivos usam `CREATE TABLE IF NOT EXISTS` e `ON CONFLICT DO NOTHING` para serem idempotentes quando possível.

## Tabelas (17)

| # | Tabela | Descrição |
|---|--------|-----------|
| 1 | organizations | Organizações/empresas |
| 2 | profiles | Perfis de usuário |
| 3 | user_roles | Roles dos usuários |
| 4 | user_permissions | Permissões individuais |
| 5 | role_permissions | Permissões por role |
| 6 | invitations | Convites de organização |
| 7 | member_invitations | Convites de membros |
| 8 | email_verification_codes | Códigos de verificação |
| 9 | sales | Vendas/NF-e |
| 10 | installments | Parcelas |
| 11 | sale_documents | Documentos de venda |
| 12 | inventory | Estoque |
| 13 | fipe_documents | Tabelas FIPE |
| 14 | representative_companies | Empresas representantes |
| 15 | company_members | Membros das empresas |
| 16 | representatives | Representantes (legado) |
| 17 | email_processing_log | Log de processamento de e-mail |

## Funções (9)

- `handle_new_user()` + trigger
- `has_role()`, `has_permission()`
- `can_view_all_sales()`, `get_user_org_id()`
- `create_organization_for_user()`
- `create_default_role_permissions()`
- `accept_invitation()`
- `cleanup_expired_verification_codes()`
