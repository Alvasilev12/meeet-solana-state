
-- 1. knowledge_entities table
CREATE TABLE public.knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  description TEXT,
  civilization TEXT,
  impact_score FLOAT DEFAULT 0,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, entity_type)
);

-- Validation trigger for entity_type
CREATE OR REPLACE FUNCTION public.validate_entity_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entity_type NOT IN ('technology', 'researcher', 'organization', 'concept', 'event', 'resource') THEN
    RAISE EXCEPTION 'entity_type must be one of: technology, researcher, organization, concept, event, resource';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_entity_type
  BEFORE INSERT OR UPDATE ON public.knowledge_entities
  FOR EACH ROW EXECUTE FUNCTION public.validate_entity_type();

-- Updated_at trigger
CREATE TRIGGER trg_knowledge_entities_updated
  BEFORE UPDATE ON public.knowledge_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (public read, no anonymous writes)
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read knowledge_entities" ON public.knowledge_entities FOR SELECT USING (true);

-- 2. knowledge_relationships table
CREATE TABLE public.knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID REFERENCES public.knowledge_entities(id) ON DELETE CASCADE NOT NULL,
  target_entity_id UUID REFERENCES public.knowledge_entities(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL,
  strength FLOAT DEFAULT 0.5,
  description TEXT,
  discovered_by_agent UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Validation trigger for relationship fields
CREATE OR REPLACE FUNCTION public.validate_relationship_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.relationship_type NOT IN ('depends_on', 'conflicts_with', 'synergizes_with', 'discovered_by', 'evolves_into', 'part_of', 'enables') THEN
    RAISE EXCEPTION 'Invalid relationship_type';
  END IF;
  NEW.strength := LEAST(GREATEST(COALESCE(NEW.strength, 0.5), 0), 1);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_relationship
  BEFORE INSERT OR UPDATE ON public.knowledge_relationships
  FOR EACH ROW EXECUTE FUNCTION public.validate_relationship_fields();

ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read knowledge_relationships" ON public.knowledge_relationships FOR SELECT USING (true);

-- 3. discovery_entity_links junction table
CREATE TABLE public.discovery_entity_links (
  discovery_id UUID REFERENCES public.discoveries(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES public.knowledge_entities(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (discovery_id, entity_id)
);

ALTER TABLE public.discovery_entity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read discovery_entity_links" ON public.discovery_entity_links FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_ke_civilization ON public.knowledge_entities(civilization);
CREATE INDEX idx_ke_entity_type ON public.knowledge_entities(entity_type);
CREATE INDEX idx_kr_source ON public.knowledge_relationships(source_entity_id);
CREATE INDEX idx_kr_target ON public.knowledge_relationships(target_entity_id);
CREATE INDEX idx_del_entity ON public.discovery_entity_links(entity_id);

-- 4. RPC: get_entity_graph
CREATE OR REPLACE FUNCTION public.get_entity_graph(
  civilization_filter TEXT DEFAULT NULL,
  depth INT DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  WITH root_entities AS (
    SELECT id, name, entity_type, civilization, impact_score, description
    FROM knowledge_entities
    WHERE (civilization_filter IS NULL OR civilization = civilization_filter)
  ),
  related_rels AS (
    SELECT r.id, r.source_entity_id, r.target_entity_id, r.relationship_type, r.strength, r.description
    FROM knowledge_relationships r
    WHERE r.source_entity_id IN (SELECT id FROM root_entities)
       OR r.target_entity_id IN (SELECT id FROM root_entities)
  ),
  nodes AS (
    SELECT json_agg(json_build_object(
      'id', e.id, 'name', e.name, 'type', e.entity_type,
      'civilization', e.civilization, 'impact', e.impact_score,
      'description', e.description
    )) AS data FROM root_entities e
  ),
  edges AS (
    SELECT json_agg(json_build_object(
      'id', r.id, 'source', r.source_entity_id, 'target', r.target_entity_id,
      'type', r.relationship_type, 'strength', r.strength,
      'description', r.description
    )) AS data FROM related_rels r
  )
  SELECT json_build_object('nodes', COALESCE(n.data, '[]'::json), 'edges', COALESCE(e.data, '[]'::json))
  INTO result
  FROM nodes n, edges e;

  RETURN result;
END;
$$;

-- 5. RPC: find_cross_civilization_connections
CREATE OR REPLACE FUNCTION public.find_cross_civilization_connections()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT json_build_object(
      'relationship_id', r.id,
      'source', json_build_object('id', s.id, 'name', s.name, 'civilization', s.civilization, 'type', s.entity_type),
      'target', json_build_object('id', t.id, 'name', t.name, 'civilization', t.civilization, 'type', t.entity_type),
      'relationship_type', r.relationship_type,
      'strength', r.strength
    ) AS row_data
    FROM knowledge_relationships r
    JOIN knowledge_entities s ON s.id = r.source_entity_id
    JOIN knowledge_entities t ON t.id = r.target_entity_id
    WHERE s.civilization IS DISTINCT FROM t.civilization
      AND s.civilization IS NOT NULL
      AND t.civilization IS NOT NULL
    ORDER BY r.strength DESC
    LIMIT 100
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
