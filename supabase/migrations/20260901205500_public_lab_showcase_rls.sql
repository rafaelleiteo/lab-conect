-- Migration: Public showcase RLS policies for unauthenticated visitors (anon)

-- 1. Grant SELECT on public.labs to anon, scoped strictly to non-cancelled labs
GRANT SELECT ON public.labs TO anon;

DROP POLICY IF EXISTS "Public showcase lab read" ON public.labs;
CREATE POLICY "Public showcase lab read" ON public.labs FOR SELECT TO anon
  USING (revisao_status <> 'cancelado');

-- 2. Grant SELECT on public.products to anon, scoped strictly to active products
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS "Public showcase products read" ON public.products;
CREATE POLICY "Public showcase products read" ON public.products FOR SELECT TO anon
  USING (ativo = true);
