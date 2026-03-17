
-- Fix reputation_log: remove public INSERT, only service_role should insert
DROP POLICY IF EXISTS "System can insert rep log" ON public.reputation_log;
CREATE POLICY "Service role can insert rep log"
  ON public.reputation_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
