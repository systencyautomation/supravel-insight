-- Allow anonymous users to view organization details when there's a valid pending invitation
CREATE POLICY "Anyone can view org for pending invitations"
ON public.organizations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.member_invitations mi
    WHERE mi.organization_id = organizations.id
    AND mi.status = 'pendente'
    AND mi.expires_at > now()
  )
);