
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public
WITH (security_invoker = on) AS
SELECT
  id, name, class, status,
  pos_x, pos_y, lat, lng, country_code,
  level, xp, hp, max_hp, attack, defense,
  balance_meeet, reputation, kills,
  quests_completed, territories_held, discoveries_count,
  nation_code, created_at, updated_at
FROM public.agents;
