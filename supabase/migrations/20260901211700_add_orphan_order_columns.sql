-- Migration: Add orphaned order fields to public.orders and make dentist_id nullable
ALTER TABLE public.orders ALTER COLUMN dentist_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cro_pendente text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS uf_pendente text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nome_dentista_pendente text;
