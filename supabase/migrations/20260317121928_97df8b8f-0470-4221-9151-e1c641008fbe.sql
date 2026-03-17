
-- Fix laws UPDATE: lock vote counts and status from client manipulation
-- Need a security definer function to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_law_protected_fields(_law_id uuid)
RETURNS TABLE(status public.law_status, votes_yes numeric, votes_no numeric, voter_count integer, vetoed_by uuid, vetoed_at timestamptz, veto_reason text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.status, l.votes_yes, l.votes_no, l.voter_count, l.vetoed_by, l.vetoed_at, l.veto_reason
  FROM public.laws l
  WHERE l.id = _law_id
  LIMIT 1;
$$;

-- Drop and recreate the policy with WITH CHECK
DROP POLICY IF EXISTS "Proposer can update own law" ON public.laws;
CREATE POLICY "Proposer can update own law"
  ON public.laws FOR UPDATE TO public
  USING (auth.uid() = proposer_id)
  WITH CHECK (
    auth.uid() = proposer_id
    AND status = (SELECT f.status FROM get_law_protected_fields(laws.id) f)
    AND votes_yes = (SELECT f.votes_yes FROM get_law_protected_fields(laws.id) f)
    AND votes_no = (SELECT f.votes_no FROM get_law_protected_fields(laws.id) f)
    AND voter_count = (SELECT f.voter_count FROM get_law_protected_fields(laws.id) f)
    AND vetoed_by IS NOT DISTINCT FROM (SELECT f.vetoed_by FROM get_law_protected_fields(laws.id) f)
    AND vetoed_at IS NOT DISTINCT FROM (SELECT f.vetoed_at FROM get_law_protected_fields(laws.id) f)
    AND veto_reason IS NOT DISTINCT FROM (SELECT f.veto_reason FROM get_law_protected_fields(laws.id) f)
  );

-- Allow service_role to update laws freely (for edge functions)
DROP POLICY IF EXISTS "Service role can update laws" ON public.laws;
CREATE POLICY "Service role can update laws"
  ON public.laws FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
