ALTER TABLE public.tracking_pixels ADD COLUMN name text DEFAULT '';
ALTER TABLE public.tracking_pixels ADD COLUMN fire_on_paid_only boolean NOT NULL DEFAULT false;