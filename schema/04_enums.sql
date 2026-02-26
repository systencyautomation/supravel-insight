-- ============================================
-- 04_enums.sql
-- Tipos ENUM do projeto
-- Executar ANTES de 01_tables.sql
-- ============================================

CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'manager',
  'seller',
  'representative',
  'saas_admin'
);

CREATE TYPE public.company_type AS ENUM (
  'mei',
  'empresa'
);

CREATE TYPE public.member_role AS ENUM (
  'responsavel',
  'funcionario'
);

CREATE TYPE public.representative_position AS ENUM (
  'indicador',
  'representante'
);
