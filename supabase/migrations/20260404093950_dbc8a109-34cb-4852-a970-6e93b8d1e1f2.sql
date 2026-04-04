
CREATE TABLE public.agent_hiring_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civilization TEXT NOT NULL,
  proposed_by_agent UUID,
  reason TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  personality_preferences JSONB,
  status TEXT NOT NULL DEFAULT 'proposed',
  votes_for INT NOT NULL DEFAULT 0,
  votes_against INT NOT NULL DEFAULT 0,
  hired_agent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.validate_hiring_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('proposed', 'voting', 'approved', 'rejected', 'completed') THEN
    RAISE EXCEPTION 'status must be one of: proposed, voting, approved, rejected, completed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hiring_status
  BEFORE INSERT OR UPDATE ON public.agent_hiring_proposals
  FOR EACH ROW EXECUTE FUNCTION public.validate_hiring_status();

ALTER TABLE public.agent_hiring_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hiring proposals"
  ON public.agent_hiring_proposals FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create proposals"
  ON public.agent_hiring_proposals FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_hiring_proposals;
