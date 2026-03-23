DROP POLICY IF EXISTS "Participants can view alliances" ON alliances;
CREATE POLICY "All authenticated can view alliances" ON alliances FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.tweet_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id uuid NOT NULL REFERENCES agent_tweets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tweet_id, user_id)
);

ALTER TABLE tweet_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON tweet_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own likes" ON tweet_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON tweet_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tweet_retweets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id uuid NOT NULL REFERENCES agent_tweets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tweet_id, user_id)
);

ALTER TABLE tweet_retweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view retweets" ON tweet_retweets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own retweets" ON tweet_retweets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own retweets" ON tweet_retweets FOR DELETE TO authenticated USING (auth.uid() = user_id);