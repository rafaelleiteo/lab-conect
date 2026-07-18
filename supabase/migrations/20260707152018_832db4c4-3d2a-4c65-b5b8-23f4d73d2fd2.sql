
-- 1. dentist_lab_links
CREATE TABLE public.dentist_lab_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dentist_id, lab_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentist_lab_links TO authenticated;
GRANT ALL ON public.dentist_lab_links TO service_role;
ALTER TABLE public.dentist_lab_links ENABLE ROW LEVEL SECURITY;

-- 2. Novas colunas
ALTER TABLE public.dentists
  ADD COLUMN IF NOT EXISTS cro text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS revisao_status text NOT NULL DEFAULT 'pendente'
    CHECK (revisao_status IN ('pendente','confirmado','cancelado'));
ALTER TABLE public.dentists ALTER COLUMN lab_id DROP NOT NULL;

ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS visivel_diretorio boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revisao_status text NOT NULL DEFAULT 'pendente'
    CHECK (revisao_status IN ('pendente','confirmado','cancelado')),
  ADD COLUMN IF NOT EXISTS assinatura_status text NOT NULL DEFAULT 'nao_iniciada'
    CHECK (assinatura_status IN ('nao_iniciada','ativa','cancelada')),
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

-- 3. Backfill: vínculos a partir dos dentistas existentes; dados existentes como confirmados/ativos
INSERT INTO public.dentist_lab_links (dentist_id, lab_id)
SELECT id, lab_id FROM public.dentists WHERE lab_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.dentists SET revisao_status = 'confirmado' WHERE revisao_status = 'pendente';
UPDATE public.labs
  SET revisao_status = 'confirmado', assinatura_status = 'ativa'
  WHERE revisao_status = 'pendente';

-- 4. Policies dentist_lab_links
CREATE POLICY "Dentist views own links or lab or admin" ON public.dentist_lab_links
  FOR SELECT TO authenticated USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Dentist creates own link" ON public.dentist_lab_links
  FOR INSERT TO authenticated WITH CHECK (
    dentist_id IN (
      SELECT id FROM public.dentists
      WHERE user_id = auth.uid() AND revisao_status <> 'cancelado'
    )
  );
CREATE POLICY "Dentist or lab or admin deletes link" ON public.dentist_lab_links
  FOR DELETE TO authenticated USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

-- 5. Recria policies dependentes para usar dentist_lab_links
-- Dentists SELECT
DROP POLICY IF EXISTS "Dentist views self or lab or admin" ON public.dentists;
CREATE POLICY "Dentist views self or lab or admin" ON public.dentists
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
    OR id IN (
      SELECT dentist_id FROM public.dentist_lab_links
      WHERE lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
    )
  );

-- Dentists self-insert (para self-signup) — bloqueado se cancelado
CREATE POLICY "Dentist inserts own row" ON public.dentists
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND revisao_status <> 'cancelado'
  );
CREATE POLICY "Dentist updates own row" ON public.dentists
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND revisao_status <> 'cancelado')
  WITH CHECK (user_id = auth.uid() AND revisao_status <> 'cancelado');

-- Labs SELECT — visible if in directory OR admin OR member OR dentist has link
DROP POLICY IF EXISTS "Authenticated view labs" ON public.labs;
CREATE POLICY "Labs visible by directory or link or member or admin" ON public.labs
  FOR SELECT TO authenticated USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
    OR id IN (
      SELECT lab_id FROM public.dentist_lab_links
      WHERE dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    )
    OR (visivel_diretorio = true AND revisao_status <> 'cancelado' AND assinatura_status = 'ativa')
  );

-- Lab members: allow updating own lab config
CREATE POLICY "Lab member updates own lab" ON public.labs
  FOR UPDATE TO authenticated
  USING (
    id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
    AND revisao_status <> 'cancelado'
  )
  WITH CHECK (
    id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
    AND revisao_status <> 'cancelado'
  );

-- Products SELECT: only from labs the user has access (member, link, or admin)
DROP POLICY IF EXISTS "Authenticated view products" ON public.products;
CREATE POLICY "Products visible by link or member or admin" ON public.products
  FOR SELECT TO authenticated USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
    OR lab_id IN (
      SELECT lab_id FROM public.dentist_lab_links
      WHERE dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    )
  );

-- Lab manages own products
CREATE POLICY "Lab manages own products" ON public.products
  FOR ALL TO authenticated
  USING (
    lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

-- Orders: dentist creates only if link exists AND not cancelled
DROP POLICY IF EXISTS "Dentist creates own orders" ON public.orders;
CREATE POLICY "Dentist creates own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (
    dentist_id IN (
      SELECT id FROM public.dentists
      WHERE user_id = auth.uid() AND revisao_status <> 'cancelado'
    )
    AND EXISTS (
      SELECT 1 FROM public.dentist_lab_links dll
      WHERE dll.dentist_id = orders.dentist_id AND dll.lab_id = orders.lab_id
    )
  );

-- Storage bucket for logos (via SQL is allowed on storage.objects; but bucket create uses tool — do via SQL is not permitted per rules; skip and use tool separately)
