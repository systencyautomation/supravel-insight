-- Adicionar coluna para lista de emails permitidos
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS imap_allowed_emails TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.organizations.imap_allowed_emails IS 
'Lista de emails de remetentes permitidos. Se vazio, aceita todos (respeitando filtro de domínios).';