-- Allow service_role to delete old page_events
CREATE POLICY "Service role can delete page events"
ON public.page_events
FOR DELETE
TO service_role
USING (true);

-- Allow service_role to delete old visitor_sessions
CREATE POLICY "Service role can delete visitor sessions"
ON public.visitor_sessions
FOR DELETE
TO service_role
USING (true);