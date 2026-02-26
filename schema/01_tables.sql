-- ============================================
-- 01_tables.sql
-- CREATE TABLE para todas as 17 tabelas
-- Ordem respeita dependências (FKs)
-- Requer: 04_enums.sql executado antes
-- ============================================

-- 1. organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  cnpj text,
  razao_social text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email_contato text,
  comissao_base text DEFAULT 'valor_tabela'::text,
  comissao_over_percent numeric DEFAULT 10,
  ai_api_key text,
  automation_active boolean DEFAULT false,
  imap_host text DEFAULT 'imap.hostgator.com.br'::text,
  imap_port integer DEFAULT 993,
  imap_user text,
  imap_password text,
  imap_allowed_domains text[] DEFAULT '{}'::text[],
  imap_allowed_emails text[] DEFAULT '{}'::text[]
);

-- 2. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- 3. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  organization_id uuid REFERENCES public.organizations(id)
);

-- 4. user_permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  permission text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_name text,
  status text DEFAULT 'pendente'::text,
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  last_sent_at timestamptz DEFAULT now()
);

-- 7. member_invitations
CREATE TABLE IF NOT EXISTS public.member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  invited_by uuid NOT NULL,
  email text NOT NULL,
  guest_name text,
  role public.app_role NOT NULL DEFAULT 'seller'::app_role,
  permissions text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pendente'::text,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_sent_at timestamptz DEFAULT now()
);

-- 8. email_verification_codes
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  invitation_id uuid REFERENCES public.invitations(id),
  member_invitation_id uuid REFERENCES public.member_invitations(id),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- 9. sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_name text,
  client_cnpj text,
  nfe_number text,
  nfe_key text,
  nfe_model text,
  nfe_series text,
  nfe_email_from text,
  nfe_filename text,
  nfe_processed_at timestamptz DEFAULT now(),
  emitente_cnpj text,
  emitente_nome text,
  emitente_uf text,
  uf_destiny text,
  emission_date date,
  total_value numeric,
  total_produtos numeric,
  total_ipi numeric,
  table_value numeric,
  over_price numeric,
  over_price_liquido numeric,
  pis_cofins numeric,
  ir_csll numeric,
  icms numeric,
  icms_tabela numeric,
  percentual_icms numeric,
  percentual_comissao numeric,
  commission_calculated numeric,
  valor_entrada numeric,
  entrada_calculada numeric,
  valor_presente numeric,
  payment_method text,
  status text DEFAULT 'pendente'::text,
  analise_ia_status text DEFAULT 'pendente'::text,
  ia_commentary text,
  ai_pre_calculated boolean NOT NULL DEFAULT false,
  internal_seller_id uuid,
  internal_seller_percent numeric,
  representative_id uuid,
  representative_percent numeric,
  aprovado_por uuid REFERENCES public.profiles(id),
  aprovado_em timestamptz,
  produto_codigo text,
  produto_descricao text,
  produto_marca text,
  produto_modelo text,
  produto_numero_serie text,
  observacoes text,
  motivo_rejeicao text,
  created_at timestamptz DEFAULT now()
);

-- 10. installments
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  installment_number integer NOT NULL,
  value numeric NOT NULL,
  due_date date,
  status text DEFAULT 'pendente'::text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 11. sale_documents
CREATE TABLE IF NOT EXISTS public.sale_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  document_type text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  model_name text NOT NULL,
  internal_code text,
  classe_tipo text,
  marca text,
  capacidade text,
  mastro text,
  bateria text,
  carregador text,
  acessorios text,
  pneus text,
  garfos text,
  cor text,
  moeda varchar DEFAULT 'BRL'::varchar,
  base_price numeric,
  base_commission_pct numeric,
  valor_icms_12 numeric,
  valor_icms_7 numeric,
  valor_icms_4 numeric,
  quantity integer DEFAULT 0,
  qtd_reservado integer DEFAULT 0,
  qtd_dealer integer DEFAULT 0,
  qtd_demo integer DEFAULT 0,
  qtd_patio integer DEFAULT 0,
  disponibilidade_data date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 13. fipe_documents
CREATE TABLE IF NOT EXISTS public.fipe_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  headers text[] NOT NULL,
  rows jsonb NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- 14. representative_companies
CREATE TABLE IF NOT EXISTS public.representative_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  cnpj text,
  company_type public.company_type NOT NULL DEFAULT 'mei'::company_type,
  sede text,
  position public.representative_position NOT NULL DEFAULT 'representante'::representative_position,
  is_technical boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. company_members
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.representative_companies(id),
  name text NOT NULL,
  phone text,
  email text,
  role public.member_role NOT NULL DEFAULT 'funcionario'::member_role,
  is_technical boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. representatives
CREATE TABLE IF NOT EXISTS public.representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  email text,
  phone text,
  document text,
  company text,
  sede text,
  position public.representative_position DEFAULT 'representante'::representative_position,
  active boolean DEFAULT true,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 17. email_processing_log
CREATE TABLE IF NOT EXISTS public.email_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  email_uid text NOT NULL,
  email_from text,
  email_subject text,
  status text NOT NULL,
  reason text,
  nfe_keys text[] DEFAULT '{}'::text[],
  xmls_count integer DEFAULT 0,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- FK de sales -> representative_companies (criada após ambas existirem)
ALTER TABLE public.sales
  ADD CONSTRAINT sales_representative_id_fkey
  FOREIGN KEY (representative_id) REFERENCES public.representative_companies(id);
