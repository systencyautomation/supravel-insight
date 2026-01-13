-- Enum para roles do sistema
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'seller', 'representative');

-- Tabela de Organizações (Tenants)
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Perfis de Usuário
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Roles (separada para segurança)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, organization_id, role)
);

-- Tabela de Estoque por Organização
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  model_name text NOT NULL,
  internal_code text,
  base_price numeric(12,2),
  base_commission_pct numeric(5,2),
  quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Vendas
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  client_name text,
  client_cnpj text,
  nfe_number text,
  total_value numeric(12,2),
  table_value numeric(12,2),
  uf_destiny text,
  payment_method text,
  status text DEFAULT 'pendente',
  over_price numeric(12,2),
  pis_cofins numeric(12,2),
  ir_csll numeric(12,2),
  icms numeric(12,2),
  commission_calculated numeric(12,2),
  internal_seller_id uuid REFERENCES auth.users(id),
  representative_id uuid REFERENCES auth.users(id),
  emission_date date,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Parcelas/Duplicatas
CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL,
  value numeric(12,2) NOT NULL,
  due_date date,
  status text DEFAULT 'pendente',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Função Security Definer para obter org_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Função Security Definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policies para user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Policies para organizations
CREATE POLICY "Super admins can manage all orgs"
  ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id(auth.uid()));

-- Policies para inventory (isolamento por tenant)
CREATE POLICY "Users can manage their org inventory"
  ON public.inventory FOR ALL
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all inventory"
  ON public.inventory FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Policies para sales (isolamento por tenant)
CREATE POLICY "Users can manage their org sales"
  ON public.sales FOR ALL
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all sales"
  ON public.sales FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Policies para installments (isolamento por tenant)
CREATE POLICY "Users can manage their org installments"
  ON public.installments FOR ALL
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all installments"
  ON public.installments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();