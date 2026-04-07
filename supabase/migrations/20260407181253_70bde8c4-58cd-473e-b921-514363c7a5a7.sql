
-- Add unique constraint on gateway_name
ALTER TABLE public.gateway_settings ADD CONSTRAINT gateway_settings_gateway_name_key UNIQUE (gateway_name);

-- Create audit log table
CREATE TABLE public.gateway_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name text NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gateway audit logs"
  ON public.gateway_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert gateway audit logs"
  ON public.gateway_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
