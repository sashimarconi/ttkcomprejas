ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS ringtone text NOT NULL DEFAULT 'cash_register',
  ADD COLUMN IF NOT EXISTS custom_ringtone_url text,
  ADD COLUMN IF NOT EXISTS notification_title text NOT NULL DEFAULT 'Venda Realizada',
  ADD COLUMN IF NOT EXISTS notification_icon_url text;