-- Adicionar política para permitir que admins deletem membros
CREATE POLICY "Admins can delete members from their org"
ON public.user_roles
FOR DELETE
USING (
  organization_id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
  AND role NOT IN ('admin', 'super_admin', 'saas_admin')
);