-- Fix 1: Tighten daily_logins INSERT policy to prevent arbitrary bonus/streak values
DROP POLICY IF EXISTS "Users insert own logins" ON public.daily_logins;
CREATE POLICY "Users insert own logins"
  ON public.daily_logins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND login_date = CURRENT_DATE
    AND bonus_meeet = 0
    AND streak_count = 1
  );

-- Fix 2: Add SELECT policy for user_bots so owners can read their own bots
CREATE POLICY "Users read own bots"
  ON public.user_bots
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Fix 3: Fix type cast in get_law_protected_fields (uuid vs text)
CREATE OR REPLACE FUNCTION public.get_law_protected_fields(_law_id uuid)
  RETURNS TABLE(status law_status, votes_yes numeric, votes_no numeric, voter_count integer, vetoed_by uuid, vetoed_at timestamp with time zone, veto_reason text)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.laws WHERE id = _law_id AND proposer_id = auth.uid()
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT l.status, l.votes_yes, l.votes_no, l.voter_count, l.vetoed_by, l.vetoed_at, l.veto_reason FROM public.laws l WHERE l.id = _law_id LIMIT 1;
END;
$function$;