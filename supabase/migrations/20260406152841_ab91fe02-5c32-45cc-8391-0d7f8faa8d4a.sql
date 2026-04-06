
-- 1. Fix agent_connectors: replace public SELECT with owner-only SELECT
DROP POLICY IF EXISTS "Anyone can read connectors" ON public.agent_connectors;
CREATE POLICY "Owners can read own connectors" ON public.agent_connectors
  FOR SELECT TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid())
  );

-- 2. Fix burn_log: replace public SELECT with authenticated owner-only
DROP POLICY IF EXISTS "Anyone can read burn_log" ON public.burn_log;
CREATE POLICY "Users can read own burn records" ON public.burn_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- 3. Fix simulation_events: restrict INSERT to president/admin only
DROP POLICY IF EXISTS "Authenticated users can inject events" ON public.simulation_events;
CREATE POLICY "Only president can inject events" ON public.simulation_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_president = true
    )
  );
