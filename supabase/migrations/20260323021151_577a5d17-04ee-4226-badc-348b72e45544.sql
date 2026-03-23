
CREATE TABLE IF NOT EXISTS public.user_bots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  bot_token text NOT NULL,
  bot_username text,
  bot_name text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages user_bots" ON public.user_bots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can read their own bots" ON public.user_bots FOR SELECT TO public USING (true);
