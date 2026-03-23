
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price bigint NOT NULL DEFAULT 0,
  category text DEFAULT 'utility',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace items readable by everyone" ON public.marketplace_items FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages marketplace items" ON public.marketplace_items FOR ALL TO service_role USING (true) WITH CHECK (true);
