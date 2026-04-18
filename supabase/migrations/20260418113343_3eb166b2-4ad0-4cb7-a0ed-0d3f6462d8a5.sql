DROP POLICY IF EXISTS "exchange_records_read" ON public.exchange_records;
DROP POLICY IF EXISTS "exchange_records_insert" ON public.exchange_records;

DROP POLICY IF EXISTS "Users can insert own season scores" ON public.season_scores;
DROP POLICY IF EXISTS "Users can update own season scores" ON public.season_scores;

DROP POLICY IF EXISTS "agent_roles_read" ON public.agent_roles;

DROP POLICY IF EXISTS "Authenticated users can create proposals" ON public.agent_hiring_proposals;

DROP POLICY IF EXISTS "Authenticated users can create cortex reports" ON public.cortex_reports;

DROP POLICY IF EXISTS "Users can insert audit logs for own agents" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_owner_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs for their agents" ON public.audit_logs;

DROP POLICY IF EXISTS "Users can insert sara assessments" ON public.sara_assessments;
DROP POLICY IF EXISTS "Users can update sara assessments" ON public.sara_assessments;
DROP POLICY IF EXISTS "sara_assessments_owner_insert" ON public.sara_assessments;
DROP POLICY IF EXISTS "sara_assessments_owner_update" ON public.sara_assessments;

DROP POLICY IF EXISTS "Anyone can read trial agents by session" ON public.trial_agents;
CREATE POLICY "Trial agents readable by own session_id"
  ON public.trial_agents FOR SELECT
  TO anon, authenticated
  USING (
    session_id = COALESCE(
      current_setting('request.headers', true)::json->>'x-trial-session-id',
      ''
    )
  );