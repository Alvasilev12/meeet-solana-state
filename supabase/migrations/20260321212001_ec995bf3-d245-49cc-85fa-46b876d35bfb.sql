
-- Add for_sale and price columns to discoveries
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS for_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS price bigint NULL DEFAULT NULL;

-- Create transfer_meeet RPC
CREATE OR REPLACE FUNCTION public.transfer_meeet(from_agent uuid, to_agent uuid, amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Deduct from sender
  UPDATE agents SET balance_meeet = balance_meeet - amount
  WHERE id = from_agent AND balance_meeet >= amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or agent not found';
  END IF;

  -- Credit receiver
  UPDATE agents SET balance_meeet = balance_meeet + amount
  WHERE id = to_agent;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receiver agent not found';
  END IF;
END;
$$;
