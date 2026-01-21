-- 1. Create user_permissions table for individual user permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id, permission)
);

-- 2. Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for user_permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view org permissions"
ON public.user_permissions
FOR SELECT
USING (
  organization_id = get_user_org_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can manage org permissions"
ON public.user_permissions
FOR ALL
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'saas_admin'));

-- 4. Add permissions column to member_invitations
ALTER TABLE public.member_invitations
ADD COLUMN permissions text[] DEFAULT '{}';

-- 5. Update has_permission function to check user_permissions first, then fallback
-- Admin role always has all permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Admins (Gerente) always have all permissions
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'admin'
    )
    OR
    -- Super admins always have all permissions
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    -- SaaS admins always have all permissions
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'saas_admin'
    )
    OR
    -- Check individual user permissions
    EXISTS (
      SELECT 1 FROM public.user_permissions 
      WHERE user_id = _user_id AND permission = _permission
    )
$$;