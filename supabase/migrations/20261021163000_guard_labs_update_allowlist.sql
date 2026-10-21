-- Migration: guard_labs_update_allowlist
-- Refina a guarda de edição da tabela labs utilizando lista estrita de colunas permitidas (allowlist)
-- Apenas colunas explicitamente autorizadas para membros podem ser alteradas.
-- Novas colunas adicionadas à tabela nascem automaticamente BLOQUEADAS.
--
-- NOTAS DE MANUTENÇÃO FUTURA:
-- 1. Ao criar a coluna 'assunto_divulgacao' no futuro, ela deve ser acrescentada a esta lista permitida.
-- 2. Se a coluna 'cor_destaque' passar a ser editável pelo laboratório, validar previamente o formato #RRGGBB
--    com restrição CHECK antes de liberar na lista permitida, pois o valor é injetado diretamente em estilos
--    CSS de páginas públicas da vitrine e do catálogo.

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
  -- Chamadas diretas do sistema / migrations / cron / backend privilegiado passam livremente.
  -- Chamadas via PostgREST só passam se possuírem o role 'service_role'.
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
  -- Qualquer alteração fora das 11 colunas permitidas é imediatamente rejeitada.
  -- 'subdominio' e 'cor_destaque' permanecem bloqueados para membros (apenas admin altera).
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
    'mensagem_divulgacao'
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
    'mensagem_divulgacao'
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
