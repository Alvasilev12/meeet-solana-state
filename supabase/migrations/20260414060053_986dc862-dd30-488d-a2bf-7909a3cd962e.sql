-- Fix 1: Newsletter unsubscribe tautology — the WITH CHECK compared column to itself
DROP POLICY IF EXISTS "Unsubscribe with valid token" ON public.newsletter_subscribers;

-- Recreate: users can only set status=inactive and must not change unsubscribe_token
-- The real validation happens: the row's existing unsubscribe_token must match
-- what the caller passes. We use a function to read the stored token securely.
-- Since RLS can't compare old vs new directly in WITH CHECK, we remove client UPDATE
-- and make unsubscription service_role only (via edge function).
-- This is the safest approach.

-- No UPDATE for anon/authenticated at all — unsubscribe goes through edge function
-- (service_role policy already covers service-role updates)

-- Fix 2: Restrict cortex_reports INSERT to service_role only
DROP POLICY IF EXISTS "Anyone can insert cortex reports" ON public.cortex_reports;
DROP POLICY IF EXISTS "Authenticated users can insert cortex reports" ON public.cortex_reports;

CREATE POLICY "Service role inserts cortex reports"
ON public.cortex_reports
FOR INSERT
TO service_role
WITH CHECK (true);