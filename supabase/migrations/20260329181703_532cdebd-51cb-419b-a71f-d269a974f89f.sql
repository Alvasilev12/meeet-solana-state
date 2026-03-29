
CREATE OR REPLACE FUNCTION public.get_oracle_bet_history(p_question_id uuid)
RETURNS TABLE(bet_date date, yes_total bigint, no_total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS bet_date,
    COALESCE(SUM(amount_meeet) FILTER (WHERE prediction = true), 0) AS yes_total,
    COALESCE(SUM(amount_meeet) FILTER (WHERE prediction = false), 0) AS no_total
  FROM oracle_bets
  WHERE question_id = p_question_id
  GROUP BY bet_date
  ORDER BY bet_date ASC;
$$;
