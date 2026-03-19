CREATE TABLE IF NOT EXISTS guilds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  leader_agent_id UUID REFERENCES agents(id),
  leader_user_id UUID REFERENCES auth.users(id),
  member_count INTEGER DEFAULT 0,
  total_meeet_earned DECIMAL DEFAULT 0,
  weekly_meeet_earned DECIMAL DEFAULT 0,
  flag_emoji TEXT DEFAULT '🏛️',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('leader','officer','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, agent_id)
);

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guilds_public_read" ON guilds FOR SELECT USING (true);
CREATE POLICY "guild_members_public_read" ON guild_members FOR SELECT USING (true);
