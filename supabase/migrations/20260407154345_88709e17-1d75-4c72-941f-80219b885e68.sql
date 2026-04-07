
CREATE TABLE public.sara_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  action_ref text NOT NULL,
  risk_score float NOT NULL DEFAULT 0,
  risk_factors jsonb NOT NULL DEFAULT '[]',
  decision text NOT NULL DEFAULT 'allow',
  mode text NOT NULL DEFAULT 'warn_only',
  false_positive boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for decision and mode enums
CREATE OR REPLACE FUNCTION public.validate_sara_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.decision NOT IN ('allow', 'warn', 'block') THEN
    RAISE EXCEPTION 'decision must be allow, warn, or block';
  END IF;
  IF NEW.mode NOT IN ('warn_only', 'enforce') THEN
    RAISE EXCEPTION 'mode must be warn_only or enforce';
  END IF;
  IF NEW.risk_score < 0 OR NEW.risk_score > 1 THEN
    RAISE EXCEPTION 'risk_score must be between 0 and 1';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_sara
  BEFORE INSERT OR UPDATE ON public.sara_assessments
  FOR EACH ROW EXECUTE FUNCTION public.validate_sara_fields();

CREATE INDEX idx_sara_agent_id ON public.sara_assessments(agent_id);
CREATE INDEX idx_sara_created_at ON public.sara_assessments(created_at DESC);
CREATE INDEX idx_sara_decision ON public.sara_assessments(decision);

ALTER TABLE public.sara_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sara assessments"
  ON public.sara_assessments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert sara assessments for own agents"
  ON public.sara_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = sara_assessments.agent_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Users can update false_positive on own agent assessments"
  ON public.sara_assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = sara_assessments.agent_id AND a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = sara_assessments.agent_id AND a.user_id = auth.uid())
  );
