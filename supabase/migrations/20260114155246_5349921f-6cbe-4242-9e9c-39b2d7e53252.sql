-- Função para atualizar status do convite após onboarding
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_invitation_email text;
BEGIN
  -- Obter email do usuário autenticado
  SELECT email INTO v_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Obter email do convite
  SELECT email INTO v_invitation_email 
  FROM public.invitations 
  WHERE id = p_invitation_id;
  
  -- Verificar se emails correspondem
  IF v_email IS NULL OR v_invitation_email IS NULL OR v_email != v_invitation_email THEN
    RAISE EXCEPTION 'Email do convite não corresponde ao usuário autenticado';
  END IF;
  
  -- Atualizar status
  UPDATE public.invitations 
  SET status = 'aceito' 
  WHERE id = p_invitation_id;
END;
$$;