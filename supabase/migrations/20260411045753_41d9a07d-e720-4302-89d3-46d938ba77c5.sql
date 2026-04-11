
DROP POLICY IF EXISTS "Public can insert verified sessions only" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Public can update own verified sessions" ON public.visitor_sessions;

CREATE POLICY "Public can insert visitor sessions"
ON public.visitor_sessions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
