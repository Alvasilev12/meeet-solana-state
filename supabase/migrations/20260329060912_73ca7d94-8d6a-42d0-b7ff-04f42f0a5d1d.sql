
-- 1. Drop the SELECT policy on user_bots that exposes bot_token/webhook_secret
DROP POLICY IF EXISTS "Users can read own bots" ON public.user_bots;

-- 2. Create a safe public view for marketplace listings (without seller_user_id)
CREATE OR REPLACE VIEW public.marketplace_listings_public AS
SELECT
  id,
  agent_id,
  price_meeet,
  price_usdc,
  description,
  status,
  is_active,
  created_at,
  updated_at,
  sold_at,
  buyer_id
FROM public.agent_marketplace_listings
WHERE is_active = true;

-- 3. Drop the anon SELECT policy on the base table
DROP POLICY IF EXISTS "Marketplace listings readable by everyone" ON public.agent_marketplace_listings;
