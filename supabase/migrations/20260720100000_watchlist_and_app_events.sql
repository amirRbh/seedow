-- ─────────────────────────────────────────────────────────────────────────────
-- Beta ouverte — deux briques de rétention :
--
-- 1. `watchlists` : suivre un actif sans l'avoir en portefeuille. C'est la
--    boucle d'engagement centrale (suivre → être alerté → revenir).
--
-- 2. `app_events` : instrumentation produit générique (activation, recherche,
--    watchlist, alertes, sessions Ethi) pour mesurer la rétention J1/J7 dès le
--    lancement. Complète les tables spécialisées existantes (preference_events,
--    decision_events) sans les remplacer.
--
-- Même modèle de sécurité que le reste du schéma : RLS scopée auth.uid(),
-- écritures bornées (taille payload + rate limit) au niveau DB car les inserts
-- viennent directement du client.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Watchlist ────────────────────────────────────────────────────────────
CREATE TABLE public.watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_id)
);

CREATE INDEX watchlists_user_idx ON public.watchlists (user_id, created_at DESC);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own watchlist" ON public.watchlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add to own watchlist" ON public.watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove from own watchlist" ON public.watchlists
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlists TO service_role;

-- Garde-fou : une watchlist n'a pas besoin de milliers de lignes, et un client
-- scripté ne doit pas pouvoir gonfler la table.
CREATE OR REPLACE FUNCTION public.enforce_watchlist_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.watchlists WHERE user_id = NEW.user_id;
  IF v_count >= 200 THEN
    RAISE EXCEPTION 'Watchlist pleine (200 actifs max).' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_watchlist_limits
  BEFORE INSERT ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION public.enforce_watchlist_limits();

-- ── 2. Événements produit ───────────────────────────────────────────────────
CREATE TABLE public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_events_user_time_idx ON public.app_events (user_id, occurred_at DESC);
CREATE INDEX app_events_name_time_idx ON public.app_events (name, occurred_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events" ON public.app_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own events" ON public.app_events
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_app_event_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.payload) > 4096 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'analytics_write:app_events:' || NEW.user_id::text, 240, 60
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_app_event_limits
  BEFORE INSERT ON public.app_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_app_event_limits();

-- ── 3. Vues de rétention J1/J7 ──────────────────────────────────────────────
-- security_invoker : la vue applique la RLS du lecteur. En pratique elle est
-- interrogée via service_role (admin bêta), qui contourne la RLS et voit tout.

CREATE VIEW public.app_event_first_seen
WITH (security_invoker = true) AS
SELECT user_id, min(occurred_at)::date AS cohort_day
FROM public.app_events
GROUP BY user_id;

CREATE VIEW public.beta_retention_cohorts
WITH (security_invoker = true) AS
SELECT
  f.cohort_day,
  count(DISTINCT f.user_id) AS cohort_size,
  count(DISTINCT e1.user_id) AS retained_d1,
  count(DISTINCT e7.user_id) AS retained_d7
FROM public.app_event_first_seen f
LEFT JOIN public.app_events e1
  ON e1.user_id = f.user_id
 AND e1.occurred_at::date = f.cohort_day + 1
LEFT JOIN public.app_events e7
  ON e7.user_id = f.user_id
 AND e7.occurred_at::date BETWEEN f.cohort_day + 5 AND f.cohort_day + 9
GROUP BY f.cohort_day
ORDER BY f.cohort_day DESC;

GRANT SELECT ON public.app_event_first_seen, public.beta_retention_cohorts TO authenticated, service_role;
