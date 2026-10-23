-- Migration: create_labs_visiveis_view
-- Cria a view labs_visiveis para permitir leitura segura de laboratórios por dentistas autenticados.
-- Expõe estritamente colunas públicas e não-sensíveis (id, nome, subdominio, logo_url, cor_destaque, visivel_diretorio).
--
-- NOTA SOBRE O LINTER DO SUPABASE:
-- O alerta de "Security Definer View" (security_invoker = false) é intencional aqui:
-- a view pertence ao postgres para que usuários com papel 'authenticated' (dentistas) possam
-- consultar a lista e dados de identificação de laboratórios visíveis sem necessitar de permissão
-- SELECT direta nas colunas confidenciais (financeiras, bancárias e fiscais) da tabela base public.labs.

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
    -- 1. Laboratório optou por aparecer no diretório público e está com assinatura ativa
    (l.visivel_diretorio = true AND l.assinatura_status = 'ativa')
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

-- Conceder SELECT exclusivamente para authenticated; anon NÃO tem acesso à view
REVOKE ALL ON public.labs_visiveis FROM anon, public;
GRANT SELECT ON public.labs_visiveis TO authenticated;
