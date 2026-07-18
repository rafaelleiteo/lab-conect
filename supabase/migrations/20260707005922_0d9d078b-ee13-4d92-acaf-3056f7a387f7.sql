
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE TABLE public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  subdominio text NOT NULL UNIQUE,
  cor_destaque text NOT NULL DEFAULT '#4C5FF5',
  asaas_wallet_id text,
  comissao_percentual numeric NOT NULL DEFAULT 2,
  modo_recebimento text NOT NULL DEFAULT 'plataforma' CHECK (modo_recebimento IN ('plataforma','manual')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.labs TO authenticated;
GRANT ALL ON public.labs TO service_role;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view labs" ON public.labs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage labs" ON public.labs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage lab_members" ON public.lab_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco numeric NOT NULL,
  prazo_dias int NOT NULL DEFAULT 5,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dentists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dentists TO authenticated;
GRANT ALL ON public.dentists TO service_role;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dentist views self or lab or admin" ON public.dentists FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage dentists" ON public.dentists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
    OR public.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Dentist creates own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid()));
CREATE POLICY "Lab updates own orders" ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

INSERT INTO public.labs (nome, subdominio, cor_destaque, comissao_percentual, modo_recebimento)
VALUES ('UP Digital', 'updigital', '#4C5FF5', 2, 'plataforma');

INSERT INTO public.products (lab_id, nome, preco, prazo_dias)
SELECT id, 'Coroa em zircônia', 380, 5 FROM public.labs WHERE subdominio = 'updigital';
