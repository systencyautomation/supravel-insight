-- Adicionar coluna de domínios permitidos na tabela organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS imap_allowed_domains TEXT[] DEFAULT '{}';

COMMENT ON COLUMN organizations.imap_allowed_domains IS 
'Lista de domínios de email permitidos para processamento de NF-e. Se vazio, aceita todos.';

-- Criar tabela de log de processamento de emails
CREATE TABLE email_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_uid TEXT NOT NULL,
  email_from TEXT,
  email_subject TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('processed', 'skipped', 'error')),
  reason TEXT,
  nfe_keys TEXT[] DEFAULT '{}',
  xmls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_email_log_org_id ON email_processing_log(organization_id);
CREATE INDEX idx_email_log_org_uid ON email_processing_log(organization_id, email_uid);
CREATE INDEX idx_email_log_processed_at ON email_processing_log(processed_at);
CREATE INDEX idx_email_log_status ON email_processing_log(status);

-- Habilitar RLS
ALTER TABLE email_processing_log ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their org email logs"
  ON email_processing_log FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all email logs"
  ON email_processing_log FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Adicionar tabela à lista de allowed tables do gateway
-- (isso é feito no código da edge function)