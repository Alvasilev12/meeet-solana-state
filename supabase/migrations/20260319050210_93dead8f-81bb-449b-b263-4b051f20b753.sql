
-- SaaS agent plans and strategies tables
CREATE TABLE IF NOT EXISTS public.agent_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_usdc NUMERIC DEFAULT 0,
  quests_per_day INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agent_class TEXT DEFAULT 'warrior',
  price_usdc NUMERIC DEFAULT 0,
  strategy_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent plans readable by everyone" ON public.agent_plans FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages agent plans" ON public.agent_plans FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Agent strategies readable by everyone" ON public.agent_strategies FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages agent strategies" ON public.agent_strategies FOR ALL TO service_role USING (true) WITH CHECK (true);
