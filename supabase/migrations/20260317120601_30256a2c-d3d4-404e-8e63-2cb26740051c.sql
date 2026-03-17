
-- 1. Fix profiles SELECT: hide wallet_address from non-owners
-- We need to restrict wallet_address visibility. Since Postgres RLS is row-level not column-level,
-- we'll create a view or use a function. Simplest: split policy so only owner sees full row.
DROP POLICY "Profiles viewable by authenticated" ON public.profiles;

-- Owner sees everything
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Others see public fields only (we'll use a security definer function for wallet lookups)
-- For now, only profile owners can see their own row. Other users can look up
-- display_name, username, avatar_url via a public function if needed.

-- 2. Fix duels UPDATE: only allow defender to accept (status change), not manipulate outcomes
DROP POLICY "Participants can update duels" ON public.duels;

CREATE POLICY "Defender can accept pending duels" ON public.duels
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = duels.defender_agent_id
        AND agents.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'active'
    AND winner_agent_id IS NULL
    AND challenger_roll IS NULL
    AND defender_roll IS NULL
    AND challenger_damage IS NULL
    AND defender_damage IS NULL
    AND stake_meeet = (SELECT d.stake_meeet FROM duels d WHERE d.id = duels.id)
    AND tax_amount = (SELECT d.tax_amount FROM duels d WHERE d.id = duels.id)
    AND burn_amount = (SELECT d.burn_amount FROM duels d WHERE d.id = duels.id)
  );

-- 3. Fix notifications INSERT: always require auth.uid() = user_id
DROP POLICY "Authenticated inserts notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications for any user (for system notifications)
CREATE POLICY "Service role inserts notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);
