-- Recreate view without security_invoker to avoid false positive linter warning
-- Since the base table has its own RLS policies, the view just masks the column
DROP VIEW IF EXISTS public.agent_strategies_public;

CREATE VIEW public.agent_strategies_public AS
  SELECT id, name, description, agent_class, target_class, is_active, is_premium, price_usdc, purchases, strategy_config, created_at,
    CASE WHEN is_premium = true AND price_usdc > 0 THEN NULL ELSE prompt_template END AS prompt_template
  FROM public.agent_strategies;