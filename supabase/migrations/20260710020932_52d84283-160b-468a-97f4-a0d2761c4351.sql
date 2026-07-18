ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS arquivos_obrigatorios text[] NOT NULL DEFAULT '{}'::text[];

DROP POLICY IF EXISTS "Products visible by link or member or admin" ON public.products;
CREATE POLICY "Products visible by link or member or admin"
ON public.products
FOR SELECT
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR lab_id IN (SELECT app_private.current_lab_ids())
  OR lab_id IN (
    SELECT dll.lab_id
    FROM public.dentist_lab_links dll
    WHERE dll.dentist_id IN (SELECT app_private.current_dentist_ids())
  )
);

DROP POLICY IF EXISTS "Lab manages own products" ON public.products;
CREATE POLICY "Lab manages own products"
ON public.products
FOR ALL
TO authenticated
USING (lab_id IN (SELECT app_private.current_lab_ids()))
WITH CHECK (lab_id IN (SELECT app_private.current_lab_ids()));