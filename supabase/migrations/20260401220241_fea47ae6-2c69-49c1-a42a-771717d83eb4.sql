
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  product_id UUID,
  product_variant TEXT,
  total NUMERIC,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert abandoned carts" ON public.abandoned_carts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can manage abandoned carts" ON public.abandoned_carts FOR ALL TO authenticated USING (true) WITH CHECK (true);
