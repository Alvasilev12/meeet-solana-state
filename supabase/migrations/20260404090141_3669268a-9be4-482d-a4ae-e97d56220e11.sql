
-- Add OCEAN personality columns to agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS personality_openness FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS personality_conscientiousness FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS personality_extraversion FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS personality_agreeableness FLOAT DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS personality_neuroticism FLOAT DEFAULT 0.5;

-- Seed personality values based on agent class with slight randomization
-- Oracle (Quantum): highest openness, moderate neuroticism
UPDATE public.agents SET
  personality_openness = 0.85 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.7 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.4 + (random() * 0.15 - 0.075),
  personality_agreeableness = 0.5 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.55 + (random() * 0.1 - 0.05)
WHERE class = 'oracle';

-- Miner (Energy): lower neuroticism, higher extraversion
UPDATE public.agents SET
  personality_openness = 0.6 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.65 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.8 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.55 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.25 + (random() * 0.1 - 0.05)
WHERE class = 'miner';

-- Banker (Biotech): higher agreeableness and conscientiousness
UPDATE public.agents SET
  personality_openness = 0.6 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.8 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.5 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.8 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.35 + (random() * 0.1 - 0.05)
WHERE class = 'banker';

-- Diplomat (AI Core): higher openness and conscientiousness
UPDATE public.agents SET
  personality_openness = 0.75 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.75 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.65 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.7 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.3 + (random() * 0.1 - 0.05)
WHERE class = 'diplomat';

-- Warrior (Space): higher extraversion, lower agreeableness
UPDATE public.agents SET
  personality_openness = 0.65 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.6 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.8 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.35 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.45 + (random() * 0.1 - 0.05)
WHERE class = 'warrior';

-- Trader: balanced with higher conscientiousness
UPDATE public.agents SET
  personality_openness = 0.6 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.75 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.6 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.45 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.4 + (random() * 0.1 - 0.05)
WHERE class = 'trader';

-- President: charismatic leader profile
UPDATE public.agents SET
  personality_openness = 0.75 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.85 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.9 + (random() * 0.05 - 0.025),
  personality_agreeableness = 0.6 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.2 + (random() * 0.1 - 0.05)
WHERE class = 'president';

-- Scout: explorer profile
UPDATE public.agents SET
  personality_openness = 0.8 + (random() * 0.1 - 0.05),
  personality_conscientiousness = 0.5 + (random() * 0.1 - 0.05),
  personality_extraversion = 0.7 + (random() * 0.1 - 0.05),
  personality_agreeableness = 0.4 + (random() * 0.1 - 0.05),
  personality_neuroticism = 0.35 + (random() * 0.1 - 0.05)
WHERE class = 'scout';

-- Validation trigger for personality scores
CREATE OR REPLACE FUNCTION public.validate_personality_scores()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.personality_openness := LEAST(GREATEST(COALESCE(NEW.personality_openness, 0.5), 0), 1);
  NEW.personality_conscientiousness := LEAST(GREATEST(COALESCE(NEW.personality_conscientiousness, 0.5), 0), 1);
  NEW.personality_extraversion := LEAST(GREATEST(COALESCE(NEW.personality_extraversion, 0.5), 0), 1);
  NEW.personality_agreeableness := LEAST(GREATEST(COALESCE(NEW.personality_agreeableness, 0.5), 0), 1);
  NEW.personality_neuroticism := LEAST(GREATEST(COALESCE(NEW.personality_neuroticism, 0.5), 0), 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_personality ON public.agents;
CREATE TRIGGER trg_validate_personality
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.validate_personality_scores();
