-- Add last_sent_at column to track when invitations were last sent
ALTER TABLE public.invitations 
ADD COLUMN last_sent_at timestamp with time zone DEFAULT now();