
DROP VIEW IF EXISTS public.agent_analytics_public;

CREATE VIEW public.agent_analytics_public
WITH (security_invoker = true) AS
  SELECT agent_id, date, conversations, tasks_completed, messages_sent
  FROM public.agent_analytics;
