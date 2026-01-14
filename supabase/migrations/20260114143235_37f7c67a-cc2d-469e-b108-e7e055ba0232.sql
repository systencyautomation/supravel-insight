-- Função Security Definer para criar organização e atribuir role
-- Isso contorna a race condition do RLS no cliente

CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  p_name TEXT,
  p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Verificar se o usuário está autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário já tem uma organização
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND organization_id IS NOT NULL) THEN
    SELECT organization_id INTO v_org_id FROM user_roles WHERE user_id = v_user_id LIMIT 1;
    RETURN v_org_id;
  END IF;
  
  -- Criar a organização
  INSERT INTO organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_org_id;
  
  -- Atribuir role de admin ao usuário
  INSERT INTO user_roles (user_id, role, organization_id)
  VALUES (v_user_id, 'admin', v_org_id);
  
  RETURN v_org_id;
END;
$$;