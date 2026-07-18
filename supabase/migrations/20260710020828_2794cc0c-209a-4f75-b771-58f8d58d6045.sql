CREATE OR REPLACE FUNCTION app_private.current_dentist_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT d.id
  FROM public.dentists d
  WHERE d.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION app_private.current_lab_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT lm.lab_id
  FROM public.lab_members lm
  WHERE lm.user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Labs visible by directory or link or member or admin" ON public.labs;
CREATE POLICY "Labs visible by directory or link or member or admin"
ON public.labs
FOR SELECT
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR id IN (SELECT app_private.current_lab_ids())
  OR id IN (
    SELECT dll.lab_id
    FROM public.dentist_lab_links dll
    WHERE dll.dentist_id IN (SELECT app_private.current_dentist_ids())
  )
  OR (
    visivel_diretorio = true
    AND revisao_status <> 'cancelado'::text
    AND assinatura_status = 'ativa'::text
  )
);

DROP POLICY IF EXISTS "Dentist views self or lab or admin" ON public.dentists;
CREATE POLICY "Dentist views self or lab or admin"
ON public.dentists
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR app_private.has_role(auth.uid(), 'admin'::app_role)
  OR id IN (
    SELECT dll.dentist_id
    FROM public.dentist_lab_links dll
    WHERE dll.lab_id IN (SELECT app_private.current_lab_ids())
  )
);

DROP POLICY IF EXISTS "Dentist views own links or lab or admin" ON public.dentist_lab_links;
CREATE POLICY "Dentist views own links or lab or admin"
ON public.dentist_lab_links
FOR SELECT
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR dentist_id IN (SELECT app_private.current_dentist_ids())
  OR lab_id IN (SELECT app_private.current_lab_ids())
);

DROP POLICY IF EXISTS "Dentist creates own link" ON public.dentist_lab_links;
CREATE POLICY "Dentist creates own link"
ON public.dentist_lab_links
FOR INSERT
TO authenticated
WITH CHECK (
  dentist_id IN (
    SELECT d.id
    FROM public.dentists d
    WHERE d.user_id = auth.uid()
      AND d.revisao_status <> 'cancelado'::text
  )
);

DROP POLICY IF EXISTS "Dentist or lab or admin deletes link" ON public.dentist_lab_links;
CREATE POLICY "Dentist or lab or admin deletes link"
ON public.dentist_lab_links
FOR DELETE
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR dentist_id IN (SELECT app_private.current_dentist_ids())
  OR lab_id IN (SELECT app_private.current_lab_ids())
);