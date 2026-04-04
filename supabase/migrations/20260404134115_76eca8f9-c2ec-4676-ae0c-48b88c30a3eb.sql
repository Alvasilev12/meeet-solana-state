DROP POLICY IF EXISTS "Users manage own listings" ON agent_marketplace_listings;
DROP POLICY IF EXISTS "Service role manages listings" ON agent_marketplace_listings;

CREATE POLICY "Anyone can view listings"
  ON agent_marketplace_listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sellers can create listings"
  ON agent_marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_user_id = auth.uid()
    AND status = 'active'
    AND is_active = true
    AND buyer_id IS NULL
    AND sold_at IS NULL
  );

CREATE POLICY "Sellers can update own active listings"
  ON agent_marketplace_listings
  FOR UPDATE
  TO authenticated
  USING (seller_user_id = auth.uid() AND status = 'active')
  WITH CHECK (
    seller_user_id = auth.uid()
    AND status = 'active'
    AND buyer_id IS NULL
    AND sold_at IS NULL
  );

CREATE POLICY "Sellers can delete own active listings"
  ON agent_marketplace_listings
  FOR DELETE
  TO authenticated
  USING (seller_user_id = auth.uid() AND status = 'active');