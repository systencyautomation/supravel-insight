
-- 1. Create sale_documents table
CREATE TABLE public.sale_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('xml', 'danfe', 'boleto')),
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org documents"
  ON public.sale_documents FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage their org documents"
  ON public.sale_documents FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()) AND can_view_all_sales(auth.uid()));

CREATE POLICY "Super admins can manage all documents"
  ON public.sale_documents FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for quick lookup by sale
CREATE INDEX idx_sale_documents_sale_id ON public.sale_documents(sale_id);
CREATE INDEX idx_sale_documents_org_id ON public.sale_documents(organization_id);

-- 2. Add ai_api_key column to organizations
ALTER TABLE public.organizations ADD COLUMN ai_api_key text;

-- 3. Create storage bucket for sale documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-documents', 'sale-documents', false);

-- Storage RLS policies
CREATE POLICY "Org members can read sale documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sale-documents' AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text);

CREATE POLICY "Service role can insert sale documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sale-documents');

CREATE POLICY "Service role can delete sale documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sale-documents');
