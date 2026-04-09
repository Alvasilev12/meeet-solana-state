
-- Quest definitions table
CREATE TABLE public.quest_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  reward_meeet INTEGER NOT NULL DEFAULT 0,
  quest_type TEXT NOT NULL DEFAULT 'daily',
  category TEXT,
  required_progress INTEGER NOT NULL DEFAULT 1,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest definitions"
  ON public.quest_definitions FOR SELECT
  USING (true);

-- User quests tracking table
CREATE TABLE public.user_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_definition_id UUID NOT NULL REFERENCES public.quest_definitions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_definition_id, assigned_date)
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests"
  ON public.user_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests"
  ON public.user_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests"
  ON public.user_quests FOR UPDATE
  USING (auth.uid() = user_id);
