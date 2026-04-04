ALTER TABLE public.push_subscriptions 
  ADD COLUMN IF NOT EXISTS device_label text DEFAULT 'Dispositivo',
  ADD COLUMN IF NOT EXISTS notify_paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pending boolean NOT NULL DEFAULT true;