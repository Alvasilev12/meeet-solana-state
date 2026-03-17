
-- 1. Drop old permissive SELECT policy on votes
DROP POLICY IF EXISTS "Votes viewable by authenticated" ON public.votes;

-- 2. Users can only see their own votes
CREATE POLICY "Users can view own votes"
ON public.votes
FOR SELECT
TO authenticated
USING (auth.uid() = voter_id);

-- 3. Service role can read all votes (for tallying in edge functions)
CREATE POLICY "Service role can read all votes"
ON public.votes
FOR SELECT
TO service_role
USING (true);
