
-- Page events for analytics tracking
CREATE TABLE public.page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'page_view',
  page_url text,
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events
CREATE POLICY "Anyone can insert page events" ON public.page_events
  FOR INSERT TO public WITH CHECK (true);

-- Only authenticated can read
CREATE POLICY "Authenticated users can read page events" ON public.page_events
  FOR SELECT TO authenticated USING (true);

-- Visitor sessions for online tracking
CREATE TABLE public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  page_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can upsert visitor sessions" ON public.visitor_sessions
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read visitor sessions" ON public.visitor_sessions
  FOR SELECT TO authenticated USING (true);
