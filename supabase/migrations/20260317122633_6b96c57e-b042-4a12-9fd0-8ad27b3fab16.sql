
-- Fix 1: Alliance messages — only participants can view
DROP POLICY IF EXISTS "Participants can view alliances" ON public.alliances;
CREATE POLICY "Participants can view alliances"
  ON public.alliances FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_a_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_b_id AND agents.user_id = auth.uid())
  );

-- Fix 2: Votes — restrict to authenticated only
DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.votes;
CREATE POLICY "Votes viewable by authenticated"
  ON public.votes FOR SELECT TO authenticated
  USING (true);

-- Fix 3: Agents — restrict to authenticated (user_id still visible but not to anon)
DROP POLICY IF EXISTS "Agents are viewable by everyone" ON public.agents;
CREATE POLICY "Agents viewable by authenticated"
  ON public.agents FOR SELECT TO authenticated
  USING (true);
