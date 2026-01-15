-- Adicionar nova coluna para member_invitations
ALTER TABLE email_verification_codes 
ADD COLUMN IF NOT EXISTS member_invitation_id UUID REFERENCES member_invitations(id) ON DELETE CASCADE;

-- Tornar invitation_id nullable (já que agora podemos ter member_invitation_id)
ALTER TABLE email_verification_codes 
ALTER COLUMN invitation_id DROP NOT NULL;