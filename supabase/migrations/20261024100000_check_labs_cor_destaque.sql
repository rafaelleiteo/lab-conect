-- Migration: check_labs_cor_destaque
-- Restringe labs.cor_destaque às 5 cores válidas da paleta oficial do seletor
ALTER TABLE public.labs
  DROP CONSTRAINT IF EXISTS labs_cor_destaque_check;

ALTER TABLE public.labs
  ADD CONSTRAINT labs_cor_destaque_check
  CHECK (cor_destaque = ANY (ARRAY[
    '#4C5FF5',
    '#2D6FDB',
    '#28854F',
    '#C23A3A',
    '#9A6710'
  ]));
