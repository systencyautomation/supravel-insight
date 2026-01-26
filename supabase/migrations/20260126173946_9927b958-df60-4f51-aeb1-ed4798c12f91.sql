-- Add icms_tabela column to persist the origin/table ICMS rate
ALTER TABLE public.sales 
ADD COLUMN icms_tabela NUMERIC(5,2);

COMMENT ON COLUMN public.sales.icms_tabela IS 
'ICMS da origem/tabela (4%, 7% ou 12%) detectado pela planilha FIPE';