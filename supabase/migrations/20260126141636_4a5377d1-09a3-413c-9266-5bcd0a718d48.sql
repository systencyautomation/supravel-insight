-- Create enum for position
CREATE TYPE public.representative_position AS ENUM ('indicador', 'representante');

-- Add new columns to representatives table
ALTER TABLE public.representatives 
  ADD COLUMN sede TEXT,
  ADD COLUMN company TEXT,
  ADD COLUMN position public.representative_position DEFAULT 'representante';