-- ============================================
-- 03_rls_policies.sql
-- Habilitação de RLS + todas as políticas
-- Requer: 01_tables.sql e 02_functions.sql
-- ============================================

-- ==========================================
-- ORGANIZATIONS
-- ==========================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org" ON public.organizations
  FOR SELECT USING (id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can update their own org" ON public.organizations
  FOR UPDATE USING (
    id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  ) WITH CHECK (
    id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admins can manage all orgs" ON public.organizations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can view all orgs" ON public.organizations
  FOR SELECT USING (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admins can insert orgs" ON public.organizations
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admins can update orgs" ON public.organizations
  FOR UPDATE USING (has_role(auth.uid(), 'saas_admin'))
  WITH CHECK (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "Anyone can view org for pending invitations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM member_invitations mi
      WHERE mi.organization_id = organizations.id 
        AND mi.status = 'pendente' 
        AND mi.expires_at > now()
    )
  );

-- ==========================================
-- PROFILES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view org member profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = profiles.id AND ur.organization_id = get_user_org_id(auth.uid())
    ) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- USER_ROLES
-- ==========================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view org roles" ON public.user_roles
  FOR SELECT USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can update roles in their org" ON public.user_roles
  FOR UPDATE USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  ) WITH CHECK (
    organization_id = get_user_org_id(auth.uid()) AND (
      (has_role(auth.uid(), 'manager') AND role IN ('seller', 'representative')) OR
      (has_role(auth.uid(), 'admin') AND role IN ('admin', 'manager', 'seller', 'representative'))
    )
  );

CREATE POLICY "Admins can delete members from their org" ON public.user_roles
  FOR DELETE USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    has_role(auth.uid(), 'admin') AND 
    role NOT IN ('admin', 'super_admin', 'saas_admin')
  );

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- USER_PERMISSIONS
-- ==========================================
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view org permissions" ON public.user_permissions
  FOR SELECT USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can manage org permissions" ON public.user_permissions
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Super admins can manage all user permissions" ON public.user_permissions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can manage all user permissions" ON public.user_permissions
  FOR ALL USING (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- ROLE_PERMISSIONS
-- ==========================================
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org permissions" ON public.role_permissions
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage their org permissions" ON public.role_permissions
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Super admins can manage all permissions" ON public.role_permissions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can manage all permissions" ON public.role_permissions
  FOR ALL USING (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- INVITATIONS
-- ==========================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can verify invitation by token" ON public.invitations
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage all invitations" ON public.invitations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SaaS admins can manage invitations" ON public.invitations
  FOR ALL USING (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- MEMBER_INVITATIONS
-- ==========================================
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invitation by token" ON public.member_invitations
  FOR SELECT USING (true);

CREATE POLICY "Users can view their org member invitations" ON public.member_invitations
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can create member invitations" ON public.member_invitations
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'saas_admin') OR (
      organization_id = get_user_org_id(auth.uid()) AND 
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    )
  );

CREATE POLICY "Admins can update member invitations" ON public.member_invitations
  FOR UPDATE USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can delete member invitations" ON public.member_invitations
  FOR DELETE USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "SaaS admins can manage member invitations" ON public.member_invitations
  FOR ALL USING (has_role(auth.uid(), 'saas_admin'));

-- ==========================================
-- EMAIL_VERIFICATION_CODES
-- ==========================================
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for verification" ON public.email_verification_codes
  FOR SELECT USING (true);

CREATE POLICY "Allow public update for marking used" ON public.email_verification_codes
  FOR UPDATE USING (true) WITH CHECK (true);

-- ==========================================
-- SALES
-- ==========================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers see all org sales" ON public.sales
  FOR SELECT USING (
    organization_id = get_user_org_id(auth.uid()) AND can_view_all_sales(auth.uid())
  );

CREATE POLICY "Admins and managers can modify sales" ON public.sales
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND can_view_all_sales(auth.uid())
  );

CREATE POLICY "Sellers see only their sales" ON public.sales
  FOR SELECT USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    has_role(auth.uid(), 'seller') AND 
    internal_seller_id = auth.uid()
  );

CREATE POLICY "Representatives see only their sales" ON public.sales
  FOR SELECT USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    has_role(auth.uid(), 'representative') AND 
    representative_id = auth.uid()
  );

CREATE POLICY "Super admins can manage all sales" ON public.sales
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- INSTALLMENTS
-- ==========================================
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org installments" ON public.installments
  FOR ALL USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all installments" ON public.installments
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- SALE_DOCUMENTS
-- ==========================================
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org documents" ON public.sale_documents
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage their org documents" ON public.sale_documents
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND can_view_all_sales(auth.uid())
  );

CREATE POLICY "Super admins can manage all documents" ON public.sale_documents
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- INVENTORY
-- ==========================================
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org inventory" ON public.inventory
  FOR ALL USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all inventory" ON public.inventory
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- FIPE_DOCUMENTS
-- ==========================================
ALTER TABLE public.fipe_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org fipe documents" ON public.fipe_documents
  FOR ALL USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all fipe documents" ON public.fipe_documents
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- REPRESENTATIVE_COMPANIES
-- ==========================================
ALTER TABLE public.representative_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies in their org" ON public.representative_companies
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage companies" ON public.representative_companies
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  ) WITH CHECK (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all companies" ON public.representative_companies
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- COMPANY_MEMBERS
-- ==========================================
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of companies in their org" ON public.company_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM representative_companies rc
      WHERE rc.id = company_members.company_id 
        AND rc.organization_id = get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage company members" ON public.company_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM representative_companies rc
      WHERE rc.id = company_members.company_id 
        AND rc.organization_id = get_user_org_id(auth.uid())
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM representative_companies rc
      WHERE rc.id = company_members.company_id 
        AND rc.organization_id = get_user_org_id(auth.uid())
        AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
    )
  );

CREATE POLICY "Super admins can manage all company members" ON public.company_members
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- REPRESENTATIVES
-- ==========================================
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view representatives in their org" ON public.representatives
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage representatives" ON public.representatives
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  ) WITH CHECK (
    organization_id = get_user_org_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Super admins can manage all representatives" ON public.representatives
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ==========================================
-- EMAIL_PROCESSING_LOG
-- ==========================================
ALTER TABLE public.email_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org email logs" ON public.email_processing_log
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can manage all email logs" ON public.email_processing_log
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));
