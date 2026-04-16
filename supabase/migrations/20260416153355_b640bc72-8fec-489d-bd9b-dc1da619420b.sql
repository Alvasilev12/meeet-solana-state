-- Allow anonymous users to read agents (via agents_public view)
CREATE POLICY "Anyone can view agents via public view"
ON public.agents
FOR SELECT
TO anon
USING (true);

-- Also allow authenticated users to see ALL agents (not just own)
DROP POLICY IF EXISTS "Users can view own agents" ON public.agents;
CREATE POLICY "Authenticated users can view all agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);