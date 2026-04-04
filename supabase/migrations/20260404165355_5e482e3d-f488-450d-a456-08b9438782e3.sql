ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS notification_title_pending text NOT NULL DEFAULT 'Novo Pedido Pendente',
  ADD COLUMN IF NOT EXISTS notification_icon_url_pending text,
  ADD COLUMN IF NOT EXISTS ringtone_pending text NOT NULL DEFAULT 'soft_chime',
  ADD COLUMN IF NOT EXISTS custom_ringtone_url_pending text;