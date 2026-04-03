
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON public.product_images (product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_active ON public.reviews (product_id, active);
CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON public.store_products (store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON public.store_products (product_id);
CREATE INDEX IF NOT EXISTS idx_review_products_product_id ON public.review_products (product_id);
CREATE INDEX IF NOT EXISTS idx_review_products_review_id ON public.review_products (review_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen ON public.visitor_sessions (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_page_events_created_at ON public.page_events (created_at);
CREATE INDEX IF NOT EXISTS idx_variant_groups_product_id ON public.variant_groups (product_id);
