
-- Add missing columns to reputation_log
ALTER TABLE public.reputation_log 
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'discovery_verified',
  ADD COLUMN IF NOT EXISTS reputation_delta INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_after INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bayesian_mu DOUBLE PRECISION DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS bayesian_sigma DOUBLE PRECISION DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS economic_score DOUBLE PRECISION DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reputation_log_created_at ON public.reputation_log(created_at DESC);
