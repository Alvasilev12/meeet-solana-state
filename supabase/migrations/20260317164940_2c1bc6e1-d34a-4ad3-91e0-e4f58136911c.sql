
-- Drop policy first, then function, then recreate both
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_profile_protected_fields(uuid);

CREATE FUNCTION public.get_profile_protected_fields(_user_id uuid)
RETURNS TABLE(is_president boolean, welcome_bonus_claimed boolean, passport_tier passport_tier)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;
  
  RETURN QUERY
    SELECT p.is_president, p.welcome_bonus_claimed, p.passport_tier
    FROM public.profiles p
    WHERE p.user_id = _user_id
    LIMIT 1;
END;
$$;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (NOT (is_president IS DISTINCT FROM (SELECT gp.is_president FROM get_profile_protected_fields(auth.uid()) gp(is_president, welcome_bonus_claimed, passport_tier))))
  AND (NOT (welcome_bonus_claimed IS DISTINCT FROM (SELECT gp.welcome_bonus_claimed FROM get_profile_protected_fields(auth.uid()) gp(is_president, welcome_bonus_claimed, passport_tier))))
  AND (NOT (passport_tier IS DISTINCT FROM (SELECT gp.passport_tier FROM get_profile_protected_fields(auth.uid()) gp(is_president, welcome_bonus_claimed, passport_tier))))
);
