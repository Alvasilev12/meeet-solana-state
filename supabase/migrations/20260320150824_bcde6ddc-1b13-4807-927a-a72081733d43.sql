
CREATE TABLE IF NOT EXISTS achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid REFERENCES achievements(id),
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);

INSERT INTO achievements (name, description, icon, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first quest', '🎯', 'quests_completed', 1),
('Quest Hunter', 'Complete 10 quests', '⚔️', 'quests_completed', 10),
('Quest Master', 'Complete 50 quests', '🏆', 'quests_completed', 50),
('First Blood', 'Win your first duel', '🗡️', 'kills', 1),
('MEEET Starter', 'Earn 100 MEEET', '💰', 'balance_meeet', 100),
('MEEET Whale', 'Earn 1000 MEEET', '🐋', 'balance_meeet', 1000),
('Oracle Seer', 'Place your first Oracle bet', '🔮', 'oracle_bets', 1),
('Guild Member', 'Join a guild', '🛡️', 'guild_member', 1),
('Marketplace Trader', 'Sell an agent on marketplace', '🏪', 'marketplace_sales', 1),
('Recruiter', 'Refer 3 friends', '🤝', 'referrals', 3);
