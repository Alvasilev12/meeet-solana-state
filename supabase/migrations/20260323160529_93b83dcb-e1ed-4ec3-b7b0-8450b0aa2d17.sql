
CREATE OR REPLACE FUNCTION public.transfer_meeet(from_agent uuid, to_agent uuid, amount bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ownership check: caller must own the from_agent
  IF NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = from_agent AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to transfer from this agent';
  END IF;

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
$function$;

-- Also revoke public access so only service_role can call directly
REVOKE EXECUTE ON FUNCTION public.transfer_meeet(uuid, uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_meeet(uuid, uuid, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_meeet(uuid, uuid, bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_meeet(uuid, uuid, bigint) TO service_role;
