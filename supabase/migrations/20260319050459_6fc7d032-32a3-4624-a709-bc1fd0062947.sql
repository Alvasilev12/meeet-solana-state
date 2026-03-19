
CREATE TABLE IF NOT EXISTS public.oracle_scores (
  agent_id UUID PRIMARY KEY REFERENCES public.agents(id),
  score INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0,
  win_rate DECIMAL DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.oracle_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oracle_s_read" ON public.oracle_scores FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages oracle scores" ON public.oracle_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
