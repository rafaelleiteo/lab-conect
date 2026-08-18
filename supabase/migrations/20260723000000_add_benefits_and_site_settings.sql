-- Migration 14: Add site_settings (for login right panel HTML) and benefits tables
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage site_settings" ON public.site_settings;
CREATE POLICY "Admins manage site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL,
  parceiro text NOT NULL,
  url_link text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benefits TO authenticated, anon;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read benefits" ON public.benefits;
CREATE POLICY "Public read benefits" ON public.benefits FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Admins manage benefits" ON public.benefits;
CREATE POLICY "Admins manage benefits" ON public.benefits FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
