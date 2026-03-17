
-- Fix 1: Remove dangerous public INSERT on transactions
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

-- Fix 2: Guard get_profile_protected_fields — used internally by RLS WITH CHECK
-- Cannot restrict to auth.uid() because the UPDATE policy itself calls it with auth.uid()
-- But we can prevent RPC abuse by making it only callable internally
-- Actually the function IS used in WITH CHECK with auth.uid(), so let's just
-- ensure external RPC calls are guarded
CREATE OR REPLACE FUNCTION public.get_profile_protected_fields(_user_id uuid)
RETURNS TABLE(is_president boolean, welcome_bonus_claimed boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow querying own data (RLS policies pass auth.uid() as _user_id)
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;
  
  RETURN QUERY
    SELECT p.is_president, p.welcome_bonus_claimed
    FROM public.profiles p
    WHERE p.user_id = _user_id
    LIMIT 1;
END;
$$;
