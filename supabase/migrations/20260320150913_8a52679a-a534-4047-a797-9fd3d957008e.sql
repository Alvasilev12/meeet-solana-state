
DROP POLICY IF EXISTS "Service can insert achievements" ON user_achievements;
CREATE POLICY "Service role inserts achievements" ON user_achievements FOR INSERT TO service_role WITH CHECK (true);
