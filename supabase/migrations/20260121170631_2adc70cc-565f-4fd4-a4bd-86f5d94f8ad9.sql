-- SaaS admins podem ver todas as organizações
CREATE POLICY "SaaS admins can view all orgs"
ON public.organizations FOR SELECT
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem atualizar organizações (toggle active)
CREATE POLICY "SaaS admins can update orgs"
ON public.organizations FOR UPDATE
USING (has_role(auth.uid(), 'saas_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem criar organizações
CREATE POLICY "SaaS admins can insert orgs"
ON public.organizations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem gerenciar convites
CREATE POLICY "SaaS admins can manage invitations"
ON public.invitations FOR ALL
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem ver todos os roles
CREATE POLICY "SaaS admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem inserir roles (para novos usuários de orgs)
CREATE POLICY "SaaS admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem ver profiles para gestão
CREATE POLICY "SaaS admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- SaaS admins podem gerenciar member_invitations
CREATE POLICY "SaaS admins can manage member invitations"
ON public.member_invitations FOR ALL
USING (has_role(auth.uid(), 'saas_admin'::app_role));