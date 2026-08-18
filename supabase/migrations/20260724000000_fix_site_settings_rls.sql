-- Migration 15: Fix GRANT permissions and RLS policies on site_settings and benefits for admin role

-- 1. Grant table privileges to authenticated role so Postgres allows INSERT/UPDATE
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.benefits TO authenticated;

-- 2. Re-create RLS policies for site_settings checking user_roles directly
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage site_settings" ON public.site_settings;
CREATE POLICY "Admins manage site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

-- 3. Re-create RLS policies for benefits
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read benefits" ON public.benefits;
CREATE POLICY "Public read benefits" ON public.benefits
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage benefits" ON public.benefits;
CREATE POLICY "Admins manage benefits" ON public.benefits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );
