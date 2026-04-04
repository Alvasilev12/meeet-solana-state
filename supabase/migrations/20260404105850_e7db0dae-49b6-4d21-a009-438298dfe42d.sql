
-- Agent analytics table
CREATE TABLE public.agent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  date DATE NOT NULL,
  conversations INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  satisfaction_score NUMERIC DEFAULT 0,
  estimated_hours_saved NUMERIC DEFAULT 0,
  estimated_cost_saved NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, date)
);

ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analytics" ON public.agent_analytics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners manage analytics" ON public.agent_analytics
  FOR INSERT TO authenticated
  WITH CHECK (
    agent_id IN (SELECT id FROM public.custom_agents WHERE creator_id = auth.uid())
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- ROI Summary RPC
CREATE OR REPLACE FUNCTION public.get_agent_roi_summary(agent_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  total_conversations BIGINT;
  total_tasks BIGINT;
  total_tokens BIGINT;
  total_hours NUMERIC;
  total_cost NUMERIC;
  avg_satisfaction NUMERIC;
  avg_response NUMERIC;
  recent_convos BIGINT;
  prev_convos BIGINT;
  trend_pct NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(conversations), 0),
    COALESCE(SUM(tasks_completed), 0),
    COALESCE(SUM(tokens_used), 0),
    COALESCE(SUM(estimated_hours_saved), 0),
    COALESCE(SUM(estimated_cost_saved), 0),
    COALESCE(AVG(NULLIF(satisfaction_score, 0)), 0),
    COALESCE(AVG(NULLIF(avg_response_time_ms, 0)), 0)
  INTO total_conversations, total_tasks, total_tokens, total_hours, total_cost, avg_satisfaction, avg_response
  FROM agent_analytics WHERE agent_id = agent_uuid;

  SELECT COALESCE(SUM(conversations), 0) INTO recent_convos
  FROM agent_analytics WHERE agent_id = agent_uuid AND date >= CURRENT_DATE - 7;

  SELECT COALESCE(SUM(conversations), 0) INTO prev_convos
  FROM agent_analytics WHERE agent_id = agent_uuid AND date >= CURRENT_DATE - 14 AND date < CURRENT_DATE - 7;

  IF prev_convos > 0 THEN
    trend_pct := ROUND(((recent_convos - prev_convos)::NUMERIC / prev_convos) * 100, 1);
  ELSE
    trend_pct := CASE WHEN recent_convos > 0 THEN 100 ELSE 0 END;
  END IF;

  result := json_build_object(
    'total_conversations', total_conversations,
    'total_tasks', total_tasks,
    'total_tokens', total_tokens,
    'total_hours_saved', ROUND(total_hours, 1),
    'total_cost_saved', ROUND(total_cost, 2),
    'avg_satisfaction', ROUND(avg_satisfaction, 2),
    'avg_response_ms', ROUND(avg_response),
    'trend_pct', trend_pct,
    'recent_7d_convos', recent_convos,
    'prev_7d_convos', prev_convos
  );

  RETURN result;
END;
$$;
