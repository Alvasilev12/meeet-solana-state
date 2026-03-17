
-- Rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(key)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_key ON public.rate_limits(key);

-- Enable RLS (only service_role accesses this)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete expired windows (run periodically)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max_requests integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row rate_limits%ROWTYPE;
  _now timestamp with time zone := now();
  _window_start timestamp with time zone;
BEGIN
  _window_start := _now - (_window_seconds || ' seconds')::interval;
  
  -- Try to get existing record
  SELECT * INTO _row FROM rate_limits WHERE key = _key FOR UPDATE;
  
  IF _row IS NULL THEN
    -- First request in this window
    INSERT INTO rate_limits (key, window_start, request_count)
    VALUES (_key, _now, 1)
    ON CONFLICT (key) DO UPDATE SET
      window_start = _now,
      request_count = 1;
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF _row.window_start < _window_start THEN
    -- Reset window
    UPDATE rate_limits SET window_start = _now, request_count = 1 WHERE key = _key;
    RETURN true;
  END IF;
  
  -- Check if within limit
  IF _row.request_count >= _max_requests THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  UPDATE rate_limits SET request_count = request_count + 1 WHERE key = _key;
  RETURN true;
END;
$$;
