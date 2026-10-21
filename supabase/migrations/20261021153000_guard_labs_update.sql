-- Migration: guard_labs_update
-- Impede que membros de laboratório alterem colunas restritas / administrativas na tabela labs

CREATE OR REPLACE FUNCTION app_private.guard_labs_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Service role ou chamadas sem claims JWT passam livremente
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Administrador da plataforma passa livremente
  IF app_private.has_role(v_uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Membro de laboratório: proibir alteração de colunas restritas / administrativas
  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.criado_em IS DISTINCT FROM OLD.criado_em OR
     NEW.revisao_status IS DISTINCT FROM OLD.revisao_status OR
     NEW.assinatura_status IS DISTINCT FROM OLD.assinatura_status OR
     NEW.comissao_percentual IS DISTINCT FROM OLD.comissao_percentual OR
     NEW.modo_recebimento IS DISTINCT FROM OLD.modo_recebimento OR
     NEW.asaas_wallet_id IS DISTINCT FROM OLD.asaas_wallet_id OR
     NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id OR
     NEW.asaas_subscription_id IS DISTINCT FROM OLD.asaas_subscription_id THEN
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
