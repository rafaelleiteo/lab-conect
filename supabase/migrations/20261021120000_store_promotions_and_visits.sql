-- Migration: 20261021120000_store_promotions_and_visits.sql
-- 1. Coluna de mensagem de divulgação customizada em labs (null = usar padrão do sistema)
ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS mensagem_divulgacao text NULL;

-- 2. Tabela de contadores agregados de visita à vitrine por canal e dia
CREATE TABLE IF NOT EXISTS public.store_visit_counts (
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  dia date NOT NULL DEFAULT CURRENT_DATE,
  origem text NOT NULL,
  total int NOT NULL DEFAULT 0,
  PRIMARY KEY (lab_id, dia, origem)
);

-- Ativação de Row Level Security
ALTER TABLE public.store_visit_counts ENABLE ROW LEVEL SECURITY;

-- Permissões estritas: nenhum INSERT, UPDATE ou DELETE para clientes (anon e authenticated)
REVOKE ALL ON public.store_visit_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.store_visit_counts TO authenticated;
GRANT ALL ON public.store_visit_counts TO service_role;

-- Policy de SELECT: membros do laboratório podem ver as visitas de seu próprio laboratório; admins veem todas
DROP POLICY IF EXISTS "Members and admins read store_visit_counts" ON public.store_visit_counts;
CREATE POLICY "Members and admins read store_visit_counts"
  ON public.store_visit_counts
  FOR SELECT
  TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR lab_id IN (
      SELECT lm.lab_id
      FROM public.lab_members lm
      WHERE lm.user_id = auth.uid()
    )
  );

-- 3. Função com SECURITY DEFINER para registrar visita com upsert atômico
CREATE OR REPLACE FUNCTION public.registrar_visita_loja(
  p_lab_id uuid,
  p_origem text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_visit_counts (lab_id, dia, origem, total)
  VALUES (p_lab_id, CURRENT_DATE, p_origem, 1)
  ON CONFLICT (lab_id, dia, origem)
  DO UPDATE SET total = public.store_visit_counts.total + 1;
END;
$$;

-- Permissão de execução restrita estritamente ao service_role
REVOKE ALL ON FUNCTION public.registrar_visita_loja(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_visita_loja(uuid, text) TO service_role;
