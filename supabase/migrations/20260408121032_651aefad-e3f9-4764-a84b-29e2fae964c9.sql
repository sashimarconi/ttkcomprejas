
-- 1. Trigger function to auto-log ANY change to gateway_settings
CREATE OR REPLACE FUNCTION public.audit_gateway_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  detail_json jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'created';
    detail_json := jsonb_build_object(
      'gateway_name', NEW.gateway_name,
      'active', NEW.active
    );
    INSERT INTO public.gateway_audit_log (gateway_name, action, details, performed_by, ip_address)
    VALUES (NEW.gateway_name, action_name, detail_json, auth.uid(), current_setting('request.headers', true)::json->>'x-forwarded-for');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    detail_json := '{}'::jsonb;
    IF OLD.public_key IS DISTINCT FROM NEW.public_key THEN
      detail_json := detail_json || '{"public_key_changed": true}'::jsonb;
    END IF;
    IF OLD.secret_key IS DISTINCT FROM NEW.secret_key THEN
      detail_json := detail_json || '{"secret_key_changed": true}'::jsonb;
    END IF;
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      detail_json := detail_json || jsonb_build_object('active_changed', true, 'new_active', NEW.active);
    END IF;
    action_name := CASE
      WHEN OLD.public_key IS DISTINCT FROM NEW.public_key OR OLD.secret_key IS DISTINCT FROM NEW.secret_key THEN 'keys_updated'
      WHEN OLD.active IS DISTINCT FROM NEW.active AND NEW.active = true THEN 'activated'
      WHEN OLD.active IS DISTINCT FROM NEW.active AND NEW.active = false THEN 'deactivated'
      ELSE 'updated'
    END;
    INSERT INTO public.gateway_audit_log (gateway_name, action, details, performed_by, ip_address)
    VALUES (NEW.gateway_name, action_name, detail_json, auth.uid(), current_setting('request.headers', true)::json->>'x-forwarded-for');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    action_name := 'deleted';
    detail_json := jsonb_build_object('gateway_name', OLD.gateway_name);
    INSERT INTO public.gateway_audit_log (gateway_name, action, details, performed_by, ip_address)
    VALUES (OLD.gateway_name, action_name, detail_json, auth.uid(), current_setting('request.headers', true)::json->>'x-forwarded-for');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. Attach the trigger
DROP TRIGGER IF EXISTS trg_audit_gateway_settings ON public.gateway_settings;
CREATE TRIGGER trg_audit_gateway_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_gateway_settings_change();

-- 3. Lock down gateway_settings: remove the permissive ALL policy and replace with read-only for authenticated
DROP POLICY IF EXISTS "Authenticated users can manage gateway settings" ON public.gateway_settings;

CREATE POLICY "Authenticated users can read gateway settings"
  ON public.gateway_settings FOR SELECT
  TO authenticated
  USING (true);

-- 4. Allow only service_role to write (Edge Functions use service_role)
CREATE POLICY "Service role can manage gateway settings"
  ON public.gateway_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
