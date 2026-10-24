-- Migration: guard_labs_update_allow_cor_destaque
-- Atualiza a guarda de edição da tabela labs permitindo que membros alterem cor_destaque
-- (previamente validada por CHECK constraint contra valores fora da paleta)

CREATE OR REPLACE FUNCTION app_private.guard_labs_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := auth.role();
BEGIN
  -- 1. Bypass liberado exclusivamente para chamadas service_role ou superusuários do banco de dados.
  IF (v_role = 'service_role' OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR session_user IN ('postgres', 'service_role', 'supabase_admin'))
     AND (v_role IS NULL OR v_role = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 2. Chamadas anônimas ou sem usuário identificado que não sejam service_role NUNCA passam
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Laboratório não pode alterar este campo';
  END IF;

  -- 3. Administrador da plataforma possui permissão irrestrita
  IF app_private.has_role(v_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- 4. Membro de laboratório: bloqueio estrito por lista permitida (allowlist)
  -- 'cor_destaque' agora é permitida junto às 11 colunas anteriores.
  -- 'subdominio', status e campos financeiros permanecem estritamente bloqueados para membros.
  IF (to_jsonb(NEW) - ARRAY[
    'nome',
    'visivel_diretorio',
    'logo_url',
    'responsavel',
    'email_contato',
    'telefone',
    'cnpj',
    'cep',
    'endereco',
    'endereco_numero',
    'mensagem_divulgacao',
    'cor_destaque'
  ]) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY[
    'nome',
    'visivel_diretorio',
    'logo_url',
    'responsavel',
    'email_contato',
    'telefone',
    'cnpj',
    'cep',
    'endereco',
    'endereco_numero',
    'mensagem_divulgacao',
    'cor_destaque'
  ]) THEN
    RAISE EXCEPTION 'Laboratório não pode alterar este campo';
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION app_private.guard_labs_update() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_labs_update ON public.labs;

CREATE TRIGGER trg_guard_labs_update
  BEFORE UPDATE ON public.labs
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_labs_update();
