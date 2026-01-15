-- Add last_sent_at column to member_invitations table
ALTER TABLE member_invitations 
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ DEFAULT NOW();