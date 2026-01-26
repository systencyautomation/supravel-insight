-- Create new enums for company type and member role
CREATE TYPE company_type AS ENUM ('mei', 'empresa');
CREATE TYPE member_role AS ENUM ('responsavel', 'funcionario');

-- Create representative_companies table
CREATE TABLE public.representative_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  company_type company_type NOT NULL DEFAULT 'mei',
  sede TEXT,
  position representative_position NOT NULL DEFAULT 'representante',
  is_technical BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_members table
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.representative_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role member_role NOT NULL DEFAULT 'funcionario',
  is_technical BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_representative_companies_org ON public.representative_companies(organization_id);
CREATE INDEX idx_representative_companies_active ON public.representative_companies(organization_id, active);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE INDEX idx_company_members_role ON public.company_members(company_id, role);

-- Enable RLS on both tables
ALTER TABLE public.representative_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for representative_companies
CREATE POLICY "Users can view companies in their org"
ON public.representative_companies
FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage companies"
ON public.representative_companies
FOR ALL
USING (
  (organization_id = get_user_org_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  (organization_id = get_user_org_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Super admins can manage all companies"
ON public.representative_companies
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for company_members
CREATE POLICY "Users can view members of companies in their org"
ON public.company_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.representative_companies rc
    WHERE rc.id = company_members.company_id
    AND rc.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage company members"
ON public.company_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.representative_companies rc
    WHERE rc.id = company_members.company_id
    AND rc.organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.representative_companies rc
    WHERE rc.id = company_members.company_id
    AND rc.organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

CREATE POLICY "Super admins can manage all company members"
ON public.company_members
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Migrate existing data from representatives table
-- Each representative becomes a MEI company with the person as responsavel
INSERT INTO public.representative_companies (organization_id, name, company_type, sede, position, active, created_at)
SELECT 
  organization_id,
  COALESCE(company, name) as name,
  'mei'::company_type,
  sede,
  COALESCE(position, 'representante'::representative_position),
  COALESCE(active, true),
  created_at
FROM public.representatives;

-- Create the responsavel for each migrated company
INSERT INTO public.company_members (company_id, name, phone, email, role, user_id, created_at)
SELECT 
  rc.id,
  r.name,
  r.phone,
  r.email,
  'responsavel'::member_role,
  r.user_id,
  r.created_at
FROM public.representatives r
JOIN public.representative_companies rc ON 
  rc.organization_id = r.organization_id 
  AND COALESCE(rc.name, '') = COALESCE(r.company, r.name, '')
  AND rc.created_at = r.created_at;