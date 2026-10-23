-- Migration 20261022233000_restrict_labs_exposure.sql
-- Restringe acesso direto à tabela labs:
-- 1. Remove policy pública de vitrine (leitura anon passa a ser via server function getPublicLabBySubdomain)
-- 2. Revoga privilégios do role anon sobre a tabela labs
-- 3. Substitui policy de authenticated por leitura restrita a membros do próprio laboratório e administradores
-- Leitura de laboratórios vinculados para dentistas passa a ser via view public.labs_visiveis

-- 1. Remover policy de leitura pública
DROP POLICY IF EXISTS "Public showcase lab read" ON public.labs;

-- 2. Revogar privilégios do anon na tabela labs
REVOKE ALL ON public.labs FROM anon;

-- 3. Substituir policy de authenticated
DROP POLICY IF EXISTS "Labs visible by directory or link or member or admin" ON public.labs;
DROP POLICY IF EXISTS "Labs visible by members and admins" ON public.labs;

CREATE POLICY "Labs visible by members and admins" ON public.labs
  FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR (id IN (SELECT app_private.current_lab_ids()))
  );
