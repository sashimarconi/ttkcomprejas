
ALTER TABLE public.order_bumps
  ADD COLUMN IF NOT EXISTS bump_type text NOT NULL DEFAULT 'independent',
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_cart_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_cart_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_to_all boolean NOT NULL DEFAULT true;
