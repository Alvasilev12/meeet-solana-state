-- Fix 1: audit_logs — remove public SELECT, restrict to owners + service role
DROP POLICY IF EXISTS "Anyone can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_public_select" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are viewable by everyone" ON public.audit_logs;

CREATE POLICY "Owners read own agent audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = audit_logs.agent_id AND a.user_id = auth.uid()
    )
  );

-- Fix 2: newsletter_subscribers — restrict INSERT to authenticated + rate-limit per IP/user
-- Drop the unrestricted anon INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_anon_subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;

-- Allow only authenticated users to subscribe (their own email implicitly via app logic)
-- Anon subscriptions must now go through an edge function with rate limiting
CREATE POLICY "Authenticated users can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  TO authenticated
  WITH CHECK (true);
