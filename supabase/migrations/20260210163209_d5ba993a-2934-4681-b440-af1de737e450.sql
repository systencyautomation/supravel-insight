
ALTER TABLE public.sales 
ADD COLUMN valor_presente numeric,
ADD COLUMN entrada_calculada numeric,
ADD COLUMN analise_ia_status text DEFAULT 'pendente';
