-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create daily analytics summary table
CREATE TABLE public.daily_analytics_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  checkout_views INTEGER NOT NULL DEFAULT 0,
  pix_generated INTEGER NOT NULL DEFAULT 0,
  paid_orders INTEGER NOT NULL DEFAULT 0,
  pending_orders INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  sessions_by_location JSONB NOT NULL DEFAULT '[]'::jsonb,
  pages_visited JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can read
CREATE POLICY "Authenticated users can read analytics summary"
ON public.daily_analytics_summary
FOR SELECT
TO authenticated
USING (true);

-- Service role can manage (for the cleanup function)
CREATE POLICY "Service role can manage analytics summary"
ON public.daily_analytics_summary
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for fast date lookups
CREATE INDEX idx_daily_analytics_summary_date ON public.daily_analytics_summary (summary_date);