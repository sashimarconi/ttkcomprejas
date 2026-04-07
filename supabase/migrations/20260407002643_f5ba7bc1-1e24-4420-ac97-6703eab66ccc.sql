ALTER TABLE public.visitor_sessions ADD COLUMN IF NOT EXISTS user_agent text DEFAULT null;
UPDATE public.visitor_sessions SET is_bot = false;