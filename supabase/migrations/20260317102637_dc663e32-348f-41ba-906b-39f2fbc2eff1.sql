-- State treasury: single-row table tracking the nation's funds
CREATE TABLE public.state_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_meeet numeric NOT NULL DEFAULT 1000000,
  balance_sol numeric NOT NULL DEFAULT 0,
  total_tax_collected numeric NOT NULL DEFAULT 0,
  total_burned numeric NOT NULL DEFAULT 0,
  total_quest_payouts numeric NOT NULL DEFAULT 0,
  total_passport_revenue numeric NOT NULL DEFAULT 0,
  total_land_revenue numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert initial treasury
INSERT INTO public.state_treasury (balance_meeet) VALUES (1000000);

-- RLS: everyone can read, only president can update (via edge functions)
ALTER TABLE public.state_treasury ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treasury is viewable by everyone"
  ON public.state_treasury FOR SELECT
  TO authenticated
  USING (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_treasury_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER treasury_updated_at
  BEFORE UPDATE ON public.state_treasury
  FOR EACH ROW EXECUTE FUNCTION public.update_treasury_timestamp();