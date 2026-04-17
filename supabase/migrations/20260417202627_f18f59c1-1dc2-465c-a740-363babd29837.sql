-- Fix 1: Newsletter subscribers — remove redundant unconstrained INSERT policies, keep validated one, explicitly deny client SELECT
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_anon_subscribe" ON public.newsletter_subscribers;

-- Explicitly block any client (anon/authenticated) from reading subscriber emails / unsubscribe tokens
DROP POLICY IF EXISTS "Block client read of subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Block client read of subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- Block client UPDATE/DELETE (only service_role manages)
DROP POLICY IF EXISTS "Block client update of subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Block client update of subscribers"
  ON public.newsletter_subscribers
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client delete of subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Block client delete of subscribers"
  ON public.newsletter_subscribers
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- Fix 2: realtime.messages — add policies restricting Realtime channel subscriptions to authenticated users
-- and lock down arbitrary topic access. Supabase Realtime checks RLS on realtime.messages for authorization.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive broadcasts"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can send broadcasts"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);