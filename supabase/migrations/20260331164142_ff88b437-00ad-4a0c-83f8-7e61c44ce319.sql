
-- Create variant_groups table
CREATE TABLE public.variant_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variant_groups ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Variant groups are publicly readable" ON public.variant_groups
  FOR SELECT TO public USING (true);

-- Auth manage
CREATE POLICY "Authenticated users can manage variant groups" ON public.variant_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add variant_group_id to product_variants (nullable for backward compat)
ALTER TABLE public.product_variants ADD COLUMN variant_group_id UUID REFERENCES public.variant_groups(id) ON DELETE CASCADE;
