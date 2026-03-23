
-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text DEFAULT 'upcoming',
  prize_pool bigint DEFAULT 0,
  max_participants integer DEFAULT 32,
  current_participants integer DEFAULT 0,
  winner_agent_id uuid REFERENCES public.agents(id),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments readable by everyone" ON public.tournaments FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages tournaments" ON public.tournaments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Agent stakes table
CREATE TABLE IF NOT EXISTS public.agent_stakes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  user_id uuid NOT NULL,
  amount_meeet bigint DEFAULT 0,
  reward_earned bigint DEFAULT 0,
  staked_at timestamptz DEFAULT now(),
  unstaked_at timestamptz,
  status text DEFAULT 'active'
);

ALTER TABLE public.agent_stakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own stakes" ON public.agent_stakes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role manages stakes" ON public.agent_stakes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lottery draws table
CREATE TABLE IF NOT EXISTS public.lottery_draws (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date date DEFAULT CURRENT_DATE,
  jackpot bigint DEFAULT 0,
  winner_agent_id uuid REFERENCES public.agents(id),
  winner_name text,
  ticket_count integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lottery draws readable by everyone" ON public.lottery_draws FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages lottery" ON public.lottery_draws FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Academy steps table
CREATE TABLE IF NOT EXISTS public.academy_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.agents(id) NOT NULL,
  course_name text NOT NULL,
  step_number integer DEFAULT 1,
  stat_boost text,
  boost_value integer DEFAULT 1,
  completed_at timestamptz DEFAULT now(),
  cost_meeet bigint DEFAULT 50
);

ALTER TABLE public.academy_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Academy steps readable by everyone" ON public.academy_steps FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages academy" ON public.academy_steps FOR ALL TO service_role USING (true) WITH CHECK (true);
