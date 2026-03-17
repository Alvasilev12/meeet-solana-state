
-- Fix guild_members INSERT: restrict role to 'member' on self-join
DROP POLICY IF EXISTS "Agent owners can join guilds" ON public.guild_members;
CREATE POLICY "Agent owners can join guilds"
ON public.guild_members FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = guild_members.agent_id
      AND agents.user_id = auth.uid()
  )
  AND role = 'member'
);
