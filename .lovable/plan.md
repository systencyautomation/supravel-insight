

# Criar Pasta de Schema para Migração

## Objetivo
Criar uma pasta `schema/` no repositório contendo arquivos SQL organizados com todas as definições de tabelas, funções, triggers e políticas RLS do projeto, prontos para download e uso em migração.

## Estrutura de Arquivos

```text
schema/
  01_tables.sql          -- CREATE TABLE para todas as 17 tabelas
  02_functions.sql       -- Todas as funções do banco (handle_new_user, has_role, etc.)
  03_rls_policies.sql    -- Todas as políticas RLS por tabela
  04_enums.sql           -- Tipos ENUM (app_role, company_type, member_role, representative_position)
  05_storage.sql         -- Buckets de storage (sale-documents)
  README.md              -- Instruções de uso para migração
```

## Conteúdo dos Arquivos

### 01_tables.sql
Conterá CREATE TABLE IF NOT EXISTS para as 17 tabelas na ordem correta de dependências:
1. `organizations`
2. `profiles`
3. `user_roles`
4. `user_permissions`
5. `role_permissions`
6. `invitations`
7. `member_invitations`
8. `email_verification_codes`
9. `sales`
10. `installments`
11. `sale_documents`
12. `inventory`
13. `fipe_documents`
14. `representative_companies`
15. `company_members`
16. `representatives`
17. `email_processing_log`

Cada tabela incluirá todas as colunas com tipos, defaults e constraints conforme o schema atual.

### 02_functions.sql
Conterá todas as 8 funções do banco:
- `handle_new_user()` + trigger
- `has_role()`, `has_permission()`
- `can_view_all_sales()`, `get_user_org_id()`
- `create_organization_for_user()`
- `create_default_role_permissions()`
- `accept_invitation()`
- `cleanup_expired_verification_codes()`

### 03_rls_policies.sql
Habilitação de RLS e todas as políticas por tabela, usando `CREATE POLICY IF NOT EXISTS`.

### 04_enums.sql
Criação dos tipos ENUM:
- `app_role` (admin, manager, seller, representative, super_admin, saas_admin)
- `company_type` (mei, empresa)
- `member_role` (responsavel, funcionario)
- `representative_position` (indicador, representante)

### 05_storage.sql
Criação do bucket `sale-documents` (privado).

### README.md
Instruções de execução na ordem correta: enums -> tables -> functions -> rls -> storage.

## Detalhes Técnicos
- Os arquivos serão gerados com base no schema completo fornecido no contexto do projeto
- A ordem de criação respeita dependências entre tabelas (ex: `installments` depende de `sales`)
- Todos os defaults e tipos nullable serão preservados fielmente
- Os arquivos ficam versionados no repositório e podem ser baixados diretamente pelo Lovable

