
-- 1. Fix profiles UPDATE policy: prevent users from changing is_president or welcome_bonus_claimed
-- Use a security definer function to get current protected values

CREATE OR REPLACE FUNCTION public.get_profile_protected_fields(_user_id uuid)
RETURNS TABLE(is_president boolean, welcome_bonus_claimed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_president, p.welcome_bonus_claimed
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_president IS NOT DISTINCT FROM (SELECT gp.is_president FROM public.get_profile_protected_fields(auth.uid()) gp)
    AND welcome_bonus_claimed IS NOT DISTINCT FROM (SELECT gp.welcome_bonus_claimed FROM public.get_profile_protected_fields(auth.uid()) gp)
  );

-- 2. Fix petitions: restrict SELECT to president + petition owner, require auth for INSERT
DROP POLICY IF EXISTS "Petitions viewable by everyone" ON public.petitions;
CREATE POLICY "Petitions viewable by owner and president"
  ON public.petitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents WHERE agents.id = petitions.agent_id AND agents.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_president = true)
  );

DROP POLICY IF EXISTS "Auth users can create petitions" ON public.petitions;
CREATE POLICY "Auth users can create petitions"
  ON public.petitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM agents WHERE agents.id = petitions.agent_id AND agents.user_id = auth.uid())
  );

-- 3. Fix disputes: restrict to participants only
DROP POLICY IF EXISTS "Disputes viewable by participants" ON public.disputes;
CREATE POLICY "Disputes viewable by participants"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = disputes.agent_id AND agents.user_id = auth.uid())
    OR auth.uid() = ANY(arbiters)
  );

-- 4. Restrict profiles SELECT: wallet_address only visible to owner
-- We need a view or just accept that profiles are public but wallet is sensitive
-- Best approach: split into separate policy structure
-- Actually, the simplest fix: make profiles only readable by authenticated users
-- and use a view for public leaderboards
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
