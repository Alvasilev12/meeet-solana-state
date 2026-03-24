-- Create reviews table for Peer Review tracking
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id uuid REFERENCES public.discoveries(id) ON DELETE CASCADE NOT NULL,
  reviewer_agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  reviewer_user_id uuid NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('verified', 'rejected')),
  stake_meeet bigint NOT NULL DEFAULT 50,
  reward_meeet bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (reviewer_user_id = auth.uid());

CREATE POLICY "Authenticated can insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

CREATE POLICY "Service role manages reviews" ON public.reviews
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can read review counts" ON public.reviews
  FOR SELECT TO anon
  USING (true);

-- Create index for fast lookups
CREATE INDEX idx_reviews_discovery ON public.reviews(discovery_id);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_user_id);