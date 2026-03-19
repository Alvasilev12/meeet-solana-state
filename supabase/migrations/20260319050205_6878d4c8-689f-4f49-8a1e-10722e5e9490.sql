
-- Warnings system tables
CREATE TABLE IF NOT EXISTS public.warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  region TEXT NOT NULL,
  country_code TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  source_data JSONB,
  confirming_agents_count INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warning_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warning_id UUID REFERENCES public.warnings(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) NOT NULL,
  vote TEXT NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warning_id, agent_id)
);

ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warning_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warnings readable by everyone" ON public.warnings FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages warnings" ON public.warnings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Warning votes readable by everyone" ON public.warning_votes FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages warning votes" ON public.warning_votes FOR ALL TO service_role USING (true) WITH CHECK (true);
