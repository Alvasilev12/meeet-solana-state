ALTER TABLE public.agent_strategies
  ADD COLUMN IF NOT EXISTS prompt_template text,
  ADD COLUMN IF NOT EXISTS target_class text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchases integer DEFAULT 0;