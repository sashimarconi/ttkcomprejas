
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Store settings table
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Minha Loja',
  avatar_url TEXT,
  total_sales TEXT DEFAULT '0',
  rating NUMERIC(2,1) DEFAULT 4.9,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store settings are publicly readable"
  ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update store settings"
  ON public.store_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert store settings"
  ON public.store_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default store settings
INSERT INTO public.store_settings (name, avatar_url, total_sales, rating)
VALUES ('Loja Brinox Oficial', null, '35.4K', 4.9);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  promo_tag TEXT,
  flash_sale BOOLEAN DEFAULT false,
  flash_sale_ends_in TEXT,
  free_shipping BOOLEAN DEFAULT true,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  estimated_delivery TEXT,
  checkout_type TEXT NOT NULL DEFAULT 'external' CHECK (checkout_type IN ('external', 'pix')),
  external_checkout_url TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage products"
  ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product images table
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are publicly readable"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage product images"
  ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product variants are publicly readable"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage product variants"
  ON public.product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,
  city TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  review_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage reviews"
  ON public.reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trust badges / services table
CREATE TABLE public.trust_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'shield',
  color TEXT DEFAULT 'blue',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trust badges are publicly readable"
  ON public.trust_badges FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage trust badges"
  ON public.trust_badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default trust badges
INSERT INTO public.trust_badges (title, description, icon, color, sort_order) VALUES
  ('Devolução gratuita', 'Devolução gratuita em até 15 dias', 'undo-2', 'green', 1),
  ('Pagamento seguro', 'Transação 100% protegida', 'shield-check', 'blue', 2),
  ('Cupom por atraso', 'Receba cupom se atrasar', 'clock', 'orange', 3),
  ('Cupom por perda/dano', 'Cupom se houver dano', 'package-check', 'red', 4);

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
