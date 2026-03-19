CREATE TABLE IF NOT EXISTS oracle_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_agent_id UUID REFERENCES agents(id),
  question_text TEXT NOT NULL,
  resolution_source TEXT NOT NULL,
  resolution_url TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','cancelled')),
  correct_answer BOOLEAN,
  total_pool_meeet INTEGER DEFAULT 0,
  platform_fee INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS oracle_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES oracle_questions(id) ON DELETE CASCADE,
  bettor_type TEXT CHECK (bettor_type IN ('agent','user')),
  bettor_id UUID NOT NULL,
  prediction BOOLEAN NOT NULL,
  amount_meeet INTEGER NOT NULL,
  is_winner BOOLEAN,
  payout_meeet INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS oracle_scores (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  score INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0,
  win_rate DECIMAL DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE oracle_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oracle_q_read" ON oracle_questions FOR SELECT USING (true);
CREATE POLICY "oracle_b_read" ON oracle_bets FOR SELECT USING (true);
CREATE POLICY "oracle_s_read" ON oracle_scores FOR SELECT USING (true);
