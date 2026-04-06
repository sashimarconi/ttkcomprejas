
CREATE TABLE public.admin_pin (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_pin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pin" ON public.admin_pin
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pin" ON public.admin_pin
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pin" ON public.admin_pin
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

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
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pin
    WHERE user_id = auth.uid()
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_pin(p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_pin (user_id, pin_hash)
  VALUES (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')), updated_at = now();
END;
$$;
