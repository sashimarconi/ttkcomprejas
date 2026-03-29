
CREATE TABLE public.tracking_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'tiktok',
  pixel_id text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tracking pixels" ON public.tracking_pixels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Tracking pixels are publicly readable" ON public.tracking_pixels FOR SELECT TO public USING (true);
