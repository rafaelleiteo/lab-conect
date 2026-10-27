-- Migration: 20261027120000_order_claims_and_dentist_guards.sql
-- Objetivo:
-- 1. Função imutável app_private.normalizar_cro(text)
-- 2. Trigger guard_dentists_write na tabela dentists
-- 3. Colunas de verificação em dentist_lab_links e revogação da policy de INSERT para authenticated
-- 4. Tabela order_claims com RLS restrito apenas para service_role / admin
-- 5. Índice único parcial em dentists por (normalizar_cro(cro), upper(uf)) onde revisao_status = 'confirmado'

-- 1. Função normalizar_cro
CREATE OR REPLACE FUNCTION app_private.normalizar_cro(p_cro text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(regexp_replace(COALESCE(p_cro, ''), '\D', '', 'g'), '^0+', ''), '');
$$;

COMMENT ON FUNCTION app_private.normalizar_cro(text) IS 'Retorna apenas os dígitos do CRO sem zeros à esquerda ou NULL se vazio.';

-- 2. Trigger guard_dentists_write
CREATE OR REPLACE FUNCTION app_private.guard_dentists_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := auth.role();
  v_cro_old text;
  v_cro_new text;
  v_uf_old text;
  v_uf_new text;
BEGIN
  -- 1. Bypass para chamadas service_role ou superusuários do banco de dados
  IF (v_role = 'service_role' OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR session_user IN ('postgres', 'service_role', 'supabase_admin'))
     AND (v_role IS NULL OR v_role = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 2. Administrador da plataforma tem permissão irrestrita
  IF v_uid IS NOT NULL AND app_private.has_role(v_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- 3. INSERT por usuário comum (dentista autenticado): força revisao_status para 'pendente'
  IF TG_OP = 'INSERT' THEN
    NEW.revisao_status := 'pendente';
    RETURN NEW;
  END IF;

  -- 4. UPDATE por usuário comum (dentista autenticado)
  IF TG_OP = 'UPDATE' THEN
    -- Bloqueio estrito por allowlist: dentista só pode alterar nome, telefone, cro, uf, email
    IF (to_jsonb(NEW) - ARRAY[
      'nome',
      'telefone',
      'cro',
      'uf',
      'email'
    ]) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY[
      'nome',
      'telefone',
      'cro',
      'uf',
      'email'
    ]) THEN
      RAISE EXCEPTION 'Dentista não pode alterar este campo';
    END IF;

    -- Se o CRO normalizado ou a UF mudarem:
    v_cro_old := app_private.normalizar_cro(OLD.cro);
    v_cro_new := app_private.normalizar_cro(NEW.cro);
    v_uf_old := UPPER(TRIM(COALESCE(OLD.uf, '')));
    v_uf_new := UPPER(TRIM(COALESCE(NEW.uf, '')));

    IF v_cro_old IS DISTINCT FROM v_cro_new OR v_uf_old IS DISTINCT FROM v_uf_new THEN
      -- revisao_status volta a 'pendente'
      NEW.revisao_status := 'pendente';

      -- Todos os vínculos desse dentista perdem a verificação
      UPDATE public.dentist_lab_links
      SET verificado_pelo_lab = false,
          verificado_cro = null,
          verificado_uf = null,
          verificado_em = null
      WHERE dentist_id = OLD.id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dentists_write ON public.dentists;
CREATE TRIGGER trg_guard_dentists_write
BEFORE INSERT OR UPDATE ON public.dentists
FOR EACH ROW
EXECUTE FUNCTION app_private.guard_dentists_write();

-- 3. Colunas de verificação em dentist_lab_links
ALTER TABLE public.dentist_lab_links
ADD COLUMN IF NOT EXISTS verificado_pelo_lab boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verificado_cro text,
ADD COLUMN IF NOT EXISTS verificado_uf text,
ADD COLUMN IF NOT EXISTS verificado_em timestamptz;

-- Revogar policy de INSERT direto pelo cliente em dentist_lab_links
DROP POLICY IF EXISTS "Dentist creates own link" ON public.dentist_lab_links;

-- 4. Tabela order_claims
CREATE TABLE IF NOT EXISTS public.order_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'recusada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  decidido_por uuid,
  CONSTRAINT order_claims_order_dentist_unique UNIQUE (order_id, dentist_id)
);

ALTER TABLE public.order_claims ENABLE ROW LEVEL SECURITY;

-- Sem policies para anon e authenticated. Apenas postgres/service_role
REVOKE ALL ON public.order_claims FROM anon, authenticated;

-- 5. Índice único parcial em dentists para CRO + UF confirmados
CREATE UNIQUE INDEX IF NOT EXISTS dentists_confirmed_cro_uf_idx
ON public.dentists (app_private.normalizar_cro(cro), upper(uf))
WHERE revisao_status = 'confirmado';

