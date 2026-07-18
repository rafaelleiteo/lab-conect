
CREATE TYPE public.app_role AS ENUM ('admin', 'lab', 'dentist');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Admins insert user_roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update user_roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete user_roles" ON public.user_roles FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  subdominio text NOT NULL UNIQUE,
  cor_destaque text NOT NULL DEFAULT '#4C5FF5',
  asaas_wallet_id text,
  comissao_percentual numeric NOT NULL DEFAULT 2,
  modo_recebimento text NOT NULL DEFAULT 'plataforma' CHECK (modo_recebimento IN ('plataforma','manual')),
  visivel_diretorio boolean NOT NULL DEFAULT true,
  revisao_status text NOT NULL DEFAULT 'confirmado' CHECK (revisao_status IN ('pendente','confirmado','cancelado')),
  assinatura_status text NOT NULL DEFAULT 'ativa' CHECK (assinatura_status IN ('nao_iniciada','ativa','cancelada')),
  logo_url text,
  asaas_customer_id text,
  asaas_subscription_id text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.labs TO authenticated;
GRANT ALL ON public.labs TO service_role;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lab_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  UNIQUE(user_id, lab_id)
);
GRANT SELECT ON public.lab_members TO authenticated;
GRANT ALL ON public.lab_members TO service_role;
ALTER TABLE public.lab_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own membership" ON public.lab_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage lab_members" ON public.lab_members FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage labs" ON public.labs FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco numeric NOT NULL,
  prazo_dias int NOT NULL DEFAULT 5,
  ativo boolean NOT NULL DEFAULT true,
  arquivos_obrigatorios text[] NOT NULL DEFAULT '{}'::text[],
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dentists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  lab_id uuid REFERENCES public.labs(id) ON DELETE CASCADE,
  cro text,
  uf text,
  revisao_status text NOT NULL DEFAULT 'confirmado' CHECK (revisao_status IN ('pendente','confirmado','cancelado')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dentists TO authenticated;
GRANT ALL ON public.dentists TO service_role;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dentists" ON public.dentists FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Dentist inserts own row" ON public.dentists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND revisao_status <> 'cancelado');
CREATE POLICY "Dentist updates own row" ON public.dentists FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND revisao_status <> 'cancelado')
  WITH CHECK (user_id = auth.uid() AND revisao_status <> 'cancelado');

CREATE TABLE public.dentist_lab_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dentist_id, lab_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentist_lab_links TO authenticated;
GRANT ALL ON public.dentist_lab_links TO service_role;
ALTER TABLE public.dentist_lab_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.current_dentist_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private
AS $$ SELECT d.id FROM public.dentists d WHERE d.user_id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION app_private.current_lab_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private
AS $$ SELECT lm.lab_id FROM public.lab_members lm WHERE lm.user_id = auth.uid(); $$;

CREATE POLICY "Dentist views self or lab or admin" ON public.dentists FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
    OR id IN (SELECT dll.dentist_id FROM public.dentist_lab_links dll WHERE dll.lab_id IN (SELECT app_private.current_lab_ids()))
  );

CREATE POLICY "Labs visible by directory or link or member or admin" ON public.labs FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR id IN (SELECT app_private.current_lab_ids())
    OR id IN (SELECT dll.lab_id FROM public.dentist_lab_links dll WHERE dll.dentist_id IN (SELECT app_private.current_dentist_ids()))
    OR (visivel_diretorio = true AND revisao_status <> 'cancelado'::text AND assinatura_status = 'ativa'::text)
  );

CREATE POLICY "Lab member updates own lab" ON public.labs FOR UPDATE TO authenticated
  USING (id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()) AND revisao_status <> 'cancelado')
  WITH CHECK (id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()) AND revisao_status <> 'cancelado');

CREATE POLICY "Products visible by link or member or admin" ON public.products FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR lab_id IN (SELECT app_private.current_lab_ids())
    OR lab_id IN (SELECT dll.lab_id FROM public.dentist_lab_links dll WHERE dll.dentist_id IN (SELECT app_private.current_dentist_ids()))
  );
CREATE POLICY "Lab manages own products" ON public.products FOR ALL TO authenticated
  USING (lab_id IN (SELECT app_private.current_lab_ids()))
  WITH CHECK (lab_id IN (SELECT app_private.current_lab_ids()));

CREATE POLICY "Dentist views own links or lab or admin" ON public.dentist_lab_links FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR dentist_id IN (SELECT app_private.current_dentist_ids())
    OR lab_id IN (SELECT app_private.current_lab_ids())
  );
CREATE POLICY "Dentist creates own link" ON public.dentist_lab_links FOR INSERT TO authenticated
  WITH CHECK (dentist_id IN (SELECT d.id FROM public.dentists d WHERE d.user_id = auth.uid() AND d.revisao_status <> 'cancelado'::text));
CREATE POLICY "Dentist or lab or admin deletes link" ON public.dentist_lab_links FOR DELETE TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR dentist_id IN (SELECT app_private.current_dentist_ids())
    OR lab_id IN (SELECT app_private.current_lab_ids())
  );

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','producao','cq','pronto','entregue')),
  asaas_payment_id text,
  valor numeric NOT NULL,
  paciente text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dentist views own orders" ON public.orders FOR SELECT TO authenticated
  USING (
    dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    OR app_private.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Dentist creates own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid() AND revisao_status <> 'cancelado')
    AND EXISTS (SELECT 1 FROM public.dentist_lab_links dll WHERE dll.dentist_id = orders.dentist_id AND dll.lab_id = orders.lab_id)
  );
CREATE POLICY "Lab updates own orders" ON public.orders FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin') OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin') OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()));

INSERT INTO public.labs (nome, subdominio, cor_destaque, comissao_percentual, modo_recebimento)
VALUES ('UP Digital', 'updigital', '#4C5FF5', 2, 'plataforma');

INSERT INTO public.products (lab_id, nome, preco, prazo_dias)
SELECT id, 'Coroa em zircônia', 380, 5 FROM public.labs WHERE subdominio = 'updigital';

CREATE POLICY "Public read lab-logos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'lab-logos');
CREATE POLICY "Lab members write own logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lab-logos' AND (split_part(name, '.', 1))::uuid IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()));
CREATE POLICY "Lab members update own logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lab-logos' AND (split_part(name, '.', 1))::uuid IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()));
CREATE POLICY "Lab members delete own logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lab-logos' AND (split_part(name, '.', 1))::uuid IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid()));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
