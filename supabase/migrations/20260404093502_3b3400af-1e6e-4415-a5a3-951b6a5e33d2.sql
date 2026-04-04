
CREATE TABLE public.simulation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injected_by UUID NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  intensity INT NOT NULL DEFAULT 5,
  affected_civilizations TEXT[] NOT NULL DEFAULT '{}',
  cascade_result JSONB,
  token_cost FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_simulation_intensity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.intensity < 1 OR NEW.intensity > 10 THEN
    RAISE EXCEPTION 'intensity must be between 1 and 10';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_simulation_intensity
  BEFORE INSERT OR UPDATE ON public.simulation_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_simulation_intensity();

ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read simulation events"
  ON public.simulation_events FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can inject events"
  ON public.simulation_events FOR INSERT
  TO authenticated
  WITH CHECK (injected_by = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_events;
