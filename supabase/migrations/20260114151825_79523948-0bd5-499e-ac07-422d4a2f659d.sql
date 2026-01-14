-- Create member_invitations table for inviting members to existing organizations
CREATE TABLE public.member_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  guest_name TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'seller',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pendente',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, organization_id, status)
);

-- Enable RLS
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations from their organization
CREATE POLICY "Users can view their org member invitations"
ON public.member_invitations
FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()));

-- Policy: Admins and managers can create invitations for their org
CREATE POLICY "Admins can create member invitations"
ON public.member_invitations
FOR INSERT
WITH CHECK (
  organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Policy: Admins can update invitations in their org
CREATE POLICY "Admins can update member invitations"
ON public.member_invitations
FOR UPDATE
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- Policy: Admins can delete invitations in their org
CREATE POLICY "Admins can delete member invitations"
ON public.member_invitations
FOR DELETE
USING (
  organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Policy: Anyone can view invitation by token (for join page)
CREATE POLICY "Anyone can view invitation by token"
ON public.member_invitations
FOR SELECT
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_member_invitations_token ON public.member_invitations(token);
CREATE INDEX idx_member_invitations_org ON public.member_invitations(organization_id);