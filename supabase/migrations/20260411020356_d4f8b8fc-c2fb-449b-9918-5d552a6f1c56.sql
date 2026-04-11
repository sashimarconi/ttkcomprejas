-- Drop the overly permissive public ALL policy
DROP POLICY IF EXISTS "Anyone can upsert visitor sessions" ON public.visitor_sessions;

-- Create a restrictive INSERT policy: public can only insert if user_agent and has_interaction are set
CREATE POLICY "Public can insert verified sessions only"
ON public.visitor_sessions
FOR INSERT
TO public
WITH CHECK (
  user_agent IS NOT NULL
  AND has_interaction = true
);

-- Allow public UPDATE only for rows that already have user_agent (heartbeat updates)
CREATE POLICY "Public can update own verified sessions"
ON public.visitor_sessions
FOR UPDATE
TO public
USING (user_agent IS NOT NULL AND has_interaction = true)
WITH CHECK (user_agent IS NOT NULL AND has_interaction = true);

-- Keep authenticated SELECT as-is (already exists)

-- Delete all junk sessions: no user_agent or no interaction
DELETE FROM public.visitor_sessions
WHERE user_agent IS NULL OR has_interaction = false OR has_interaction IS NULL;

-- Also clean page_events linked to deleted sessions
DELETE FROM public.page_events
WHERE session_id NOT IN (SELECT session_id FROM public.visitor_sessions);