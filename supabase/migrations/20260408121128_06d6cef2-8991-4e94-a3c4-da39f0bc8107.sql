
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
  SELECT EXISTS (
    SELECT 1 FROM public.admin_pin
    WHERE user_id = p_user_id
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  ) INTO result;
  RETURN result;
END;
$$;
