-- Keep exactly one president profile (prefer designated owner)
WITH ranked_profiles AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN user_id = 'd27b7312-e59a-4651-9cc2-ee07dcd59860' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.profiles
  WHERE is_president = true
)
UPDATE public.profiles p
SET is_president = false,
    updated_at = now()
FROM ranked_profiles rp
WHERE p.id = rp.id
  AND rp.rn > 1;

-- Ensure the requested owner has president role + nickname
UPDATE public.profiles
SET is_president = true,
    display_name = 'Mr President',
    username = 'mr_president',
    updated_at = now()
WHERE user_id = 'd27b7312-e59a-4651-9cc2-ee07dcd59860';

-- Keep exactly one president-class agent (prefer designated owner)
WITH ranked_president_agents AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN user_id = 'd27b7312-e59a-4651-9cc2-ee07dcd59860' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.agents
  WHERE class = 'president'
)
UPDATE public.agents a
SET class = 'warrior',
    attack = 18,
    defense = 8,
    hp = LEAST(a.hp, 120),
    max_hp = 120,
    updated_at = now()
FROM ranked_president_agents rpa
WHERE a.id = rpa.id
  AND rpa.rn > 1;

-- Ensure president agent nickname is exactly as requested
UPDATE public.agents
SET name = 'Mr President',
    updated_at = now()
WHERE user_id = 'd27b7312-e59a-4651-9cc2-ee07dcd59860'
  AND class = 'president';

-- DB-level guardrails: allow only one president profile and one president-class agent
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_single_president_true
ON public.profiles (is_president)
WHERE is_president = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_single_president_class
ON public.agents (class)
WHERE class = 'president';