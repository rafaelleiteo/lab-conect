-- Migration: 20261027130000_normalize_cro_in_trigger.sql
-- Objetivo: Normalizar automaticamente NEW.cro e NEW.uf dentro de guard_dentists_write

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
  -- 1. Normalizacao automatica de CRO e UF sempre
  IF NEW.cro IS NOT NULL THEN
    NEW.cro := app_private.normalizar_cro(NEW.cro);
  END IF;
  IF NEW.uf IS NOT NULL THEN
    NEW.uf := UPPER(TRIM(NEW.uf));
  END IF;

  -- 2. Bypass para chamadas service_role ou superusuarios do banco de dados
  IF (v_role = 'service_role' OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR session_user IN ('postgres', 'service_role', 'supabase_admin'))
     AND (v_role IS NULL OR v_role = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 3. Administrador da plataforma tem permissao irrestrita
  IF v_uid IS NOT NULL AND app_private.has_role(v_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- 4. INSERT por usuario comum (dentista autenticado): forca revisao_status para 'pendente'
  IF TG_OP = 'INSERT' THEN
    NEW.revisao_status := 'pendente';
    RETURN NEW;
  END IF;

  -- 5. UPDATE por usuario comum (dentista autenticado)
  IF TG_OP = 'UPDATE' THEN
    -- Bloqueio estrito por allowlist: dentista so pode alterar nome, telefone, cro, uf, email
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
      RAISE EXCEPTION 'Dentista nao pode alterar este campo';
    END IF;

    -- Se o CRO normalizado ou a UF mudarem:
    v_cro_old := app_private.normalizar_cro(OLD.cro);
    v_cro_new := app_private.normalizar_cro(NEW.cro);
    v_uf_old := UPPER(TRIM(COALESCE(OLD.uf, '')));
    v_uf_new := UPPER(TRIM(COALESCE(NEW.uf, '')));

    IF v_cro_old IS DISTINCT FROM v_cro_new OR v_uf_old IS DISTINCT FROM v_uf_new THEN
      -- revisao_status volta a 'pendente'
      NEW.revisao_status := 'pendente';

      -- Todos os vinculos desse dentista perdem a verificacao
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
