-- Create role_permissions table for customizable permissions per organization
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  role app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org permissions"
ON public.role_permissions FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage their org permissions"
ON public.role_permissions FOR ALL
USING (
  organization_id = get_user_org_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "SaaS admins can manage all permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'saas_admin'::app_role));

CREATE POLICY "Super admins can manage all permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add UPDATE policy for user_roles so admins can change member roles
CREATE POLICY "Admins can update roles in their org"
ON public.user_roles FOR UPDATE
USING (
  organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  organization_id = get_user_org_id(auth.uid())
  AND role IN ('manager'::app_role, 'seller'::app_role, 'representative'::app_role)
);

-- Function to create default permissions for an organization
CREATE OR REPLACE FUNCTION public.create_default_role_permissions(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin: all permissions
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'admin', 'view_dashboard'),
    (p_org_id, 'admin', 'view_sales'),
    (p_org_id, 'admin', 'approve_sales'),
    (p_org_id, 'admin', 'manage_inventory'),
    (p_org_id, 'admin', 'view_commissions'),
    (p_org_id, 'admin', 'manage_team'),
    (p_org_id, 'admin', 'manage_settings'),
    (p_org_id, 'admin', 'manage_integrations')
  ON CONFLICT DO NOTHING;

  -- Manager: most permissions except settings
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'manager', 'view_dashboard'),
    (p_org_id, 'manager', 'view_sales'),
    (p_org_id, 'manager', 'approve_sales'),
    (p_org_id, 'manager', 'manage_inventory'),
    (p_org_id, 'manager', 'view_commissions'),
    (p_org_id, 'manager', 'manage_team')
  ON CONFLICT DO NOTHING;

  -- Seller: basic view permissions
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'seller', 'view_dashboard'),
    (p_org_id, 'seller', 'view_sales'),
    (p_org_id, 'seller', 'view_commissions')
  ON CONFLICT DO NOTHING;

  -- Representative: only commissions
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'representative', 'view_commissions')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.role = rp.role AND ur.organization_id = rp.organization_id
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  )
$$;