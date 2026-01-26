-- Tabela para representantes externos (sem acesso ao sistema)
CREATE TABLE public.representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscas por organização
CREATE INDEX idx_representatives_org ON public.representatives(organization_id);

-- Habilitar RLS
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver representantes da sua organização
CREATE POLICY "Users can view representatives in their org"
ON public.representatives FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

-- Política: Admins e managers podem gerenciar representantes
CREATE POLICY "Admins can manage representatives"
ON public.representatives FOR ALL TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  organization_id = get_user_org_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Política: Super admins podem gerenciar todos
CREATE POLICY "Super admins can manage all representatives"
ON public.representatives FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));