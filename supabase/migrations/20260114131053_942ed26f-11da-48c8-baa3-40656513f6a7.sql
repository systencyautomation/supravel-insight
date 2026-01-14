-- Add IMAP configuration columns to organizations table
ALTER TABLE organizations 
ADD COLUMN imap_host text DEFAULT 'imap.hostgator.com.br',
ADD COLUMN imap_port integer DEFAULT 993,
ADD COLUMN imap_user text,
ADD COLUMN imap_password text,
ADD COLUMN automation_active boolean DEFAULT false;