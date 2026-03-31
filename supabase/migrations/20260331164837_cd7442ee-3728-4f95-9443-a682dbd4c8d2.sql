
CREATE TABLE public.order_bump_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_bump_id UUID NOT NULL REFERENCES public.order_bumps(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_bump_id, product_id)
);

ALTER TABLE public.order_bump_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order bump products are publicly readable" ON public.order_bump_products
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage order bump products" ON public.order_bump_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
