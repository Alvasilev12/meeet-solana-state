
-- 1) AGENTS — restrict full-row SELECT to owner only
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.agents'::regclass
      AND polname IN (
        'Anyone can view agents','Public read agents','agents_public_select',
        'Allow public read','Public can view agents','agents_select_all'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agents', pol.polname);
  END LOOP;
END $$;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_owner_full_select" ON public.agents;
CREATE POLICY "agents_owner_full_select"
ON public.agents FOR SELECT TO authenticated
USING (user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='agents_public') THEN
    EXECUTE 'GRANT SELECT ON public.agents_public TO anon, authenticated';
  END IF;
END $$;

-- 2) AGENT_HIRING_PROPOSALS — drop redundant insecure policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.agent_hiring_proposals'::regclass
      AND polname IN ('Anyone can insert proposals','public_insert_proposals','hiring_proposals_public_insert')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agent_hiring_proposals', pol.polname);
  END LOOP;
END $$;

-- 3) SEASON_SCORES — owner only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='season_scores')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='season_scores' AND column_name='agent_id') THEN
    EXECUTE 'ALTER TABLE public.season_scores ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "season_scores_public_insert" ON public.season_scores';
    EXECUTE 'DROP POLICY IF EXISTS "season_scores_anyone_insert" ON public.season_scores';
    EXECUTE 'DROP POLICY IF EXISTS "season_scores_owner_write" ON public.season_scores';
    EXECUTE $p$CREATE POLICY "season_scores_owner_write"
      ON public.season_scores FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = season_scores.agent_id AND a.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = season_scores.agent_id AND a.user_id = auth.uid()))$p$;
  END IF;
END $$;

-- 4) CORTEX_REPORTS — drop public write
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cortex_reports') THEN
    EXECUTE 'ALTER TABLE public.cortex_reports ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "cortex_reports_public_write" ON public.cortex_reports';
    EXECUTE 'DROP POLICY IF EXISTS "cortex_reports_anyone_insert" ON public.cortex_reports';
  END IF;
END $$;

-- 5) REALTIME — drop sensitive tables
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'notifications','agent_messages','quests','payments','agent_billing',
    'agent_earnings','treasury','exchange_results','interactions'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
