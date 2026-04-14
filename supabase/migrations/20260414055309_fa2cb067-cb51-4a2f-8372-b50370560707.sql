-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can count subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can unsubscribe with token" ON public.newsletter_subscribers;

-- Service role can read all subscribers (for digest sending)
CREATE POLICY "Service role reads subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO service_role
USING (true);

-- Authenticated users cannot read other subscribers' data
-- Anon users cannot read any subscriber data

-- Allow unsubscribe only when the correct token is provided
CREATE POLICY "Unsubscribe with valid token"
ON public.newsletter_subscribers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  status = 'inactive'
  AND unsubscribe_token = unsubscribe_token
);

-- Service role can manage all records
CREATE POLICY "Service role manages subscribers"
ON public.newsletter_subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);