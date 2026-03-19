
ALTER TABLE public.oracle_bets
  ADD COLUMN IF NOT EXISTS is_winner boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payout_meeet bigint DEFAULT 0;
