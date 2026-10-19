-- Migration: 20261019200000_order_custom_fields_and_storage.sql
-- Description: Campos de pedido nos produtos e ordens, tabela order_files, bucket order-files e RLS policies.

-- 1. products: campos_pedido e materiais
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS campos_pedido jsonb NOT NULL DEFAULT '{"dentes":"opcional","cor":"opcional","material":"desligado","unidades":"desligado","data_desejada":"opcional","observacoes":"opcional","urgente":"desligado"}'::jsonb,
  ADD COLUMN IF NOT EXISTS materiais text[] NOT NULL DEFAULT '{}';

-- 2. orders: novas colunas e extensão do status para rascunho
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dentes text[],
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS unidades int,
  ADD COLUMN IF NOT EXISTS data_desejada date,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false;

-- Permitir status 'rascunho'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['rascunho'::text, 'recebido'::text, 'producao'::text, 'cq'::text, 'pronto'::text, 'entregue'::text]));

-- Ajuste de policies em orders (rascunho invisível para lab e admin, visível para o dentista dono)
DROP POLICY IF EXISTS "Dentist views own orders" ON public.orders;
DROP POLICY IF EXISTS "Users view applicable orders" ON public.orders;

CREATE POLICY "Users view applicable orders" ON public.orders
FOR SELECT TO authenticated
USING (
  (dentist_id IN (SELECT app_private.current_dentist_ids()))
  OR
  (status <> 'rascunho' AND (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR lab_id IN (SELECT app_private.current_lab_ids())
  ))
);

DROP POLICY IF EXISTS "Dentist updates draft orders" ON public.orders;
CREATE POLICY "Dentist updates draft orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  dentist_id IN (SELECT app_private.current_dentist_ids()) AND status = 'rascunho'
)
WITH CHECK (
  dentist_id IN (SELECT app_private.current_dentist_ids()) AND status IN ('rascunho', 'recebido')
);

DROP POLICY IF EXISTS "Dentist deletes draft orders" ON public.orders;
CREATE POLICY "Dentist deletes draft orders" ON public.orders
FOR DELETE TO authenticated
USING (
  dentist_id IN (SELECT app_private.current_dentist_ids()) AND status = 'rascunho'
);

-- 3. Nova tabela order_files
CREATE TABLE IF NOT EXISTS public.order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome_original text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  tamanho_bytes bigint NOT NULL,
  content_type text,
  enviado_por uuid NOT NULL DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

-- 4. Funções auxiliares SECURITY DEFINER em app_private
CREATE OR REPLACE FUNCTION app_private.get_path_order_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (split_part(p_name, '/', 2))::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_order_files(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
STABLE
AS $$
DECLARE
  v_dentist_id uuid;
  v_lab_id uuid;
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT o.dentist_id, o.lab_id, o.status
  INTO v_dentist_id, v_lab_id, v_status
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 1) Dentista dono do pedido vê (inclusive rascunho)
  IF v_dentist_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dentists d WHERE d.id = v_dentist_id AND d.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  -- Lab e Admin NÃO veem rascunho
  IF v_status = 'rascunho' THEN
    RETURN false;
  END IF;

  -- 2) Membros do laboratório do pedido
  IF EXISTS (
    SELECT 1 FROM public.lab_members lm WHERE lm.lab_id = v_lab_id AND lm.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  -- 3) Admin
  IF app_private.has_role(v_uid, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_insert_order_file(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
STABLE
AS $$
DECLARE
  v_dentist_id uuid;
  v_lab_id uuid;
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT o.dentist_id, o.lab_id, o.status
  INTO v_dentist_id, v_lab_id, v_status
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Dentista dono pode inserir se status for rascunho ou recebido
  IF v_status IN ('rascunho', 'recebido') AND v_dentist_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dentists d WHERE d.id = v_dentist_id AND d.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  -- Membros do laboratório podem inserir em qualquer status menos entregue e rascunho
  IF v_status <> 'entregue' AND v_status <> 'rascunho' AND EXISTS (
    SELECT 1 FROM public.lab_members lm WHERE lm.lab_id = v_lab_id AND lm.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_delete_order_file(p_order_id uuid, p_enviado_por uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
STABLE
AS $$
DECLARE
  v_dentist_id uuid;
  v_lab_id uuid;
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF p_enviado_por IS NOT NULL AND p_enviado_por <> v_uid THEN
    RETURN false;
  END IF;

  SELECT o.dentist_id, o.lab_id, o.status
  INTO v_dentist_id, v_lab_id, v_status
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Dentista dono que enviou pode deletar se status for rascunho ou recebido
  IF v_status IN ('rascunho', 'recebido') AND v_dentist_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dentists d WHERE d.id = v_dentist_id AND d.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  -- Membro do laboratório que enviou pode deletar em qualquer status menos entregue e rascunho
  IF v_status <> 'entregue' AND v_status <> 'rascunho' AND EXISTS (
    SELECT 1 FROM public.lab_members lm WHERE lm.lab_id = v_lab_id AND lm.user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- RLS policies para order_files
DROP POLICY IF EXISTS "Order files select authenticated" ON public.order_files;
CREATE POLICY "Order files select authenticated" ON public.order_files
FOR SELECT TO authenticated
USING (app_private.can_read_order_files(order_id));

DROP POLICY IF EXISTS "Order files insert authenticated" ON public.order_files;
CREATE POLICY "Order files insert authenticated" ON public.order_files
FOR INSERT TO authenticated
WITH CHECK (
  enviado_por = auth.uid()
  AND app_private.can_insert_order_file(order_id)
);

DROP POLICY IF EXISTS "Order files delete authenticated" ON public.order_files;
CREATE POLICY "Order files delete authenticated" ON public.order_files
FOR DELETE TO authenticated
USING (
  enviado_por = auth.uid()
  AND app_private.can_delete_order_file(order_id, enviado_por)
);

GRANT ALL ON TABLE public.order_files TO authenticated, service_role;
GRANT ALL ON TABLE public.order_files TO postgres;

-- 5. Bucket PRIVADO order-files e policies em storage.objects
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-files', 'order-files', false, 52428800, null)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = null;

DROP POLICY IF EXISTS "Storage order files select authenticated" ON storage.objects;
CREATE POLICY "Storage order files select authenticated" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'order-files'
  AND app_private.can_read_order_files(app_private.get_path_order_id(name))
);

DROP POLICY IF EXISTS "Storage order files insert authenticated" ON storage.objects;
CREATE POLICY "Storage order files insert authenticated" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-files'
  AND lower(storage.extension(name)) = ANY (ARRAY['stl', 'ply', 'obj', 'zip', 'jpg', 'jpeg', 'png', 'pdf'])
  AND app_private.can_insert_order_file(app_private.get_path_order_id(name))
);

DROP POLICY IF EXISTS "Storage order files delete authenticated" ON storage.objects;
CREATE POLICY "Storage order files delete authenticated" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'order-files'
  AND app_private.can_delete_order_file(app_private.get_path_order_id(name), coalesce(owner, auth.uid()))
);
