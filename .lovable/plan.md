
## Plano: Corrigir RLS para Permitir Super Admin Criar Convites

### Problema Identificado

A política RLS para INSERT na tabela `member_invitations` tem a seguinte condição:

```sql
organization_id = get_user_org_id(auth.uid()) 
AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
```

**Por que falha para o Master Admin:**
1. O `super_admin` não possui `organization_id` na tabela `user_roles` (é NULL)
2. A função `get_user_org_id(auth.uid())` retorna NULL para super_admin
3. A comparação `'5d03a0f7-...' = NULL` sempre resulta em FALSE
4. A política não inclui `super_admin` nas roles autorizadas

### Solução

Atualizar a política RLS para incluir `super_admin` e `saas_admin` com permissão total para criar convites em qualquer organização.

### Migração SQL

```sql
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can create member invitations" ON public.member_invitations;

-- Create new policy that includes super_admin
CREATE POLICY "Admins can create member invitations" ON public.member_invitations
FOR INSERT
WITH CHECK (
  -- Super admins and SaaS admins can create invitations for any org
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'saas_admin'::app_role)
  OR (
    -- Regular admins and managers can only invite for their own org
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  )
);
```

### Lógica da Nova Política

| Usuário | Pode criar convites? | Condição |
|---------|---------------------|----------|
| Super Admin | Sim, qualquer org | `has_role('super_admin')` |
| SaaS Admin | Sim, qualquer org | `has_role('saas_admin')` |
| Admin | Sim, própria org | `org_id = get_user_org_id()` |
| Manager | Sim, própria org | `org_id = get_user_org_id()` |
| Seller/Rep | Não | Nenhuma condição atendida |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Atualizar política RLS do INSERT |

### Observação

Esta é a mesma correção que já foi aplicada em outras tabelas (conforme memory `auth/team-visibility-rls-fix`). A política `SaaS admins can manage member invitations` já existe para ALL operations, mas como há uma política específica para INSERT que é mais restritiva, ela está causando o bloqueio.
