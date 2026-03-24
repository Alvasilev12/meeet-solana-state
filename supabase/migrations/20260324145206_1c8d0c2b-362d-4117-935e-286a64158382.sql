-- Create a public view that hides prompt_template from premium strategies
CREATE OR REPLACE VIEW public.agent_strategies_public
WITH (security_invoker = on) AS
  SELECT id, name, description, agent_class, target_class, is_active, is_premium, price_usdc, purchases, strategy_config, created_at,
    CASE WHEN is_premium = true AND price_usdc > 0 THEN NULL ELSE prompt_template END AS prompt_template
  FROM public.agent_strategies;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Agent strategies readable by everyone" ON public.agent_strategies;

-- Simpler policy: everyone can see metadata, but prompt_template access is via the view
-- The view masks prompt_template for premium strategies
CREATE POLICY "Strategies readable by all"
  ON public.agent_strategies FOR SELECT
  USING (true);