
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events jsonb DEFAULT '[]'::jsonb,
  secret text NOT NULL,
  status text DEFAULT 'active',
  retry_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  attempt_number integer DEFAULT 1,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access on webhooks" ON public.webhooks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access on webhook_deliveries" ON public.webhook_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_webhooks_agent_id ON public.webhooks (agent_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON public.webhooks (status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON public.webhook_deliveries (created_at DESC);
