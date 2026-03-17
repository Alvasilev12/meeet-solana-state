
-- API keys table for persistent agent authentication
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id, name)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own api keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own keys
CREATE POLICY "Users can create own api keys" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete own api keys" ON public.api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own keys (e.g. deactivate)
CREATE POLICY "Users can update own api keys" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all keys (for edge function validation)
CREATE POLICY "Service role reads all api keys" ON public.api_keys
  FOR SELECT TO service_role
  USING (true);

-- Service role can update last_used_at
CREATE POLICY "Service role updates api keys" ON public.api_keys
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- Security definer function to validate API key in edge functions
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.api_keys
  WHERE key_hash = _key_hash
    AND is_active = true
  LIMIT 1;
$$;
