-- 1. AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs are publicly readable" ON public.audit_logs;
DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Anyone can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "Audit logs viewable by agent owner"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = audit_logs.agent_id AND a.user_id = auth.uid()
  )
);

-- 2. AGENT_ROLES
ALTER TABLE public.agent_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agent roles are publicly readable" ON public.agent_roles;
DROP POLICY IF EXISTS "Public read agent_roles" ON public.agent_roles;
DROP POLICY IF EXISTS "Anyone can view agent roles" ON public.agent_roles;

CREATE POLICY "Agent roles viewable by agent owner"
ON public.agent_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_roles.agent_id AND a.user_id = auth.uid()
  )
);

-- 3. NEWSLETTER_SUBSCRIBERS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Newsletter subscribers are publicly readable" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public read newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe with valid email"
ON public.newsletter_subscribers FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) <= 254
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 4. TRIAL_AGENTS
ALTER TABLE public.trial_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trial agents are publicly readable" ON public.trial_agents;
DROP POLICY IF EXISTS "Public read trial_agents" ON public.trial_agents;
DROP POLICY IF EXISTS "Anyone can view trial agents" ON public.trial_agents;

-- 5. EXCHANGE_RECORDS: lock down writes (records are crypto proofs, kept readable)
ALTER TABLE public.exchange_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert exchange records" ON public.exchange_records;
DROP POLICY IF EXISTS "Public insert exchange_records" ON public.exchange_records;
DROP POLICY IF EXISTS "Anyone can update exchange records" ON public.exchange_records;
DROP POLICY IF EXISTS "Anyone can delete exchange records" ON public.exchange_records;
