-- ─────────────────────────────────────────────────────────
-- Ethi (AI chat) per-user rate limiting
-- Fixed-window counter, checked/incremented atomically server-side
-- before every call to the AI Gateway in /api/ethi.
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ethi_rate_limits (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 0
);

ALTER TABLE public.ethi_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (the /api/ethi server handler) touches this table.

CREATE OR REPLACE FUNCTION public.check_and_increment_ethi_rate_limit(
  p_user_id UUID,
  p_limit INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  INSERT INTO public.ethi_rate_limits (user_id, window_start, request_count)
  VALUES (p_user_id, now(), 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT window_start, request_count INTO v_window_start, v_count
  FROM public.ethi_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF now() - v_window_start > make_interval(secs => p_window_seconds) THEN
    UPDATE public.ethi_rate_limits
    SET window_start = now(), request_count = 1
    WHERE user_id = p_user_id;
    RETURN TRUE;
  ELSIF v_count < p_limit THEN
    UPDATE public.ethi_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_ethi_rate_limit(UUID, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ethi_rate_limit(UUID, INT, INT) TO service_role;
