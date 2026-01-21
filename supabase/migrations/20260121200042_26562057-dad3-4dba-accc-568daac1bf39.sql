-- Add missing RLS policies for user_roles table

-- Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins and managers can view roles in their organization
CREATE POLICY "Admins can view org roles"
  ON public.user_roles FOR SELECT
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Add missing RLS policies for profiles table

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins and managers can view profiles of members in their organization
CREATE POLICY "Admins can view org member profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.id
      AND ur.organization_id = get_user_org_id(auth.uid())
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );