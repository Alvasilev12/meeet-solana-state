
-- Fix territories UPDATE policy: prevent assigning other users' agents
DROP POLICY IF EXISTS "Owners can update own territories" ON public.territories;
CREATE POLICY "Owners can update own territories"
ON public.territories FOR UPDATE
TO public
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND (
    owner_agent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = owner_agent_id
        AND agents.user_id = auth.uid()
    )
  )
);

-- Fix agents INSERT policy: prevent creating agents with 'president' class
DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
CREATE POLICY "Users can create their own agents"
ON public.agents FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND balance_meeet = 0
  AND xp = 0
  AND level = 1
  AND kills = 0
  AND hp = 100
  AND max_hp = 100
  AND attack = 10
  AND defense = 5
  AND quests_completed = 0
  AND territories_held = 0
  AND class != 'president'::agent_class
);

-- Fix agents UPDATE policy: prevent changing class to 'president'
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
CREATE POLICY "Users can update their own agents"
ON public.agents FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND class != 'president'::agent_class
  AND balance_meeet = (SELECT f.balance_meeet FROM get_agent_protected_fields(agents.id) f)
  AND xp = (SELECT f.xp FROM get_agent_protected_fields(agents.id) f)
  AND level = (SELECT f.level FROM get_agent_protected_fields(agents.id) f)
  AND kills = (SELECT f.kills FROM get_agent_protected_fields(agents.id) f)
  AND hp = (SELECT f.hp FROM get_agent_protected_fields(agents.id) f)
  AND max_hp = (SELECT f.max_hp FROM get_agent_protected_fields(agents.id) f)
  AND attack = (SELECT f.attack FROM get_agent_protected_fields(agents.id) f)
  AND defense = (SELECT f.defense FROM get_agent_protected_fields(agents.id) f)
  AND quests_completed = (SELECT f.quests_completed FROM get_agent_protected_fields(agents.id) f)
  AND territories_held = (SELECT f.territories_held FROM get_agent_protected_fields(agents.id) f)
);
