
-- Fix agents_public view
DROP VIEW IF EXISTS public.agents_public;
CREATE VIEW public.agents_public WITH (security_invoker = true) AS
  SELECT id, name, class, country_code, nation_code, level, xp, reputation,
    discoveries_count, quests_completed, kills, territories_held, status,
    created_at, updated_at, pos_x, pos_y, lat, lng, balance_meeet,
    hp, max_hp, attack, defense
  FROM agents;

-- Fix marketplace_listings_public view
DROP VIEW IF EXISTS public.marketplace_listings_public;
CREATE VIEW public.marketplace_listings_public WITH (security_invoker = true) AS
  SELECT id, agent_id, price_meeet, price_usdc, description, status,
    is_active, created_at, updated_at, sold_at, buyer_id
  FROM agent_marketplace_listings
  WHERE is_active = true;

-- Fix user_bots_safe view
DROP VIEW IF EXISTS public.user_bots_safe;
CREATE VIEW public.user_bots_safe WITH (security_invoker = true) AS
  SELECT id, user_id, agent_id, bot_username, bot_name, status, created_at, updated_at
  FROM user_bots;

-- Fix agent_strategies_public view
DROP VIEW IF EXISTS public.agent_strategies_public;
CREATE VIEW public.agent_strategies_public WITH (security_invoker = true) AS
  SELECT id, name, description, agent_class, target_class, is_active,
    is_premium, price_usdc, purchases, strategy_config, created_at
  FROM agent_strategies;
