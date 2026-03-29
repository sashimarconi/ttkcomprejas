
CREATE TABLE public.gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name text NOT NULL DEFAULT 'blackcatpay',
  public_key text,
  secret_key text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage gateway settings" ON public.gateway_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_gateway_settings_updated_at BEFORE UPDATE ON public.gateway_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.shipping_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  estimated_days text,
  price numeric NOT NULL DEFAULT 0,
  free boolean DEFAULT false,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping options are publicly readable" ON public.shipping_options FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage shipping options" ON public.shipping_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.order_bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  price numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order bumps are publicly readable" ON public.order_bumps FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage order bumps" ON public.order_bumps FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  product_variant text,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL,
  shipping_cost numeric DEFAULT 0,
  shipping_option_id uuid REFERENCES public.shipping_options(id),
  bumps_total numeric DEFAULT 0,
  total numeric NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_document text NOT NULL,
  payment_method text NOT NULL DEFAULT 'pix',
  payment_status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  pix_qr_code text,
  pix_copy_paste text,
  pix_qr_code_base64 text,
  pix_expires_at timestamptz,
  selected_bumps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Orders can be created by anyone" ON public.orders FOR INSERT TO public WITH CHECK (true);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
