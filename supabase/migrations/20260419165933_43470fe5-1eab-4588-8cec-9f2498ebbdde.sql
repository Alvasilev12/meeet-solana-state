ALTER VIEW public.agents_public SET (security_invoker = true);

CREATE POLICY "Public can view agents list"
ON public.agents
FOR SELECT
TO anon, authenticated
USING (true);