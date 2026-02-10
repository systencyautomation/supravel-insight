-- Add ai_pre_calculated column to sales table
ALTER TABLE public.sales ADD COLUMN ai_pre_calculated boolean NOT NULL DEFAULT false;