-- Criar política RLS para permitir admins e managers atualizarem sua própria organização
CREATE POLICY "Admins can update their own org"
  ON public.organizations FOR UPDATE
  USING (
    id = public.get_user_org_id(auth.uid()) 
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  )
  WITH CHECK (
    id = public.get_user_org_id(auth.uid()) 
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'manager'::app_role)
    )
  );