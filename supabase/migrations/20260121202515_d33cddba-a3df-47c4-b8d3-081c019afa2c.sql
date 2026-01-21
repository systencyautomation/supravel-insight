-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can update roles in their org" ON public.user_roles;

-- Create updated policy that allows admins to promote to admin
CREATE POLICY "Admins can update roles in their org"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  (organization_id = get_user_org_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  (organization_id = get_user_org_id(auth.uid())) 
  AND (
    -- Managers can only assign: seller, representative
    (has_role(auth.uid(), 'manager'::app_role) AND role = ANY (ARRAY['seller'::app_role, 'representative'::app_role]))
    OR
    -- Admins can assign any role including admin (but not super_admin or saas_admin)
    (has_role(auth.uid(), 'admin'::app_role) AND role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'seller'::app_role, 'representative'::app_role]))
  )
);