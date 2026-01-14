-- Tabela para armazenar códigos de verificação de email
CREATE TABLE public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX idx_verification_codes_lookup ON public.email_verification_codes(email, code, invitation_id) WHERE used = false;

-- Habilitar RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Política: Permitir inserção via service role (edge functions)
-- Política: Permitir leitura pública para verificação
CREATE POLICY "Allow public read for verification"
ON public.email_verification_codes
FOR SELECT
USING (true);

-- Política: Permitir update para marcar como usado
CREATE POLICY "Allow public update for marking used"
ON public.email_verification_codes
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Função para limpar códigos expirados (opcional, pode rodar via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verification_codes 
  WHERE expires_at < now() OR used = true;
END;
$$;