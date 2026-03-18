
-- Fix security definer view - set to INVOKER instead
ALTER VIEW public.agents_public SET (security_invoker = on);
