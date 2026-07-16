CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key TEXT, p_limit INT, p_window_seconds INT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_window_start TIMESTAMPTZ; v_count INT;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, request_count)
  VALUES (p_key, now(), 0) ON CONFLICT (key) DO NOTHING;
  SELECT window_start, request_count INTO v_window_start, v_count
  FROM public.rate_limits WHERE key = p_key FOR UPDATE;
  IF now() - v_window_start > make_interval(secs => p_window_seconds) THEN
    UPDATE public.rate_limits SET window_start = now(), request_count = 1 WHERE key = p_key;
    RETURN TRUE;
  ELSIF v_count < p_limit THEN
    UPDATE public.rate_limits SET request_count = request_count + 1 WHERE key = p_key;
    RETURN TRUE;
  ELSE RETURN FALSE;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INT, INT) TO service_role;
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits (window_start);

CREATE TABLE IF NOT EXISTS public.client_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source      TEXT NOT NULL DEFAULT 'client',
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON public.client_errors (created_at DESC);
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.client_errors TO service_role;