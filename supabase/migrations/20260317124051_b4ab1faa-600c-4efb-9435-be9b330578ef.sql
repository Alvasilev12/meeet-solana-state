-- Fix: lock status and completed_at in quests UPDATE policy
DROP POLICY IF EXISTS "Requester can update own quests" ON public.quests;

CREATE POLICY "Requester can update own quests" ON public.quests
  FOR UPDATE TO public
  USING (auth.uid() = requester_id)
  WITH CHECK (
    auth.uid() = requester_id
    AND reward_sol = (SELECT f.reward_sol FROM get_quest_protected_fields(quests.id) f)
    AND reward_meeet = (SELECT f.reward_meeet FROM get_quest_protected_fields(quests.id) f)
    AND NOT (assigned_agent_id IS DISTINCT FROM (SELECT f.assigned_agent_id FROM get_quest_protected_fields(quests.id) f))
    AND status = (SELECT f.status FROM get_quest_protected_fields(quests.id) f)
  );