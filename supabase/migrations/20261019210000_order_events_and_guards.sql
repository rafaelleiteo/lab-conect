-- ============================================================================
-- Migration: 20261019210000_order_events_and_guards.sql
-- Bloco "Pedido de verdade" - Parte 2:
-- 1. Grants explícitos de tabelas
-- 2. Restrições e trigger BEFORE UPDATE em orders (dentista e laboratório)
-- 3. Tabela order_events e triggers de status e anexos
-- 4. Habilitação de Realtime na tabela orders
-- ============================================================================

-- 1. Garantir permissões nas tabelas
GRANT ALL ON TABLE public.order_files TO authenticated, service_role, postgres;

-- 2. Atualizar RLS de UPDATE em public.orders para o laboratório
DROP POLICY IF EXISTS "Lab updates own orders" ON public.orders;
CREATE POLICY "Lab updates own orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR (
    status <> 'rascunho'
    AND lab_id IN (
      SELECT lm.lab_id FROM public.lab_members lm WHERE lm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  OR (
    status IN ('recebido', 'producao', 'cq', 'pronto', 'entregue')
    AND lab_id IN (
      SELECT lm.lab_id FROM public.lab_members lm WHERE lm.user_id = auth.uid()
    )
  )
);

-- 3. Trigger BEFORE UPDATE em public.orders (validação de integridade de colunas)
CREATE OR REPLACE FUNCTION app_private.guard_orders_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_dentist boolean := false;
  v_is_lab_member boolean := false;
  v_is_admin boolean := false;
BEGIN
  -- Service role ou chamadas sem claims JWT passam livremente
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := app_private.has_role(v_uid, 'admin'::app_role);
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Checar se é dentista dono do pedido
  IF OLD.dentist_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.dentists d WHERE d.id = OLD.dentist_id AND d.user_id = v_uid
    ) INTO v_is_dentist;
  END IF;

  -- Checar se é membro do laboratório do pedido
  IF OLD.lab_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.lab_members lm WHERE lm.lab_id = OLD.lab_id AND lm.user_id = v_uid
    ) INTO v_is_lab_member;
  END IF;

  IF NOT v_is_dentist AND NOT v_is_lab_member THEN
    RAISE EXCEPTION 'Usuário não tem permissão para alterar este pedido';
  END IF;

  -- 1) REGRAS DO DENTISTA
  IF v_is_dentist THEN
    IF OLD.status <> 'rascunho' THEN
      RAISE EXCEPTION 'Dentista só pode atualizar pedidos com status rascunho';
    END IF;

    IF NEW.status NOT IN ('rascunho', 'recebido') THEN
      RAISE EXCEPTION 'Status inválido para envio do dentista: %', NEW.status;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.dentist_id IS DISTINCT FROM OLD.dentist_id OR
       NEW.lab_id IS DISTINCT FROM OLD.lab_id OR
       NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'Dentista não pode alterar identificadores do pedido';
    END IF;

    RETURN NEW;
  END IF;

  -- 2) REGRAS DO LABORATÓRIO
  IF v_is_lab_member THEN
    IF OLD.status = 'rascunho' OR NEW.status = 'rascunho' THEN
      RAISE EXCEPTION 'Laboratório não pode alterar pedidos em rascunho';
    END IF;

    IF NEW.status NOT IN ('recebido', 'producao', 'cq', 'pronto', 'entregue') THEN
      RAISE EXCEPTION 'Status inválido para o laboratório: %', NEW.status;
    END IF;

    -- Laboratório SÓ pode alterar a coluna status
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.dentist_id IS DISTINCT FROM OLD.dentist_id OR
       NEW.lab_id IS DISTINCT FROM OLD.lab_id OR
       NEW.product_id IS DISTINCT FROM OLD.product_id OR
       NEW.valor IS DISTINCT FROM OLD.valor OR
       NEW.paciente IS DISTINCT FROM OLD.paciente OR
       NEW.dentes IS DISTINCT FROM OLD.dentes OR
       NEW.cor IS DISTINCT FROM OLD.cor OR
       NEW.material IS DISTINCT FROM OLD.material OR
       NEW.unidades IS DISTINCT FROM OLD.unidades OR
       NEW.data_desejada IS DISTINCT FROM OLD.data_desejada OR
       NEW.observacoes IS DISTINCT FROM OLD.observacoes OR
       NEW.urgente IS DISTINCT FROM OLD.urgente OR
       NEW.criado_em IS DISTINCT FROM OLD.criado_em THEN
      RAISE EXCEPTION 'Laboratório só pode alterar o status do pedido';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_orders_update ON public.orders;
CREATE TRIGGER trg_guard_orders_update
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION app_private.guard_orders_update();

-- 4. Tabela order_events
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('status', 'arquivo')),
  descricao text NOT NULL,
  de_status text,
  para_status text,
  autor uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_criado_em ON public.order_events(criado_em ASC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.order_events TO authenticated, service_role, postgres;

DROP POLICY IF EXISTS "Order events select authenticated" ON public.order_events;
CREATE POLICY "Order events select authenticated" ON public.order_events
FOR SELECT TO authenticated
USING (app_private.can_read_order_files(order_id));

-- 5. Triggers para registrar eventos em order_events
-- 5.1 Mudança de status em orders
CREATE OR REPLACE FUNCTION app_private.on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (
      order_id,
      tipo,
      descricao,
      de_status,
      para_status,
      autor,
      criado_em
    ) VALUES (
      NEW.id,
      'status',
      'Status alterado de ' || coalesce(OLD.status, 'nenhum') || ' para ' || NEW.status,
      OLD.status,
      NEW.status,
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION app_private.on_order_status_change();

-- 5.2 Novo arquivo anexado em order_files
CREATE OR REPLACE FUNCTION app_private.on_order_file_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_autor_tipo text := 'Laboratório';
  v_is_dentist boolean := false;
BEGIN
  IF NEW.enviado_por IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.dentists d 
      JOIN public.orders o ON o.dentist_id = d.id 
      WHERE o.id = NEW.order_id AND d.user_id = NEW.enviado_por
    ) INTO v_is_dentist;
    
    IF v_is_dentist THEN
      v_autor_tipo := 'Dentista';
    END IF;
  END IF;

  INSERT INTO public.order_events (
    order_id,
    tipo,
    descricao,
    autor,
    criado_em
  ) VALUES (
    NEW.order_id,
    'arquivo',
    NEW.nome_original || ' enviado por ' || v_autor_tipo,
    NEW.enviado_por,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_file_inserted ON public.order_files;
CREATE TRIGGER trg_order_file_inserted
AFTER INSERT ON public.order_files
FOR EACH ROW
EXECUTE FUNCTION app_private.on_order_file_inserted();

-- 6. Habilitar Realtime na tabela orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
