-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can create member invitations" ON public.member_invitations;

-- Create new policy that includes super_admin and saas_admin
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