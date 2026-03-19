ALTER TABLE public.oracle_questions
  ADD COLUMN IF NOT EXISTS yes_pool bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_pool bigint NOT NULL DEFAULT 0;