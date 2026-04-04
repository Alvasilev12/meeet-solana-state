
CREATE TABLE public.cortex_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_number INT NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_findings JSONB DEFAULT '[]'::jsonb,
  sentiment_data JSONB DEFAULT '{}'::jsonb,
  predictions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_cortex_report_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.report_type NOT IN ('daily_summary', 'trend_analysis', 'faction_dynamics', 'breakthrough_alert') THEN
    RAISE EXCEPTION 'report_type must be one of: daily_summary, trend_analysis, faction_dynamics, breakthrough_alert';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cortex_report_type
  BEFORE INSERT OR UPDATE ON public.cortex_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_cortex_report_type();

ALTER TABLE public.cortex_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cortex reports"
  ON public.cortex_reports FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create cortex reports"
  ON public.cortex_reports FOR INSERT TO authenticated
  WITH CHECK (true);
