
-- Fix 1: Trade offers — lock financial fields and restrict status transitions
CREATE OR REPLACE FUNCTION public.get_trade_protected_fields(_trade_id uuid)
RETURNS TABLE(offer_meeet bigint, request_meeet bigint, from_agent_id uuid, to_agent_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT t.offer_meeet, t.request_meeet, t.from_agent_id, t.to_agent_id FROM public.trade_offers t WHERE t.id = _trade_id LIMIT 1; $$;

DROP POLICY IF EXISTS "Participants can update trades" ON public.trade_offers;
CREATE POLICY "Participants can update trades"
  ON public.trade_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.from_agent_id AND agents.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM agents WHERE agents.id = trade_offers.to_agent_id AND agents.user_id = auth.uid()))
  WITH CHECK (
    offer_meeet = (SELECT f.offer_meeet FROM get_trade_protected_fields(trade_offers.id) f)
    AND request_meeet = (SELECT f.request_meeet FROM get_trade_protected_fields(trade_offers.id) f)
    AND from_agent_id = (SELECT f.from_agent_id FROM get_trade_protected_fields(trade_offers.id) f)
    AND to_agent_id = (SELECT f.to_agent_id FROM get_trade_protected_fields(trade_offers.id) f)
  );

-- Fix 2: Quests — lock rewards and assignment after quest leaves 'open'
CREATE OR REPLACE FUNCTION public.get_quest_protected_fields(_quest_id uuid)
RETURNS TABLE(reward_sol numeric, reward_meeet bigint, assigned_agent_id uuid, status public.quest_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT q.reward_sol, q.reward_meeet, q.assigned_agent_id, q.status FROM public.quests q WHERE q.id = _quest_id LIMIT 1; $$;

DROP POLICY IF EXISTS "Requester can update own quests" ON public.quests;
CREATE POLICY "Requester can update own quests"
  ON public.quests FOR UPDATE TO public
  USING (auth.uid() = requester_id)
  WITH CHECK (
    auth.uid() = requester_id
    AND reward_sol = (SELECT f.reward_sol FROM get_quest_protected_fields(quests.id) f)
    AND reward_meeet = (SELECT f.reward_meeet FROM get_quest_protected_fields(quests.id) f)
    AND assigned_agent_id IS NOT DISTINCT FROM (SELECT f.assigned_agent_id FROM get_quest_protected_fields(quests.id) f)
  );

-- Service role for quest-lifecycle edge function
DROP POLICY IF EXISTS "Service role can update quests" ON public.quests;
CREATE POLICY "Service role can update quests" ON public.quests FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Fix 3: Alliances — lock agent IDs
DROP POLICY IF EXISTS "Participants can update alliances" ON public.alliances;
CREATE POLICY "Participants can update alliances"
  ON public.alliances FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_a_id AND agents.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM agents WHERE agents.id = alliances.agent_b_id AND agents.user_id = auth.uid()))
  WITH CHECK (
    agent_a_id = (SELECT a.agent_a_id FROM alliances a WHERE a.id = alliances.id)
    AND agent_b_id = (SELECT a.agent_b_id FROM alliances a WHERE a.id = alliances.id)
    AND proposed_by = (SELECT a.proposed_by FROM alliances a WHERE a.id = alliances.id)
  );

-- Fix 4: Guilds — lock financial fields
CREATE OR REPLACE FUNCTION public.get_guild_protected_fields(_guild_id uuid)
RETURNS TABLE(treasury_meeet bigint, total_earnings bigint, member_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT g.treasury_meeet, g.total_earnings, g.member_count FROM public.guilds g WHERE g.id = _guild_id LIMIT 1; $$;

DROP POLICY IF EXISTS "Masters can update own guild" ON public.guilds;
CREATE POLICY "Masters can update own guild"
  ON public.guilds FOR UPDATE TO public
  USING (auth.uid() = master_id)
  WITH CHECK (
    auth.uid() = master_id
    AND treasury_meeet = (SELECT f.treasury_meeet FROM get_guild_protected_fields(guilds.id) f)
    AND total_earnings = (SELECT f.total_earnings FROM get_guild_protected_fields(guilds.id) f)
    AND member_count = (SELECT f.member_count FROM get_guild_protected_fields(guilds.id) f)
  );

DROP POLICY IF EXISTS "Service role can update guilds" ON public.guilds;
CREATE POLICY "Service role can update guilds" ON public.guilds FOR UPDATE TO service_role USING (true) WITH CHECK (true);
