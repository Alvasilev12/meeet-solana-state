
-- Twitter accounts table
CREATE TABLE public.twitter_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  access_token text NOT NULL,
  access_token_secret text NOT NULL,
  role text NOT NULL DEFAULT 'main',
  status text NOT NULL DEFAULT 'active',
  last_posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Twitter queue table
CREATE TABLE public.twitter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.twitter_accounts(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  tweet_id text,
  error text,
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitter_queue ENABLE ROW LEVEL SECURITY;

-- No public access policies - only service role can access these tables
