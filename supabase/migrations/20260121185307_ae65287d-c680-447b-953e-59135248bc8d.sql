-- Criar função helper para verificar se pode ver todas as vendas
CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'manager', 'super_admin', 'saas_admin')
  )
$$;

-- Remover política antiga de sales
DROP POLICY IF EXISTS "Users can manage their org sales" ON public.sales;

-- Nova política: Super admins mantêm acesso total
-- (já existe, manter)

-- Nova política: Gerentes e Auxiliares veem todas as vendas da org
CREATE POLICY "Admins and managers see all org sales"
ON public.sales
FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid())
  AND can_view_all_sales(auth.uid())
);

-- Nova política: Vendedores veem apenas suas vendas
CREATE POLICY "Sellers see only their sales"
ON public.sales
FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'seller')
  AND internal_seller_id = auth.uid()
);

-- Nova política: Representantes veem apenas suas vendas
CREATE POLICY "Representatives see only their sales"
ON public.sales
FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'representative')
  AND representative_id = auth.uid()
);

-- Nova política: Admins e managers podem modificar vendas
CREATE POLICY "Admins and managers can modify sales"
ON public.sales
FOR ALL
USING (
  organization_id = get_user_org_id(auth.uid())
  AND can_view_all_sales(auth.uid())
);

-- Atualizar função de permissões padrão com novas permissões
CREATE OR REPLACE FUNCTION public.create_default_role_permissions(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin (Gerente): todas as permissões
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'admin', 'view_dashboard'),
    (p_org_id, 'admin', 'view_sales'),
    (p_org_id, 'admin', 'approve_sales'),
    (p_org_id, 'admin', 'manage_inventory'),
    (p_org_id, 'admin', 'view_commissions'),
    (p_org_id, 'admin', 'view_all_commissions'),
    (p_org_id, 'admin', 'manage_team'),
    (p_org_id, 'admin', 'remove_members'),
    (p_org_id, 'admin', 'manage_settings'),
    (p_org_id, 'admin', 'manage_integrations'),
    (p_org_id, 'admin', 'view_linked_representatives')
  ON CONFLICT DO NOTHING;

  -- Manager (Auxiliar): quase tudo, exceto remover e configurações
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'manager', 'view_dashboard'),
    (p_org_id, 'manager', 'view_sales'),
    (p_org_id, 'manager', 'approve_sales'),
    (p_org_id, 'manager', 'manage_inventory'),
    (p_org_id, 'manager', 'view_commissions'),
    (p_org_id, 'manager', 'view_all_commissions'),
    (p_org_id, 'manager', 'manage_team'),
    (p_org_id, 'manager', 'view_linked_representatives')
  ON CONFLICT DO NOTHING;

  -- Seller (Vendedor): visão própria + reps linkados
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'seller', 'view_dashboard'),
    (p_org_id, 'seller', 'view_sales'),
    (p_org_id, 'seller', 'view_commissions'),
    (p_org_id, 'seller', 'view_linked_representatives')
  ON CONFLICT DO NOTHING;

  -- Representative (Representante): apenas comissões próprias
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'representative', 'view_commissions')
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Popular permissões para organizações existentes
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM create_default_role_permissions(org_record.id);
  END LOOP;
END $$;