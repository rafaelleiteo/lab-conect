-- Migration: update_labs_visiveis_view
-- Alinha a view labs_visiveis com a política exata de diretório (visivel_diretorio = true)
-- sem dependência restritiva de assinatura_status para permitir laboratórios em trial / homologação.

CREATE OR REPLACE VIEW public.labs_visiveis
WITH (security_invoker = false)
AS
SELECT
  l.id,
  l.nome,
  l.subdominio,
  l.logo_url,
  l.cor_destaque,
  l.visivel_diretorio
FROM public.labs l
WHERE l.revisao_status <> 'cancelado'
  AND (
    -- 1. Laboratório optou por aparecer no diretório
    l.visivel_diretorio = true
    -- 2. OU existe vínculo formal com o dentista logado
    OR EXISTS (
      SELECT 1
      FROM public.dentist_lab_links dll
      JOIN public.dentists d ON d.id = dll.dentist_id
      WHERE dll.lab_id = l.id
        AND d.user_id = auth.uid()
    )
    -- 3. OU o usuário logado é membro da equipe do próprio laboratório
    OR EXISTS (
      SELECT 1
      FROM public.lab_members lm
      WHERE lm.lab_id = l.id
        AND lm.user_id = auth.uid()
    )
    -- 4. OU o usuário logado é administrador da plataforma
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
  );

ALTER VIEW public.labs_visiveis OWNER TO postgres;

GRANT SELECT ON public.labs_visiveis TO authenticated;
REVOKE ALL ON public.labs_visiveis FROM anon;
