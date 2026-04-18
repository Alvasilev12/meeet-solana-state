-- Hot-path indexes for homepage stats, leaderboards, and feeds
CREATE INDEX IF NOT EXISTS idx_agents_nation_code ON public.agents(nation_code) WHERE nation_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_country_code ON public.agents(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_sector ON public.agents(sector) WHERE sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_reputation_desc ON public.agents(reputation DESC);
CREATE INDEX IF NOT EXISTS idx_agents_created_at_desc ON public.agents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_world_events_created_at_desc ON public.world_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at_desc ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_agent_id ON public.activity_feed(agent_id) WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_id_ts ON public.audit_logs(agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at_desc ON public.agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to_agent ON public.agent_messages(to_agent_id) WHERE to_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_created ON public.agent_actions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_burn_log_created_at_desc ON public.burn_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);