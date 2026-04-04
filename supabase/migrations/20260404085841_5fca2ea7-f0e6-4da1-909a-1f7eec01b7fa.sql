
-- Add new columns to existing agent_memories table
ALTER TABLE public.agent_memories
  ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'episodic',
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS related_agent_id UUID REFERENCES public.agents(id),
  ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
  ADD COLUMN IF NOT EXISTS context_tags TEXT[],
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS importance_score FLOAT DEFAULT 0.5;

-- Backfill importance_score from existing importance column
UPDATE public.agent_memories
  SET importance_score = LEAST(GREATEST(COALESCE(importance::float / 10.0, 0.5), 0), 1)
  WHERE importance_score = 0.5 AND importance IS NOT NULL AND importance != 5;

-- Validation trigger for memory fields
CREATE OR REPLACE FUNCTION public.validate_memory_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.memory_type NOT IN ('episodic', 'semantic', 'relational') THEN
    RAISE EXCEPTION 'memory_type must be episodic, semantic, or relational';
  END IF;
  IF NEW.importance_score IS NOT NULL AND (NEW.importance_score < 0 OR NEW.importance_score > 1) THEN
    RAISE EXCEPTION 'importance_score must be between 0 and 1';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_memory_type ON public.agent_memories;
CREATE TRIGGER trg_validate_memory_type
  BEFORE INSERT OR UPDATE ON public.agent_memories
  FOR EACH ROW EXECUTE FUNCTION public.validate_memory_type();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON public.agent_memories(agent_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON public.agent_memories(agent_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_expires ON public.agent_memories(expires_at) WHERE expires_at IS NOT NULL;

-- Create agent_convictions table
CREATE TABLE IF NOT EXISTS public.agent_convictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  conviction_score FLOAT DEFAULT 0.5,
  evidence_count INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, topic)
);

CREATE OR REPLACE FUNCTION public.validate_conviction_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.conviction_score < 0 OR NEW.conviction_score > 1 THEN
    RAISE EXCEPTION 'conviction_score must be between 0 and 1';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_conviction_score ON public.agent_convictions;
CREATE TRIGGER trg_validate_conviction_score
  BEFORE INSERT OR UPDATE ON public.agent_convictions
  FOR EACH ROW EXECUTE FUNCTION public.validate_conviction_score();

CREATE INDEX IF NOT EXISTS idx_convictions_agent ON public.agent_convictions(agent_id);
CREATE INDEX IF NOT EXISTS idx_convictions_topic ON public.agent_convictions(agent_id, topic);

ALTER TABLE public.agent_convictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read convictions" ON public.agent_convictions
  FOR SELECT USING (true);

CREATE POLICY "Service can manage convictions" ON public.agent_convictions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
