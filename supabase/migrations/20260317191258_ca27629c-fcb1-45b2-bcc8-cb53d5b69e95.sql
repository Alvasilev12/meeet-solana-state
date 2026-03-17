-- Raid claims table for Twitter campaign verification
CREATE TABLE public.raid_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  twitter_handle text NOT NULL,
  proof_url text,
  proof_text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reward_meeet bigint NOT NULL DEFAULT 1000,
  campaign_tag text NOT NULL DEFAULT 'twitter_raid_v1',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One claim per user per campaign
CREATE UNIQUE INDEX uq_raid_claims_user_campaign ON public.raid_claims (user_id, campaign_tag);

-- One claim per twitter handle per campaign
CREATE UNIQUE INDEX uq_raid_claims_handle_campaign ON public.raid_claims (lower(twitter_handle), campaign_tag);

-- Index for president to review pending claims
CREATE INDEX idx_raid_claims_status ON public.raid_claims (status, created_at);

-- Enable RLS
ALTER TABLE public.raid_claims ENABLE ROW LEVEL SECURITY;

-- Users can read their own claims
CREATE POLICY "Users can read own claims"
ON public.raid_claims FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own claims
CREATE POLICY "Users can submit claims"
ON public.raid_claims FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- President reads all claims (via edge function with service_role)
-- No direct UPDATE policy for users — all approvals go through edge function

-- Track counts
CREATE OR REPLACE FUNCTION public.get_raid_campaign_stats(_campaign_tag text)
RETURNS TABLE(total_claims bigint, approved_claims bigint, pending_claims bigint, total_rewarded bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total_claims,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved_claims,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending_claims,
    COALESCE(SUM(reward_meeet) FILTER (WHERE status = 'approved'), 0)::bigint AS total_rewarded
  FROM public.raid_claims
  WHERE campaign_tag = _campaign_tag;
$$;

-- Updated_at trigger
CREATE TRIGGER update_raid_claims_updated_at
  BEFORE UPDATE ON public.raid_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();