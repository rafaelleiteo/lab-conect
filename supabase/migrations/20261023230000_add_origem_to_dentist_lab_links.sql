-- Migration: 20261023230000_add_origem_to_dentist_lab_links.sql
-- Adiciona a coluna origem na tabela dentist_lab_links para rastreamento de divulgacao

ALTER TABLE public.dentist_lab_links
ADD COLUMN IF NOT EXISTS origem text;

COMMENT ON COLUMN public.dentist_lab_links.origem IS 'Canal de divulgacao que gerou o vinculo (ex: whatsapp, email, qr, link, compartilhar, direto, outro)';
