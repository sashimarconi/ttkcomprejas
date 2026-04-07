ALTER TABLE public.visitor_sessions 
  ADD COLUMN IF NOT EXISTS fingerprint_hash text DEFAULT null,
  ADD COLUMN IF NOT EXISTS has_interaction boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_score integer DEFAULT 0;