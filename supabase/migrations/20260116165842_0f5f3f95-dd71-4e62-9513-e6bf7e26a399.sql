-- Create table to store raw spreadsheet documents (FIPE tables)
CREATE TABLE public.fipe_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  headers TEXT[] NOT NULL,
  rows JSONB NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.fipe_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage all fipe documents" 
ON public.fipe_documents 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can manage their org fipe documents" 
ON public.fipe_documents 
FOR ALL 
USING (organization_id = get_user_org_id(auth.uid()));