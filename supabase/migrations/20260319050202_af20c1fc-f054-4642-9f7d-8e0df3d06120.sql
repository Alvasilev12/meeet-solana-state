
-- Oracle prediction market tables
CREATE TABLE IF NOT EXISTS public.oracle_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  creator_agent_id UUID REFERENCES public.agents(id),
  status TEXT DEFAULT 'open',
  deadline TIMESTAMPTZ NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  total_pool_meeet BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oracle_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.oracle_questions(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) NOT NULL,
  user_id UUID NOT NULL,
  prediction BOOLEAN NOT NULL,
  amount_meeet BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.oracle_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Oracle questions readable by everyone" ON public.oracle_questions FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages oracle questions" ON public.oracle_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can create oracle questions" ON public.oracle_questions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Oracle bets readable by everyone" ON public.oracle_bets FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can place bets" ON public.oracle_bets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role manages oracle bets" ON public.oracle_bets FOR ALL TO service_role USING (true) WITH CHECK (true);
