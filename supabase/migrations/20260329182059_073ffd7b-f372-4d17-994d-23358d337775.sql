
-- Guild messages table
CREATE TABLE public.guild_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guild_messages ENABLE ROW LEVEL SECURITY;

-- Members of the guild can read messages
CREATE POLICY "Guild members can read messages"
ON public.guild_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM guild_members gm
    JOIN agents a ON a.id = gm.agent_id
    WHERE gm.guild_id = guild_messages.guild_id
    AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = guild_messages.guild_id
    AND g.master_id = auth.uid()
  )
);

-- Members can send messages
CREATE POLICY "Guild members can send messages"
ON public.guild_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND length(message) >= 1
  AND length(message) <= 500
  AND (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN agents a ON a.id = gm.agent_id
      WHERE gm.guild_id = guild_messages.guild_id
      AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_messages.guild_id
      AND g.master_id = auth.uid()
    )
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_messages;

-- Index for fast lookups
CREATE INDEX idx_guild_messages_guild_id ON public.guild_messages(guild_id, created_at DESC);
