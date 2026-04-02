
CREATE TABLE public.product_page_builder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_page_builder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product page builder config is publicly readable"
  ON public.product_page_builder_config FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage product page builder config"
  ON public.product_page_builder_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

INSERT INTO public.product_page_builder_config (config) VALUES ('{}');
