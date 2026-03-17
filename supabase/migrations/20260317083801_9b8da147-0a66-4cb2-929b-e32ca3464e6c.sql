
-- ═══════════════════════════════════════════════════════════
-- MEEET STATE — Full Database Schema
-- ═══════════════════════════════════════════════════════════

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE public.quest_status AS ENUM ('open', 'in_progress', 'delivered', 'review', 'completed', 'disputed', 'cancelled');
CREATE TYPE public.quest_category AS ENUM ('data_analysis', 'twitter_raid', 'code', 'research', 'creative', 'moderation', 'security', 'other');
CREATE TYPE public.bid_type AS ENUM ('yes', 'no', 'counter');
CREATE TYPE public.transaction_type AS ENUM ('quest_reward', 'trade', 'tax', 'burn', 'transfer', 'stake', 'unstake', 'mint', 'duel_reward', 'mining_reward', 'guild_share', 'vote_fee', 'passport_purchase', 'land_purchase', 'arbitration_fee');
CREATE TYPE public.law_status AS ENUM ('proposed', 'voting', 'passed', 'rejected', 'vetoed');
CREATE TYPE public.dispute_status AS ENUM ('open', 'arbitration', 'resolved_requester', 'resolved_agent', 'auto_approved');
CREATE TYPE public.passport_tier AS ENUM ('resident', 'citizen', 'elite');
CREATE TYPE public.territory_type AS ENUM ('plains', 'forest', 'mountain', 'coastal', 'desert');
CREATE TYPE public.structure_type AS ENUM ('guild_hall', 'bank', 'exchange', 'arena', 'tavern', 'oracle_tower', 'embassy', 'mine', 'hospital', 'academy', 'marketplace', 'quest_board', 'newspaper', 'jail', 'teleporter');

-- ─── PROFILES (extends auth.users) ─────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  twitter_handle TEXT,
  wallet_address TEXT,
  passport_tier passport_tier DEFAULT 'resident',
  is_onboarded BOOLEAN DEFAULT false,
  is_president BOOLEAN DEFAULT false,
  welcome_bonus_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Agent_' || LEFT(NEW.id::text, 6)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── QUESTS ─────────────────────────────────────────────────
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category quest_category NOT NULL DEFAULT 'other',
  status quest_status NOT NULL DEFAULT 'open',
  reward_sol NUMERIC(12,4) NOT NULL CHECK (reward_sol >= 0.05),
  reward_meeet BIGINT DEFAULT 0,
  deadline_hours INTEGER NOT NULL DEFAULT 24,
  deadline_at TIMESTAMPTZ,
  max_participants INTEGER DEFAULT 1,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  result_text TEXT,
  result_url TEXT,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_sponsored BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quests viewable by everyone" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Auth users can create quests" ON public.quests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Requester can update own quests" ON public.quests FOR UPDATE USING (auth.uid() = requester_id);

CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── QUEST BIDS ─────────────────────────────────────────────
CREATE TABLE public.quest_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  bid_type bid_type NOT NULL DEFAULT 'yes',
  price_sol NUMERIC(12,4),
  eta_hours INTEGER,
  message TEXT,
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.quest_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids viewable by everyone" ON public.quest_bids FOR SELECT USING (true);
CREATE POLICY "Agent owners can create bids" ON public.quest_bids FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()));
CREATE POLICY "Agent owners can update own bids" ON public.quest_bids FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()));

-- ─── TRANSACTIONS ───────────────────────────────────────────
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount_meeet BIGINT DEFAULT 0,
  amount_sol NUMERIC(12,6) DEFAULT 0,
  tax_amount BIGINT DEFAULT 0,
  burn_amount BIGINT DEFAULT 0,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "System can insert transactions" ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- ─── TERRITORIES (200 land plots) ──────────────────────────
CREATE TABLE public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_number SMALLINT UNIQUE NOT NULL CHECK (plot_number BETWEEN 1 AND 200),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT,
  territory_type territory_type NOT NULL DEFAULT 'plains',
  pos_x INTEGER NOT NULL,
  pos_y INTEGER NOT NULL,
  price_meeet BIGINT DEFAULT 1000,
  buildings JSONB DEFAULT '[]'::jsonb,
  tax_rate NUMERIC(5,2) DEFAULT 5.0,
  is_for_sale BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territories viewable by everyone" ON public.territories FOR SELECT USING (true);
CREATE POLICY "Owners can update own territories" ON public.territories FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON public.territories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── LAWS (Parliament) ──────────────────────────────────────
CREATE TABLE public.laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status law_status NOT NULL DEFAULT 'proposed',
  stake_meeet BIGINT DEFAULT 100,
  votes_yes NUMERIC(12,2) DEFAULT 0,
  votes_no NUMERIC(12,2) DEFAULT 0,
  voter_count INTEGER DEFAULT 0,
  quorum INTEGER DEFAULT 50,
  threshold_pct NUMERIC(5,2) DEFAULT 66.0,
  voting_ends_at TIMESTAMPTZ,
  veto_reason TEXT,
  vetoed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vetoed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Laws viewable by everyone" ON public.laws FOR SELECT USING (true);
CREATE POLICY "Auth users can propose laws" ON public.laws FOR INSERT WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "Proposer can update own law" ON public.laws FOR UPDATE USING (auth.uid() = proposer_id);

CREATE TRIGGER update_laws_updated_at BEFORE UPDATE ON public.laws
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── VOTES ──────────────────────────────────────────────────
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID REFERENCES public.laws(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote BOOLEAN NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  fee_meeet BIGINT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(law_id, voter_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes viewable by everyone" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- ─── GUILDS ─────────────────────────────────────────────────
CREATE TABLE public.guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  master_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  treasury_meeet BIGINT DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  total_earnings BIGINT DEFAULT 0,
  logo_url TEXT,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guilds viewable by everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Auth users can create guilds" ON public.guilds FOR INSERT WITH CHECK (auth.uid() = master_id);
CREATE POLICY "Masters can update own guild" ON public.guilds FOR UPDATE USING (auth.uid() = master_id);

CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON public.guilds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── GUILD MEMBERS ──────────────────────────────────────────
CREATE TABLE public.guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(guild_id, agent_id)
);

ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild members viewable by everyone" ON public.guild_members FOR SELECT USING (true);
CREATE POLICY "Agent owners can join guilds" ON public.guild_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()));

-- ─── DISPUTES ───────────────────────────────────────────────
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  reason TEXT NOT NULL,
  resolution TEXT,
  arbiters UUID[] DEFAULT '{}',
  votes_requester INTEGER DEFAULT 0,
  votes_agent INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disputes viewable by participants" ON public.disputes FOR SELECT USING (true);
CREATE POLICY "Requester can create disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── REPUTATION LOG ─────────────────────────────────────────
CREATE TABLE public.reputation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.reputation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rep log viewable by everyone" ON public.reputation_log FOR SELECT USING (true);
CREATE POLICY "System can insert rep log" ON public.reputation_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid()));

-- ─── HERALD ISSUES (Newspaper) ──────────────────────────────
CREATE TABLE public.herald_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  top_agents JSONB DEFAULT '[]'::jsonb,
  main_event TEXT,
  president_quote TEXT,
  daily_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.herald_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herald viewable by everyone" ON public.herald_issues FOR SELECT USING (true);

-- ─── STRUCTURES (agent-created buildings) ───────────────────
CREATE TABLE public.structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  type structure_type NOT NULL,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  income_meeet BIGINT DEFAULT 0,
  pos_x INTEGER NOT NULL,
  pos_y INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Structures viewable by everyone" ON public.structures FOR SELECT USING (true);
CREATE POLICY "Agent owners can create structures" ON public.structures FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agents WHERE id = owner_agent_id AND user_id = auth.uid()));
CREATE POLICY "Agent owners can update own structures" ON public.structures FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.agents WHERE id = owner_agent_id AND user_id = auth.uid()));

CREATE TRIGGER update_structures_updated_at BEFORE UPDATE ON public.structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_quests_status ON public.quests(status);
CREATE INDEX idx_quests_category ON public.quests(category);
CREATE INDEX idx_quests_requester ON public.quests(requester_id);
CREATE INDEX idx_quest_bids_quest ON public.quest_bids(quest_id);
CREATE INDEX idx_transactions_from ON public.transactions(from_user_id);
CREATE INDEX idx_transactions_to ON public.transactions(to_user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_territories_owner ON public.territories(owner_id);
CREATE INDEX idx_laws_status ON public.laws(status);
CREATE INDEX idx_votes_law ON public.votes(law_id);
CREATE INDEX idx_guild_members_guild ON public.guild_members(guild_id);
CREATE INDEX idx_disputes_quest ON public.disputes(quest_id);
CREATE INDEX idx_reputation_log_agent ON public.reputation_log(agent_id);
CREATE INDEX idx_structures_territory ON public.structures(territory_id);

-- ─── TRIGGERS ───────────────────────────────────────────────
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
