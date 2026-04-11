
-- Drop ALL existing insert/update policies on visitor_sessions to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visitor_sessions'
      AND cmd IN ('INSERT', 'UPDATE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.visitor_sessions', pol.policyname);
  END LOOP;
END;
$$;

-- Recreate permissive INSERT policy for anonymous visitors
CREATE POLICY "allow_public_insert_visitor_sessions"
ON public.visitor_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Recreate permissive UPDATE policy for anonymous visitors
CREATE POLICY "allow_public_update_visitor_sessions"
ON public.visitor_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
