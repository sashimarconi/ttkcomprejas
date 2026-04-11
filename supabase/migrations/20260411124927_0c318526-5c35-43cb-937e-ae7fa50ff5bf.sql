
-- Drop existing INSERT and UPDATE policies
DROP POLICY IF EXISTS "allow_public_insert_visitor_sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "allow_public_update_visitor_sessions" ON public.visitor_sessions;

-- Recreate with TO public (matches ALL roles, same as page_events)
CREATE POLICY "allow_public_insert_visitor_sessions"
ON public.visitor_sessions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "allow_public_update_visitor_sessions"
ON public.visitor_sessions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
