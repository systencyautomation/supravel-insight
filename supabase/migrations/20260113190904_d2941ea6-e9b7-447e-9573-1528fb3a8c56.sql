-- Criar tabela de convites para onboarding
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_name text,
  token uuid DEFAULT gen_random_uuid() UNIQUE,
  status text DEFAULT 'pendente',
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar todos os convites
CREATE POLICY "Super admins can manage all invitations"
  ON public.invitations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Qualquer pessoa pode verificar convite pelo token (para aceitar)
CREATE POLICY "Anyone can verify invitation by token"
  ON public.invitations FOR SELECT
  USING (true);