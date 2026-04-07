-- Fix 1: Restrict sara_assessments to agent owners only
DROP POLICY IF EXISTS "Anyone can read sara assessments" ON sara_assessments;
CREATE POLICY "Owners read own agent assessments" ON sara_assessments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents a WHERE a.id = sara_assessments.agent_id AND a.user_id = auth.uid()
  ));

-- Fix 2: Restrict attestations to agent owners only
DROP POLICY IF EXISTS "Anyone can read attestations" ON attestations;
CREATE POLICY "Owners read own agent attestations" ON attestations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents a WHERE a.id = attestations.agent_id AND a.user_id = auth.uid()
  ));

-- Fix 3: Restrict stake_history to agent owners only
DROP POLICY IF EXISTS "Public read stake_history" ON stake_history;
CREATE POLICY "Owners read own agent stake history" ON stake_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents a WHERE a.id = stake_history.agent_id AND a.user_id = auth.uid()
  ));