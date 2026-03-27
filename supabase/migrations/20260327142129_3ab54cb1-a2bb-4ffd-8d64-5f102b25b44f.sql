
DROP POLICY IF EXISTS "Service role can insert trade_log" ON public.trade_log;
CREATE POLICY "Service role inserts trade_log" ON public.trade_log FOR INSERT TO service_role WITH CHECK (true);
