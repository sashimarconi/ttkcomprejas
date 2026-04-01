ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS product_page_logo_url text DEFAULT NULL;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS checkout_logo_url text DEFAULT NULL;