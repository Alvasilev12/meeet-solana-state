-- 1) season_scores
DROP POLICY IF EXISTS "season_scores_owner_write" ON public.season_scores;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='season_scores' AND policyname='season_scores_service_write') THEN
    CREATE POLICY "season_scores_service_write" ON public.season_scores
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2) user_bots: revoke column-level read of secrets, expose safe view
REVOKE SELECT (bot_token, webhook_secret) ON public.user_bots FROM authenticated, anon;

GRANT SELECT (id, user_id, agent_id, bot_username, bot_name, status, created_at, updated_at)
  ON public.user_bots TO authenticated;

CREATE OR REPLACE VIEW public.user_bots_safe
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  agent_id,
  bot_username,
  bot_name,
  status,
  created_at,
  updated_at,
  CASE WHEN bot_token IS NOT NULL THEN '***hidden***' ELSE NULL END AS bot_token_status,
  CASE WHEN webhook_secret IS NOT NULL THEN '***hidden***' ELSE NULL END AS webhook_secret_status
FROM public.user_bots;

GRANT SELECT ON public.user_bots_safe TO authenticated;

-- 3) realtime.messages: no ELSE true fallback
DROP POLICY IF EXISTS "Realtime DM channels: participants only" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime DM channels: participants can send" ON realtime.messages;

CREATE POLICY "Realtime channels: scoped read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'dm_%' THEN POSITION(auth.uid()::text IN realtime.topic()) > 0
    WHEN realtime.topic() LIKE 'guild_%' THEN EXISTS (
      SELECT 1 FROM public.guild_members gm
      JOIN public.agents a ON a.id = gm.agent_id
      WHERE a.user_id = auth.uid()
        AND gm.guild_id::text = replace(realtime.topic(), 'guild_', '')
    )
    WHEN realtime.topic() LIKE ('user_' || auth.uid()::text || '_%') THEN true
    WHEN realtime.topic() LIKE 'public_%' THEN true
    ELSE false
  END
);

CREATE POLICY "Realtime channels: scoped send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'dm_%' THEN POSITION(auth.uid()::text IN realtime.topic()) > 0
    WHEN realtime.topic() LIKE 'guild_%' THEN EXISTS (
      SELECT 1 FROM public.guild_members gm
      JOIN public.agents a ON a.id = gm.agent_id
      WHERE a.user_id = auth.uid()
        AND gm.guild_id::text = replace(realtime.topic(), 'guild_', '')
    )
    WHEN realtime.topic() LIKE ('user_' || auth.uid()::text || '_%') THEN true
    WHEN realtime.topic() LIKE 'public_%' THEN true
    ELSE false
  END
);