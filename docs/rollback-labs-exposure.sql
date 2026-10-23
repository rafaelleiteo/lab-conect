-- ==============================================================================
-- ROLLBACK: Reverter restrição de exposição da tabela labs
-- Este script restaura o estado de acesso da tabela public.labs anterior à
-- migration 20261022233000_restrict_labs_exposure.sql.
-- ==============================================================================

-- 1. Restaurar GRANT SELECT para o role anon
GRANT SELECT ON public.labs TO anon;

-- 2. Restaurar policy de leitura pública da vitrine para anon
DROP POLICY IF EXISTS "Public showcase lab read" ON public.labs;
CREATE POLICY "Public showcase lab read" ON public.labs
  FOR SELECT TO anon
  USING (revisao_status <> 'cancelado'::text);

-- 3. Remover policy restrita a membros e admins
DROP POLICY IF EXISTS "Labs visible by members and admins" ON public.labs;

-- 4. Restaurar policy de authenticated que permitia diretório e vínculos
DROP POLICY IF EXISTS "Labs visible by directory or link or member or admin" ON public.labs;
CREATE POLICY "Labs visible by directory or link or member or admin" ON public.labs
  FOR SELECT TO authenticated
  USING (
    revisao_status <> 'cancelado'::text
    AND (
      visivel_diretorio = true
      OR id IN (
        SELECT dentist_lab_links.lab_id
        FROM dentist_lab_links
        WHERE dentist_lab_links.dentist_id IN (SELECT app_private.current_dentist_ids())
      )
      OR id IN (SELECT app_private.current_lab_ids())
      OR app_private.has_role(auth.uid(), 'admin'::app_role)
    )
  );
