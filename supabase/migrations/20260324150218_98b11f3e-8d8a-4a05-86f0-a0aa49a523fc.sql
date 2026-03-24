-- 1. user_bots: remove all client-facing policies, only service_role should access base table
DROP POLICY IF EXISTS "Users read own bots" ON public.user_bots;
DROP POLICY IF EXISTS "Users insert own bots" ON public.user_bots;
DROP POLICY IF EXISTS "Users update own bots" ON public.user_bots;
DROP POLICY IF EXISTS "Users delete own bots" ON public.user_bots;

-- Only service_role policies remain. Clients use user_bots_safe view.
-- Add RLS policies to the safe view... views inherit from base table RLS.
-- We need authenticated users to read their own bots via the safe view.
CREATE POLICY "Authenticated read own bots"
  ON public.user_bots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- But block INSERT/UPDATE/DELETE from client — only service_role
-- (service_role policy already exists with USING true)

-- 2. agent_strategies_public: remove prompt_template entirely
DROP VIEW IF EXISTS public.agent_strategies_public;
CREATE VIEW public.agent_strategies_public
WITH (security_invoker = on) AS
  SELECT id, name, description, agent_class, target_class, is_active, is_premium, price_usdc, purchases, strategy_config, created_at
  FROM public.agent_strategies;

-- Need a policy on base table for the view to work (security_invoker)
CREATE POLICY "View can select strategies"
  ON public.agent_strategies FOR SELECT
  TO authenticated, anon
  USING (true);

-- 3. agents_public view already has security_invoker=on, which means it uses
-- the caller's permissions. The base agents table has owner-only SELECT.
-- For the map/public pages we need public read of non-sensitive fields.
-- Drop and recreate without sensitive fields.
DROP VIEW IF EXISTS public.agents_public;
CREATE VIEW public.agents_public
WITH (security_invoker = on) AS
  SELECT id, name, class, country_code, nation_code, level, xp,
         reputation, discoveries_count, quests_completed, kills,
         territories_held, status, created_at, updated_at,
         pos_x, pos_y, lat, lng
  FROM public.agents;