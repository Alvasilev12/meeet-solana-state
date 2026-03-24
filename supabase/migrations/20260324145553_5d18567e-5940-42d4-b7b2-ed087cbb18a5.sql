-- Drop the insecure public-readable policy on user_bots (bot_token exposed!)
DROP POLICY IF EXISTS "Users can read their own bots" ON public.user_bots;

-- Add delete policy for authenticated users
CREATE POLICY "Users delete own bots"
  ON public.user_bots FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);