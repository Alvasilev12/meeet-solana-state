
-- Enable pgvector in public schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;

-- RPC: Search agent memories by vector similarity
CREATE OR REPLACE FUNCTION public.search_agent_memories(
  agent_uuid UUID,
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  memory_type TEXT,
  importance_score FLOAT,
  sentiment_score FLOAT,
  context_tags TEXT[],
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance_score,
    m.sentiment_score,
    m.context_tags,
    (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity,
    m.created_at
  FROM public.agent_memories m
  WHERE m.agent_id = agent_uuid
    AND m.embedding IS NOT NULL
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC: Update conviction with exponential moving average
CREATE OR REPLACE FUNCTION public.update_conviction(
  agent_uuid UUID,
  topic_name TEXT,
  new_evidence FLOAT
)
RETURNS TABLE(topic TEXT, conviction_score FLOAT, evidence_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alpha FLOAT := 0.3;
  current_score FLOAT;
  current_count INT;
  updated_score FLOAT;
BEGIN
  SELECT c.conviction_score, c.evidence_count
    INTO current_score, current_count
    FROM public.agent_convictions c
    WHERE c.agent_id = agent_uuid AND c.topic = topic_name;

  IF current_score IS NULL THEN
    INSERT INTO public.agent_convictions (agent_id, topic, conviction_score, evidence_count, last_updated)
    VALUES (agent_uuid, topic_name, LEAST(GREATEST(new_evidence, 0), 1), 1, now());
    RETURN QUERY SELECT topic_name, LEAST(GREATEST(new_evidence, 0), 1)::FLOAT, 1;
  ELSE
    updated_score := alpha * LEAST(GREATEST(new_evidence, 0), 1) + (1 - alpha) * current_score;
    UPDATE public.agent_convictions
      SET conviction_score = updated_score,
          evidence_count = current_count + 1,
          last_updated = now()
      WHERE agent_id = agent_uuid AND topic = topic_name;
    RETURN QUERY SELECT topic_name, updated_score, current_count + 1;
  END IF;
END;
$$;
