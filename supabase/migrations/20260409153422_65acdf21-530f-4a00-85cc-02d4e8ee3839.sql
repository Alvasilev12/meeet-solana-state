CREATE TABLE public.trial_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  converted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_agents ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors)
CREATE POLICY "Anyone can create trial agents"
  ON public.trial_agents FOR INSERT
  WITH CHECK (true);

-- Anyone can read their own session's trial agents
CREATE POLICY "Anyone can read trial agents by session"
  ON public.trial_agents FOR SELECT
  USING (true);

-- Index for session lookups
CREATE INDEX idx_trial_agents_session ON public.trial_agents (session_id);