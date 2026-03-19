
-- Agent subscriptions
CREATE TABLE IF NOT EXISTS public.agent_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  plan_id UUID REFERENCES public.agent_plans(id),
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deployed agents tracking
CREATE TABLE IF NOT EXISTS public.deployed_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  strategy_id UUID REFERENCES public.agent_strategies(id),
  plan_id UUID REFERENCES public.agent_plans(id),
  status TEXT DEFAULT 'running',
  deployed_at TIMESTAMPTZ DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  total_earned_meeet BIGINT DEFAULT 0,
  quests_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_usdc NUMERIC DEFAULT 0,
  amount_sol NUMERIC DEFAULT 0,
  amount_meeet BIGINT DEFAULT 0,
  payment_method TEXT DEFAULT 'sol',
  reference_type TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'completed',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent earnings
CREATE TABLE IF NOT EXISTS public.agent_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) NOT NULL,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  amount_meeet BIGINT DEFAULT 0,
  quest_id UUID REFERENCES public.quests(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent impact metrics
CREATE TABLE IF NOT EXISTS public.agent_impact (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  period TEXT DEFAULT 'daily',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agent_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployed_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_impact ENABLE ROW LEVEL SECURITY;

-- RLS policies: users read own data, service_role manages all
CREATE POLICY "Users read own subscriptions" ON public.agent_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages subscriptions" ON public.agent_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users read own deployed agents" ON public.deployed_agents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages deployed agents" ON public.deployed_agents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users read own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users read own earnings" ON public.agent_earnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages earnings" ON public.agent_earnings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Agent impact readable by everyone" ON public.agent_impact FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages impact" ON public.agent_impact FOR ALL TO service_role USING (true) WITH CHECK (true);
