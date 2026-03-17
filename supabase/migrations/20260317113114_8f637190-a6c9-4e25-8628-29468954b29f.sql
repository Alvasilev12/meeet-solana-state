
-- Fix petitions INSERT policy: restrict to authenticated users only
DROP POLICY IF EXISTS "Auth users can create petitions" ON public.petitions;
CREATE POLICY "Auth users can create petitions"
  ON public.petitions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
