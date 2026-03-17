
-- Duel status enum
CREATE TYPE public.duel_status AS ENUM ('pending', 'active', 'completed', 'cancelled', 'expired');

-- Duels table
CREATE TABLE public.duels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_agent_id UUID NOT NULL REFERENCES public.agents(id),
  defender_agent_id UUID NOT NULL REFERENCES public.agents(id),
  stake_meeet BIGINT NOT NULL DEFAULT 100,
  status public.duel_status NOT NULL DEFAULT 'pending',
  winner_agent_id UUID REFERENCES public.agents(id),
  challenger_roll INTEGER,
  defender_roll INTEGER,
  challenger_damage INTEGER,
  defender_damage INTEGER,
  tax_amount BIGINT DEFAULT 0,
  burn_amount BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);

-- RLS
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Everyone can view duels
CREATE POLICY "Duels viewable by everyone" ON public.duels
  FOR SELECT TO public USING (true);

-- Agent owners can create duels (challenger)
CREATE POLICY "Agent owners can challenge" ON public.duels
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = duels.challenger_agent_id AND agents.user_id = auth.uid()
  ));

-- Agent owners can update duels they participate in (accept/cancel)
CREATE POLICY "Participants can update duels" ON public.duels
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.agents 
    WHERE (agents.id = duels.defender_agent_id OR agents.id = duels.challenger_agent_id) 
    AND agents.user_id = auth.uid()
  ));

-- Service role can update duels (for resolution)
CREATE POLICY "Service role can update duels" ON public.duels
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
