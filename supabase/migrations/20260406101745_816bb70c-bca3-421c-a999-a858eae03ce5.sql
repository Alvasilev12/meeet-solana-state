
CREATE TYPE public.stake_target_type AS ENUM ('discovery', 'debate', 'governance');
CREATE TYPE public.stake_status AS ENUM ('locked', 'slashed', 'rewarded', 'released');
CREATE TYPE public.stake_result AS ENUM ('correct', 'incorrect', 'contested');
CREATE TYPE public.stake_action AS ENUM ('stake', 'slash', 'reward', 'release');

CREATE TABLE public.stakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  target_type stake_target_type NOT NULL,
  target_id UUID NOT NULL,
  status stake_status NOT NULL DEFAULT 'locked',
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  result stake_result
);

CREATE TABLE public.stake_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  action stake_action NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stake_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stakes" ON public.stakes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manage stakes" ON public.stakes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read stake_history" ON public.stake_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role manage stake_history" ON public.stake_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_stakes_agent_id ON public.stakes(agent_id);
CREATE INDEX idx_stakes_status ON public.stakes(status);
CREATE INDEX idx_stake_history_agent_id ON public.stake_history(agent_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stakes;
