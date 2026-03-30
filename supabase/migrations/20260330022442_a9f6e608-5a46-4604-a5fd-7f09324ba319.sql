
-- Create stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create junction table for store-product many-to-many
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Stores policies
CREATE POLICY "Stores are publicly readable" ON public.stores FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage stores" ON public.stores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store products policies
CREATE POLICY "Store products are publicly readable" ON public.store_products FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage store products" ON public.store_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
