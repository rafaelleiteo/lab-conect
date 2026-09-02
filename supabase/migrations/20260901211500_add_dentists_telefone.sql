-- Migration: Add telefone column to public.dentists
ALTER TABLE public.dentists
  ADD COLUMN IF NOT EXISTS telefone text;
