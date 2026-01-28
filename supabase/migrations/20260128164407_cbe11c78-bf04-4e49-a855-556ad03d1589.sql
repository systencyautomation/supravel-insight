-- Adicionar campos para guardar os percentuais individuais de vendedor e representante
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS internal_seller_percent numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS representative_percent numeric DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.sales.internal_seller_percent IS 'Percentual de comissão atribuído ao vendedor interno na aprovação';
COMMENT ON COLUMN public.sales.representative_percent IS 'Percentual de comissão atribuído ao representante na aprovação';