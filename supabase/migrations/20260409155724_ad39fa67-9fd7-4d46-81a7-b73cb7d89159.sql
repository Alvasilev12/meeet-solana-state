
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  theme_gradient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT
  USING (true);

CREATE TABLE public.season_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, agent_id)
);

ALTER TABLE public.season_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season scores"
  ON public.season_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own season scores"
  ON public.season_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own season scores"
  ON public.season_scores FOR UPDATE
  USING (auth.uid() = user_id);
