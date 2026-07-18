
-- Move has_role out of exposed public schema to prevent authenticated users from calling it via PostgREST
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate all policies referencing public.has_role -> app_private.has_role
DROP POLICY IF EXISTS "Admins manage labs" ON public.labs;
CREATE POLICY "Admins manage labs" ON public.labs FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage lab_members" ON public.lab_members;
CREATE POLICY "Admins manage lab_members" ON public.lab_members FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "User views own membership" ON public.lab_members;
CREATE POLICY "User views own membership" ON public.lab_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage dentists" ON public.dentists;
CREATE POLICY "Admins manage dentists" ON public.dentists FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Dentist views self or lab or admin" ON public.dentists;
CREATE POLICY "Dentist views self or lab or admin" ON public.dentists FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Dentist views own orders" ON public.orders;
CREATE POLICY "Dentist views own orders" ON public.orders FOR SELECT TO authenticated
  USING (
    dentist_id IN (SELECT id FROM public.dentists WHERE user_id = auth.uid())
    OR app_private.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Lab updates own orders" ON public.orders;
CREATE POLICY "Lab updates own orders" ON public.orders FOR UPDATE TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    app_private.has_role(auth.uid(), 'admin')
    OR lab_id IN (SELECT lab_id FROM public.lab_members WHERE user_id = auth.uid())
  );

-- Drop the exposed public.has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Prevent privilege escalation: restrict writes on user_roles to admins only
CREATE POLICY "Admins insert user_roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update user_roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete user_roles" ON public.user_roles FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'));
