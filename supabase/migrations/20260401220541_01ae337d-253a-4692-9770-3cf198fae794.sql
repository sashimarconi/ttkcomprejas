
CREATE TABLE public.review_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, product_id)
);

ALTER TABLE public.review_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review products are publicly readable" ON public.review_products FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage review products" ON public.review_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
