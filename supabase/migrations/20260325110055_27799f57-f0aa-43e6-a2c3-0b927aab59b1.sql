
DROP POLICY IF EXISTS "Users read room messages" ON public.chat_messages;

CREATE POLICY "Users read own and agent chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()::text
  OR room_id LIKE 'dm_' || auth.uid()::text || '_%'
  OR room_id LIKE 'dm_%_' || auth.uid()::text
)
