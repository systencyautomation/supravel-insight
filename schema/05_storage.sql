-- ============================================
-- 05_storage.sql
-- Buckets de storage
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-documents', 'sale-documents', false)
ON CONFLICT (id) DO NOTHING;
