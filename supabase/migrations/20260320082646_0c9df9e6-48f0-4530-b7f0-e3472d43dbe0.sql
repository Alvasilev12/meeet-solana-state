-- 1. Fix ghost mode public visibility: hide ghost-mode records from public
DROP POLICY IF EXISTS "Citizenships readable by everyone" ON public.nation_citizenships;

CREATE POLICY "Public can read non-ghost citizenships"
  ON public.nation_citizenships
  FOR SELECT
  TO public
  USING (is_ghost_mode = false);

CREATE POLICY "Agent owners can read own citizenship"
  ON public.nation_citizenships
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = nation_citizenships.agent_id
      AND agents.user_id = auth.uid()
  ));

-- 2. Fix anon user_id exposure: remove anon SELECT on agents table
DROP POLICY IF EXISTS "Anyone can read agents_public" ON public.agents;