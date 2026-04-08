
-- 1. Create role enum and table FIRST
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 2. Insert admin BEFORE enabling RLS
INSERT INTO public.user_roles (user_id, role)
VALUES ('348d0d45-2185-4954-8561-377a99cb6f07', 'admin');

-- 3. Now create the function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Enable RLS and add policies on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages roles"
ON public.user_roles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 5. Lock down admin_pin
DROP POLICY IF EXISTS "Users can insert own pin" ON public.admin_pin;
DROP POLICY IF EXISTS "Users can update own pin" ON public.admin_pin;
DROP POLICY IF EXISTS "Users can view own pin" ON public.admin_pin;

CREATE POLICY "Admins can view own pin"
ON public.admin_pin FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert own pin"
ON public.admin_pin FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own pin"
ON public.admin_pin FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Lock down gateway_settings
DROP POLICY IF EXISTS "Authenticated users can read gateway settings" ON public.gateway_settings;

CREATE POLICY "Admins can read gateway settings"
ON public.gateway_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. Lock down gateway_audit_log
DROP POLICY IF EXISTS "Authenticated users can insert gateway audit logs" ON public.gateway_audit_log;
DROP POLICY IF EXISTS "Authenticated users can read gateway audit logs" ON public.gateway_audit_log;

CREATE POLICY "Admins can read gateway audit logs"
ON public.gateway_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert gateway audit logs"
ON public.gateway_audit_log FOR INSERT TO service_role
WITH CHECK (true);

-- 8. Update set_admin_pin
CREATE OR REPLACE FUNCTION public.set_admin_pin(p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem definir PIN';
  END IF;
  INSERT INTO public.admin_pin (user_id, pin_hash)
  VALUES (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')), updated_at = now();
END;
$$;

-- 9. Update verify_admin_pin
CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pin
    WHERE user_id = auth.uid()
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  ) INTO result;
  RETURN result;
END;
$$;

-- 10. Update verify_admin_pin_for_user
CREATE OR REPLACE FUNCTION public.verify_admin_pin_for_user(p_user_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  IF NOT public.has_role(p_user_id, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pin
    WHERE user_id = p_user_id
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  ) INTO result;
  RETURN result;
END;
$$;
