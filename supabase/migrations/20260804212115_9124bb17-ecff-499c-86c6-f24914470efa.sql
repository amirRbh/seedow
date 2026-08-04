-- 1. Harmonisation du type de session_id et nullabilité de user_id
ALTER TABLE public.preference_events
  ALTER COLUMN session_id TYPE text USING session_id::text,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.app_events
  ALTER COLUMN user_id DROP NOT NULL;

-- Une ligne doit être rattachable : soit un utilisateur, soit une session.
ALTER TABLE public.preference_events
  ADD CONSTRAINT preference_events_identity_chk
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL) NOT VALID;

ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_identity_chk
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL) NOT VALID;

CREATE INDEX IF NOT EXISTS preference_events_session_idx
  ON public.preference_events (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS app_events_session_idx
  ON public.app_events (session_id, occurred_at DESC);

-- 2. Écriture anonyme autorisée, lecture jamais
GRANT INSERT ON public.preference_events TO anon;
GRANT INSERT ON public.app_events TO anon;
GRANT ALL ON public.preference_events TO service_role;
GRANT ALL ON public.app_events TO service_role;

CREATE POLICY "anon insert session-scoped preference events"
  ON public.preference_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "anon insert session-scoped app events"
  ON public.app_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- 3. Rate limit par session quand l'utilisateur est anonyme
CREATE OR REPLACE FUNCTION public.enforce_preference_event_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_allowed boolean; v_key text;
BEGIN
  IF pg_column_size(NEW.payload) > 8192 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;
  v_key := COALESCE(NEW.user_id::text, 'anon:' || NEW.session_id);
  SELECT public.check_and_increment_rate_limit('analytics_write:preference_events:' || v_key, 120, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_app_event_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_allowed boolean; v_key text;
BEGIN
  IF pg_column_size(NEW.payload) > 4096 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;
  v_key := COALESCE(NEW.user_id::text, 'anon:' || NEW.session_id);
  SELECT public.check_and_increment_rate_limit('analytics_write:app_events:' || v_key, 240, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $function$;

-- 4. Réconciliation après inscription
CREATE OR REPLACE FUNCTION public.claim_session_events(p_session_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_n integer := 0; v_m integer := 0;
BEGIN
  IF v_uid IS NULL OR p_session_id IS NULL OR length(p_session_id) > 64 THEN
    RETURN 0;
  END IF;

  UPDATE public.preference_events
     SET user_id = v_uid
   WHERE session_id = p_session_id
     AND user_id IS NULL
     AND occurred_at > now() - interval '24 hours';
  GET DIAGNOSTICS v_n = ROW_COUNT;

  UPDATE public.app_events
     SET user_id = v_uid
   WHERE session_id = p_session_id
     AND user_id IS NULL
     AND occurred_at > now() - interval '24 hours';
  GET DIAGNOSTICS v_m = ROW_COUNT;

  RETURN v_n + v_m;
END; $function$;

REVOKE ALL ON FUNCTION public.claim_session_events(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_session_events(text) TO authenticated;

-- 5. Vue d'entonnoir quotidienne (admin uniquement, lue via le rôle de service)
CREATE OR REPLACE VIEW public.funnel_daily AS
WITH ev AS (
  SELECT date_trunc('day', occurred_at)::date AS day,
         COALESCE(session_id, user_id::text)  AS actor,
         name                                  AS step
  FROM public.app_events
  UNION ALL
  SELECT date_trunc('day', occurred_at)::date,
         COALESCE(session_id, user_id::text),
         step
  FROM public.preference_events
)
SELECT
  day,
  count(DISTINCT actor) FILTER (WHERE step = 'landing_viewed')      AS landing_viewed,
  count(DISTINCT actor) FILTER (WHERE step = 'landing_cta_clicked') AS landing_cta_clicked,
  count(DISTINCT actor) FILTER (WHERE step = 'preview_started')     AS preview_started,
  count(DISTINCT actor) FILTER (WHERE step = 'step_completed')      AS step_completed,
  count(DISTINCT actor) FILTER (WHERE step = 'allocation_seen')     AS allocation_seen,
  count(DISTINCT actor) FILTER (WHERE step = 'allocation_accepted') AS allocation_accepted,
  count(DISTINCT actor) FILTER (WHERE step = 'account_created')     AS account_created
FROM ev
GROUP BY day
ORDER BY day DESC;

REVOKE ALL ON public.funnel_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.funnel_daily TO service_role;