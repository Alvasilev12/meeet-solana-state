
CREATE TABLE IF NOT EXISTS public.trade_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  sol_amount numeric NOT NULL DEFAULT 0,
  meeet_amount numeric NOT NULL DEFAULT 0,
  tx_signature text,
  price numeric,
  status text DEFAULT 'completed',
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trade_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trade_log" ON public.trade_log FOR SELECT USING (true);
CREATE POLICY "Service role can insert trade_log" ON public.trade_log FOR INSERT WITH CHECK (true);
