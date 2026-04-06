
-- Add IP column to visitor_sessions
ALTER TABLE public.visitor_sessions ADD COLUMN IF NOT EXISTS ip text;

-- Create blocked_ips table
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for blocked_ips
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage blocked IPs"
  ON public.blocked_ips FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Blocked IPs are publicly readable"
  ON public.blocked_ips FOR SELECT TO public
  USING (true);
