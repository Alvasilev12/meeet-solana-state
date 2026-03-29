
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

CREATE POLICY "Authenticated users can read active promo codes"
ON public.promo_codes FOR SELECT
TO authenticated
USING (is_active = true);
