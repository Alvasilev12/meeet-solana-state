
-- Fix the security definer view warning by using security_invoker
CREATE OR REPLACE VIEW public.agents_public
WITH (security_invoker = true)
AS
SELECT
  id, name, class, status,
  pos_x, pos_y,
  level, kills, hp, max_hp, attack, defense,
  quests_completed, territories_held,
  created_at, updated_at
FROM public.agents;
