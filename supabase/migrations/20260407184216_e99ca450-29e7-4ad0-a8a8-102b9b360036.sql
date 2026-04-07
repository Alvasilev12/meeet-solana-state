
-- 1. Twitter accounts: block all client access, only service_role
ALTER TABLE public.twitter_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages twitter accounts"
  ON public.twitter_accounts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Block authenticated/anon from reading credentials
CREATE POLICY "No client access to twitter accounts"
  ON public.twitter_accounts FOR SELECT
  TO authenticated, anon USING (false);

-- 2. Twitter queue: service_role only
ALTER TABLE public.twitter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages twitter queue"
  ON public.twitter_queue FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "No client access to twitter queue"
  ON public.twitter_queue FOR SELECT
  TO authenticated, anon USING (false);

-- 3. Fix agent_analytics: scope SELECT to agent owner
DROP POLICY IF EXISTS "Anyone can read analytics" ON public.agent_analytics;

CREATE POLICY "Owners can read own agent analytics"
  ON public.agent_analytics FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
    OR
    agent_id IN (
      SELECT id FROM public.custom_agents WHERE creator_id = auth.uid()
    )
  );

-- 4. Public read for aggregate analytics (no sensitive fields exposed via view)
CREATE OR REPLACE VIEW public.agent_analytics_public AS
  SELECT agent_id, date, conversations, tasks_completed, messages_sent
  FROM public.agent_analytics;
