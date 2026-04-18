
DROP VIEW IF EXISTS public.user_bots_safe;
CREATE VIEW public.user_bots_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  agent_id,
  bot_username,
  bot_name,
  status,
  created_at,
  updated_at,
  (bot_token IS NOT NULL) AS has_token,
  (webhook_secret IS NOT NULL) AS has_webhook_secret
FROM public.user_bots
WHERE (auth.uid())::text = user_id;

GRANT SELECT ON public.user_bots_safe TO authenticated;
