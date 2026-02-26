-- ============================================
-- 02_functions.sql
-- Funções e triggers do banco
-- Requer: 01_tables.sql executado antes
-- ============================================

-- 1. handle_new_user (trigger on auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- Trigger (só funciona se você tiver acesso ao schema auth)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'saas_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_permissions 
      WHERE user_id = _user_id AND permission = _permission
    )
$$;

-- 4. can_view_all_sales
CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'manager', 'super_admin', 'saas_admin')
  )
$$;

-- 5. get_user_org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 6. create_organization_for_user
CREATE OR REPLACE FUNCTION public.create_organization_for_user(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND organization_id IS NOT NULL) THEN
    SELECT organization_id INTO v_org_id FROM user_roles WHERE user_id = v_user_id LIMIT 1;
    RETURN v_org_id;
  END IF;
  
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_org_id;
  
  INSERT INTO user_roles (user_id, role, organization_id)
  VALUES (v_user_id, 'admin', v_org_id);
  
  RETURN v_org_id;
END;
$$;

-- 7. create_default_role_permissions
CREATE OR REPLACE FUNCTION public.create_default_role_permissions(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO role_permissions (organization_id, role, permission)
  VALUES 
    (p_org_id, 'admin', 'view_dashboard'),
    (p_org_id, 'admin', 'view_sales'),
    (p_org_id, 'admin', 'approve_sales'),
    (p_org_id, 'admin', 'manage_inventory'),
    (p_org_id, 'admin', 'view_commissions'),
    (p_org_id, 'admin', 'view_all_commissions'),
    (p_org_id, 'admin', 'manage_team'),
    (p_org_id, 'admin', 'remove_members'),
    (p_org_id, 'admin', 'manage_settings'),
    (p_org_id, 'admin', 'manage_integrations'),
    (p_org_id, 'admin', 'view_linked_representatives'),
    (p_org_id, 'manager', 'view_dashboard'),
    (p_org_id, 'manager', 'view_sales'),
    (p_org_id, 'manager', 'approve_sales'),
    (p_org_id, 'manager', 'manage_inventory'),
    (p_org_id, 'manager', 'view_commissions'),
    (p_org_id, 'manager', 'view_all_commissions'),
    (p_org_id, 'manager', 'manage_team'),
    (p_org_id, 'manager', 'view_linked_representatives'),
    (p_org_id, 'seller', 'view_dashboard'),
    (p_org_id, 'seller', 'view_sales'),
    (p_org_id, 'seller', 'view_commissions'),
    (p_org_id, 'seller', 'view_linked_representatives'),
    (p_org_id, 'representative', 'view_commissions')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 8. accept_invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_invitation_email text;
BEGIN
  SELECT email INTO v_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  SELECT email INTO v_invitation_email 
  FROM public.invitations 
  WHERE id = p_invitation_id;
  
  IF v_email IS NULL OR v_invitation_email IS NULL OR v_email != v_invitation_email THEN
    RAISE EXCEPTION 'Email do convite não corresponde ao usuário autenticado';
  END IF;
  
  UPDATE public.invitations 
  SET status = 'aceito' 
  WHERE id = p_invitation_id;
END;
$$;

-- 9. cleanup_expired_verification_codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM email_verification_codes 
  WHERE expires_at < now() OR used = true;
END;
$$;
