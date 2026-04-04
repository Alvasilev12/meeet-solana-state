
CREATE TABLE public.agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT DEFAULT 'bot',
  base_system_prompt TEXT NOT NULL,
  default_personality JSONB,
  suggested_skills TEXT[] DEFAULT '{}',
  required_integrations TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  popularity INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_template_difficulty()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.difficulty NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'difficulty must be beginner, intermediate, or advanced';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_template_difficulty
BEFORE INSERT OR UPDATE ON public.agent_templates
FOR EACH ROW EXECUTE FUNCTION public.validate_template_difficulty();

CREATE TABLE public.custom_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  template_id UUID REFERENCES public.agent_templates(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  personality JSONB,
  skills TEXT[] DEFAULT '{}',
  knowledge_base TEXT,
  tone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'ru',
  max_tokens INT DEFAULT 2000,
  temperature NUMERIC DEFAULT 0.7,
  is_published BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  total_conversations INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_custom_agent_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tone IS NOT NULL AND NEW.tone NOT IN ('professional', 'friendly', 'casual', 'formal', 'witty') THEN
    RAISE EXCEPTION 'Invalid tone';
  END IF;
  IF NEW.status NOT IN ('draft', 'testing', 'active', 'paused') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  NEW.temperature := LEAST(GREATEST(COALESCE(NEW.temperature, 0.7), 0.1), 1.0);
  NEW.max_tokens := LEAST(GREATEST(COALESCE(NEW.max_tokens, 2000), 100), 8000);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_custom_agent
BEFORE INSERT OR UPDATE ON public.custom_agents
FOR EACH ROW EXECUTE FUNCTION public.validate_custom_agent_fields();

-- RLS
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON public.agent_templates FOR SELECT USING (true);
CREATE POLICY "Users can view own custom agents" ON public.custom_agents FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Users can create custom agents" ON public.custom_agents FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Users can update own custom agents" ON public.custom_agents FOR UPDATE TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Users can delete own custom agents" ON public.custom_agents FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE INDEX idx_custom_agents_creator ON public.custom_agents(creator_id);
CREATE INDEX idx_custom_agents_template ON public.custom_agents(template_id);
CREATE INDEX idx_agent_templates_category ON public.agent_templates(category);
