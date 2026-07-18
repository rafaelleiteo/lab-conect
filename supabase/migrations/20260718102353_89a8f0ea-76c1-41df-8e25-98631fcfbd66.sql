CREATE TABLE public.academy_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('ebook', 'curso', 'tutorial')),
  titulo text NOT NULL,
  descricao text NOT NULL,
  url_conteudo text NOT NULL,
  capa_url text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academy_content TO authenticated;
GRANT ALL ON public.academy_content TO service_role;
ALTER TABLE public.academy_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view academy content" ON public.academy_content
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins manage academy content" ON public.academy_content
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));