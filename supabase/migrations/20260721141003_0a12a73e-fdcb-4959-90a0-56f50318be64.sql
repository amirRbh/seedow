-- 1) handle_new_user: enforce beta cap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cap integer;
  v_status text;
  v_count integer;
BEGIN
  SELECT (value #>> '{}')::integer INTO v_cap FROM public.app_config WHERE key = 'beta_cap';
  SELECT value #>> '{}' INTO v_status FROM public.app_config WHERE key = 'beta_status';
  SELECT count(*) INTO v_count FROM public.profiles;
  IF COALESCE(v_status, 'open') = 'closed' OR v_count >= COALESCE(v_cap, 300) THEN
    RAISE EXCEPTION 'La bêta Seedow est complète pour le moment. Inscris-toi sur la liste d''attente.'
      USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END; $$;

-- 2) Bound analytics writes
CREATE OR REPLACE FUNCTION public.enforce_preference_event_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.payload) > 8192 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;
  SELECT public.check_and_increment_rate_limit('analytics_write:preference_events:' || NEW.user_id::text, 120, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_preference_event_limits ON public.preference_events;
CREATE TRIGGER trg_enforce_preference_event_limits BEFORE INSERT ON public.preference_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_preference_event_limits();

CREATE OR REPLACE FUNCTION public.enforce_tradeoff_decision_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.context) > 8192 THEN
    RAISE EXCEPTION 'Contexte trop volumineux.' USING ERRCODE = 'P0001';
  END IF;
  SELECT public.check_and_increment_rate_limit('analytics_write:tradeoff_decisions:' || NEW.user_id::text, 120, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_tradeoff_decision_limits ON public.tradeoff_decisions;
CREATE TRIGGER trg_enforce_tradeoff_decision_limits BEFORE INSERT ON public.tradeoff_decisions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tradeoff_decision_limits();

CREATE OR REPLACE FUNCTION public.enforce_fund_rejection_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.context) > 8192 THEN
    RAISE EXCEPTION 'Contexte trop volumineux.' USING ERRCODE = 'P0001';
  END IF;
  SELECT public.check_and_increment_rate_limit('analytics_write:fund_rejections:' || NEW.user_id::text, 120, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_fund_rejection_limits ON public.fund_rejections;
CREATE TRIGGER trg_enforce_fund_rejection_limits BEFORE INSERT ON public.fund_rejections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_fund_rejection_limits();

-- 3) watchlists + app_events
CREATE TABLE IF NOT EXISTS public.watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_id)
);
CREATE INDEX IF NOT EXISTS watchlists_user_idx ON public.watchlists (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlists TO service_role;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own watchlist" ON public.watchlists;
CREATE POLICY "Users view own watchlist" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users add to own watchlist" ON public.watchlists;
CREATE POLICY "Users add to own watchlist" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users remove from own watchlist" ON public.watchlists;
CREATE POLICY "Users remove from own watchlist" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_watchlist_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.watchlists WHERE user_id = NEW.user_id;
  IF v_count >= 200 THEN
    RAISE EXCEPTION 'Watchlist pleine (200 actifs max).' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_watchlist_limits ON public.watchlists;
CREATE TRIGGER trg_enforce_watchlist_limits BEFORE INSERT ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION public.enforce_watchlist_limits();

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_events_user_time_idx ON public.app_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS app_events_name_time_idx ON public.app_events (name, occurred_at DESC);
GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own events" ON public.app_events;
CREATE POLICY "Users insert own events" ON public.app_events FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users view own events" ON public.app_events;
CREATE POLICY "Users view own events" ON public.app_events FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_app_event_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_allowed boolean;
BEGIN
  IF pg_column_size(NEW.payload) > 4096 THEN
    RAISE EXCEPTION 'Charge utile trop volumineuse.' USING ERRCODE = 'P0001';
  END IF;
  SELECT public.check_and_increment_rate_limit('analytics_write:app_events:' || NEW.user_id::text, 240, 60) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Trop d''écritures. Réessaie dans quelques instants.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_app_event_limits ON public.app_events;
CREATE TRIGGER trg_enforce_app_event_limits BEFORE INSERT ON public.app_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_app_event_limits();

CREATE OR REPLACE VIEW public.app_event_first_seen
WITH (security_invoker = true) AS
SELECT user_id, min(occurred_at)::date AS cohort_day
FROM public.app_events GROUP BY user_id;

CREATE OR REPLACE VIEW public.beta_retention_cohorts
WITH (security_invoker = true) AS
SELECT f.cohort_day,
  count(DISTINCT f.user_id) AS cohort_size,
  count(DISTINCT e1.user_id) AS retained_d1,
  count(DISTINCT e7.user_id) AS retained_d7
FROM public.app_event_first_seen f
LEFT JOIN public.app_events e1 ON e1.user_id = f.user_id AND e1.occurred_at::date = f.cohort_day + 1
LEFT JOIN public.app_events e7 ON e7.user_id = f.user_id AND e7.occurred_at::date BETWEEN f.cohort_day + 5 AND f.cohort_day + 9
GROUP BY f.cohort_day ORDER BY f.cohort_day DESC;

GRANT SELECT ON public.app_event_first_seen, public.beta_retention_cohorts TO authenticated, service_role;

-- 4) Expand universe wave 2 (40 funds)
INSERT INTO public.assets
  (ticker, name, issuer, asset_class, region, currency, ter, esg_score,
   esg_score_source, sfdr_article, expected_return, volatility,
   cause_exposure, excluded_sectors, description, yahoo_symbol, is_active)
VALUES
('V3AA', 'Vanguard ESG Global All Cap UCITS ETF (USD) Accumulating', 'Vanguard', 'equity_dev', 'world', 'USD', 0.0024, 70, 'seedow-internal-v1', 8, 0.065, 0.16, '{"climat": 0.2, "humain": 0.2}', '{fossiles,armes,tabac,jeux}', 'Actions mondiales toutes capitalisations, filtres FTSE ESG : exclusion fossiles, armes, tabac, jeux d''argent.', 'V3AA.L', true),
('SUAS', 'iShares MSCI USA SRI UCITS ETF USD (Acc)', 'iShares', 'equity_dev', 'us', 'USD', 0.0020, 78, 'seedow-internal-v1', 8, 0.065, 0.16, '{"climat": 0.2, "humain": 0.2}', '{armes,tabac}', 'Actions US best-in-class MSCI SRI.', 'SUAS.L', true),
('SUJP', 'iShares MSCI Japan SRI UCITS ETF', 'iShares', 'equity_dev', 'japan', 'USD', 0.0030, 77, 'seedow-internal-v1', 8, 0.06, 0.16, '{"climat": 0.2, "humain": 0.2}', '{armes,tabac}', 'Actions japonaises best-in-class MSCI SRI.', 'SUJP.L', true),
('USRI', 'Amundi MSCI USA SRI Climate Paris Aligned UCITS ETF Acc', 'Amundi', 'equity_dev', 'us', 'USD', 0.0025, 79, 'seedow-internal-v1', 8, 0.065, 0.16, '{"climat": 0.5, "humain": 0.2}', '{fossiles,armes,tabac}', 'Actions US SRI alignées Accord de Paris.', 'USRI.PA', true),
('ESGU', 'iShares ESG Aware MSCI USA ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0015, 66, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"climat": 0.15}', '{armes,tabac}', 'Actions US optimisées ESG (MSCI ESG Aware).', 'ESGU', true),
('ESGV', 'Vanguard ESG U.S. Stock ETF', 'Vanguard', 'equity_dev', 'us', 'USD', 0.0009, 68, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"climat": 0.15}', '{fossiles,armes,tabac,jeux}', 'Actions US larges avec filtres FTSE ESG.', 'ESGV', true),
('ESGD', 'iShares ESG Aware MSCI EAFE ETF', 'iShares', 'equity_dev', 'world', 'USD', 0.0020, 66, 'seedow-internal-v1', NULL, 0.06, 0.15, '{"climat": 0.15}', '{armes,tabac}', 'Actions développées hors Amérique du Nord optimisées ESG.', 'ESGD', true),
('DSI', 'iShares ESG MSCI KLD 400 ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0025, 74, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"climat": 0.2, "humain": 0.2}', '{armes,tabac,jeux}', 'Le plus ancien indice ESG au monde (KLD 400, 1990).', 'DSI', true),
('SUSA', 'iShares ESG Optimized MSCI USA ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0025, 73, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"climat": 0.2}', '{armes,tabac}', 'Actions US selon les notations MSCI ESG.', 'SUSA', true),
('SNPE', 'Xtrackers S&P 500 Scored & Screened ETF', 'Xtrackers', 'equity_dev', 'us', 'USD', 0.0010, 65, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"climat": 0.15}', '{armes,tabac}', 'S&P 500 filtré ESG.', 'SNPE', true),
('SHE', 'State Street SPDR MSCI USA Gender Diversity ETF', 'State Street', 'equity_dev', 'us', 'USD', 0.0020, 62, 'seedow-internal-v1', NULL, 0.065, 0.16, '{"egalite": 0.9}', '{}', 'Entreprises US leaders en mixité.', 'SHE', true),
('MPCT', 'iShares MSCI Global Sustainable Development Goals ETF', 'iShares', 'thematic', 'world', 'USD', 0.0049, 72, 'seedow-internal-v1', NULL, 0.065, 0.18, '{"humain": 0.5, "climat": 0.4}', '{armes,tabac}', 'Entreprises alignées aux ODD de l''ONU.', 'SDG', true),
('SAEM', 'iShares MSCI EM IMI Screened UCITS ETF USD (Acc)', 'iShares', 'equity_em', 'em', 'USD', 0.0018, 64, 'seedow-internal-v1', 8, 0.07, 0.20, '{"humain": 0.2}', '{armes,tabac}', 'Marchés émergents toutes capitalisations filtres ESG.', 'SAEM.L', true),
('ESGE', 'iShares ESG Aware MSCI EM ETF', 'iShares', 'equity_em', 'em', 'USD', 0.0025, 62, 'seedow-internal-v1', NULL, 0.07, 0.20, '{"humain": 0.2}', '{armes,tabac}', 'Marchés émergents optimisés ESG.', 'ESGE', true),
('TAN', 'Invesco Solar ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0067, 68, 'seedow-internal-v1', NULL, 0.07, 0.30, '{"climat": 0.9}', '{}', 'Fonds solaire de référence mondiale.', 'TAN', true),
('FAN', 'First Trust Global Wind Energy ETF', 'First Trust', 'thematic', 'world', 'USD', 0.0060, 67, 'seedow-internal-v1', NULL, 0.06, 0.24, '{"climat": 0.9}', '{}', 'Éolien mondial.', 'FAN', true),
('QCLN', 'First Trust NASDAQ Clean Edge Green Energy Index Fund', 'First Trust', 'thematic', 'us', 'USD', 0.0058, 66, 'seedow-internal-v1', NULL, 0.07, 0.30, '{"climat": 0.85, "tech": 0.15}', '{}', 'Énergies propres US cotées Nasdaq.', 'QCLN', true),
('PBW', 'Invesco WilderHill Clean Energy ETF', 'Invesco', 'thematic', 'us', 'USD', 0.0066, 65, 'seedow-internal-v1', NULL, 0.07, 0.32, '{"climat": 0.9}', '{}', 'Pionnier ETF énergie propre (2005).', 'PBW', true),
('ACES', 'ALPS Clean Energy ETF', 'ALPS', 'thematic', 'us', 'USD', 0.0055, 66, 'seedow-internal-v1', NULL, 0.07, 0.28, '{"climat": 0.9}', '{}', 'Énergie propre Amérique du Nord.', 'ACES', true),
('SMOG', 'VanEck Low Carbon Energy ETF', 'VanEck', 'thematic', 'world', 'USD', 0.0060, 67, 'seedow-internal-v1', NULL, 0.07, 0.26, '{"climat": 0.9}', '{}', 'Énergie bas-carbone mondiale.', 'SMOG', true),
('RNRG', 'Global X Renewable Energy Producers ETF', 'Global X', 'thematic', 'world', 'USD', 0.0065, 68, 'seedow-internal-v1', NULL, 0.06, 0.22, '{"climat": 0.9}', '{}', 'Producteurs d''électricité 100 % renouvelable.', 'RNRG', true),
('RAYS', 'Global X Solar ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 68, 'seedow-internal-v1', NULL, 0.07, 0.30, '{"climat": 0.9}', '{}', 'Chaîne de valeur solaire mondiale.', 'RAYS', true),
('CTEC', 'Global X ClimateTech ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 66, 'seedow-internal-v1', NULL, 0.07, 0.28, '{"climat": 0.8, "tech": 0.2}', '{}', 'Technologies climatiques.', 'CTEC', true),
('HYDR', 'Global X Hydrogen ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 64, 'seedow-internal-v1', NULL, 0.07, 0.34, '{"climat": 0.85, "tech": 0.15}', '{}', 'Hydrogène version US.', 'HYDR', true),
('ERTH', 'Invesco MSCI Sustainable Future ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0055, 70, 'seedow-internal-v1', NULL, 0.065, 0.22, '{"climat": 0.5, "biodiversite": 0.3, "circulaire": 0.2}', '{}', 'Économie durable large.', 'ERTH', true),
('LIT', 'Global X Lithium & Battery Tech ETF', 'Global X', 'thematic', 'world', 'USD', 0.0075, 58, 'seedow-internal-v1', NULL, 0.07, 0.32, '{"climat": 0.6, "tech": 0.3}', '{}', 'Chaîne du lithium et des batteries.', 'LIT', true),
('ECAR', 'iShares Electric Vehicles and Driving Technology UCITS ETF USD (Acc)', 'iShares', 'thematic', 'world', 'USD', 0.0040, 60, 'seedow-internal-v1', 8, 0.07, 0.26, '{"climat": 0.6, "tech": 0.4}', '{}', 'Véhicules électriques et technologies de conduite (UCITS).', 'ECAR.L', true),
('BATT', 'L&G Battery Value-Chain UCITS ETF', 'L&G', 'thematic', 'world', 'USD', 0.0049, 60, 'seedow-internal-v1', 8, 0.07, 0.28, '{"climat": 0.6, "tech": 0.3}', '{}', 'Chaîne de valeur du stockage d''énergie (UCITS).', 'BATT.L', true),
('TANN', 'HANetf Solar Energy UCITS ETF', 'HANetf', 'thematic', 'world', 'USD', 0.0069, 69, 'seedow-internal-v1', 8, 0.07, 0.30, '{"climat": 0.9}', '{}', 'Solaire pur-play UCITS.', 'TANN.L', true),
('GLUG', 'L&G Clean Water UCITS ETF', 'L&G', 'thematic', 'world', 'USD', 0.0049, 67, 'seedow-internal-v1', 8, 0.06, 0.20, '{"biodiversite": 0.5, "climat": 0.3}', '{}', 'Eau propre (UCITS).', 'GLUG.L', true),
('PHO', 'Invesco Water Resources ETF', 'Invesco', 'thematic', 'us', 'USD', 0.0060, 66, 'seedow-internal-v1', NULL, 0.06, 0.20, '{"biodiversite": 0.5, "climat": 0.3}', '{}', 'Ressources en eau US.', 'PHO', true),
('PIO', 'Invesco Global Water ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0075, 66, 'seedow-internal-v1', NULL, 0.06, 0.20, '{"biodiversite": 0.5, "climat": 0.3}', '{}', 'Eau mondiale.', 'PIO', true),
('FOOD', 'Rize Sustainable Future of Food UCITS ETF', 'Rize', 'thematic', 'world', 'USD', 0.0045, 63, 'seedow-internal-v1', 8, 0.06, 0.24, '{"biodiversite": 0.5, "humain": 0.3}', '{}', 'Alimentation durable (UCITS).', 'FOOD.L', true),
('HEAL', 'iShares Healthcare Innovation UCITS ETF', 'iShares', 'thematic', 'world', 'USD', 0.0040, 60, 'seedow-internal-v1', 8, 0.065, 0.22, '{"humain": 0.8, "tech": 0.2}', '{}', 'Innovation santé (UCITS).', 'HEAL.L', true),
('KRBN', 'KraneShares Global Carbon ETF', 'KraneShares', 'commodity', 'world', 'USD', 0.0079, 60, 'seedow-internal-v1', NULL, 0.05, 0.30, '{"climat": 0.9}', '{}', 'Quotas carbone mondiaux.', 'KRBN', true),
('BGRN', 'iShares USD Green Bond ETF', 'iShares', 'green_bond', 'world', 'USD', 0.0020, 78, 'seedow-internal-v1', NULL, 0.03, 0.06, '{"climat": 0.8}', '{}', 'Obligations vertes USD.', 'BGRN', true),
('EAGG', 'iShares ESG U.S. Aggregate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0010, 66, 'seedow-internal-v1', NULL, 0.028, 0.05, '{}', '{}', 'Obligataire US diversifié optimisation ESG.', 'EAGG', true),
('SUSB', 'iShares ESG 1-5 Year USD Corporate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0012, 68, 'seedow-internal-v1', NULL, 0.025, 0.03, '{}', '{armes,tabac}', 'Obligations d''entreprises USD 1-5 ans ESG.', 'SUSB', true),
('SUSC', 'iShares ESG USD Corporate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0018, 68, 'seedow-internal-v1', NULL, 0.03, 0.06, '{}', '{armes,tabac}', 'Obligations d''entreprises USD toutes maturités ESG.', 'SUSC', true),
('RBND', 'SPDR Bloomberg SASB Corporate Bond ESG Select ETF', 'State Street', 'corporate_bond', 'us', 'USD', 0.0012, 67, 'seedow-internal-v1', NULL, 0.03, 0.06, '{}', '{armes,tabac}', 'Obligations d''entreprises US selon SASB.', 'RBND', true)
ON CONFLICT (ticker) DO NOTHING;

-- 5) Profile UI preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS view_mode text CHECK (view_mode IN ('simple', 'expert')),
  ADD COLUMN IF NOT EXISTS font_scale text CHECK (font_scale IN ('standard', 'large', 'xlarge')),
  ADD COLUMN IF NOT EXISTS theme text CHECK (theme IN ('light', 'dark', 'system'));

-- 6) Greenwashing score history + alerts
CREATE TABLE IF NOT EXISTS public.asset_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  esg_score numeric(5, 2),
  sfdr_article int,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_score_history_asset_idx ON public.asset_score_history (asset_id, captured_at DESC);
GRANT SELECT ON public.asset_score_history TO anon, authenticated;
GRANT ALL ON public.asset_score_history TO service_role;
ALTER TABLE public.asset_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read score history" ON public.asset_score_history;
CREATE POLICY "Anyone can read score history" ON public.asset_score_history FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.snapshot_scores_and_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  esg_dropped boolean := NEW.esg_score IS DISTINCT FROM OLD.esg_score AND NEW.esg_score < OLD.esg_score - 3;
  sfdr_downgrade boolean := OLD.sfdr_article IS NOT NULL AND NEW.sfdr_article IS NOT NULL AND NEW.sfdr_article < OLD.sfdr_article;
  sev public.alert_severity;
  a_title text;
  a_body text;
  ddk text;
BEGIN
  IF NEW.esg_score IS NOT DISTINCT FROM OLD.esg_score AND NEW.sfdr_article IS NOT DISTINCT FROM OLD.sfdr_article THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.asset_score_history (asset_id, esg_score, sfdr_article)
  VALUES (NEW.id, NEW.esg_score, NEW.sfdr_article);
  IF NOT (esg_dropped OR sfdr_downgrade) THEN
    RETURN NEW;
  END IF;
  IF sfdr_downgrade THEN
    sev := 'alert';
    a_title := format('Classement durable revu à la baisse — %s', NEW.ticker);
    a_body := format('%s passe de l''article SFDR %s à %s — un signal de déclassement de son ambition durable.', NEW.name, OLD.sfdr_article, NEW.sfdr_article);
  ELSE
    sev := CASE WHEN NEW.esg_score <= OLD.esg_score - 10 THEN 'alert' ELSE 'warn' END;
    a_title := format('Score d''impact en baisse — %s', NEW.ticker);
    a_body := format('Le score d''impact de %s est passé de %s à %s/100.', NEW.name, round(OLD.esg_score)::int, round(NEW.esg_score)::int);
  END IF;
  ddk := 'gw:' || NEW.id::text || ':' || to_char(now(), 'YYYY-MM-DD');
  INSERT INTO public.alerts (user_id, portfolio_id, kind, severity, title, body, cta_label, cta_href, dedup_key)
  SELECT w.user_id, NULL, 'esg_drift', sev, a_title, a_body, 'Voir le fonds', '/discover', ddk
  FROM public.watchlists w WHERE w.asset_id = NEW.id
  ON CONFLICT (user_id, dedup_key) WHERE dismissed_at IS NULL DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS assets_score_change_trg ON public.assets;
CREATE TRIGGER assets_score_change_trg AFTER UPDATE OF esg_score, sfdr_article ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_scores_and_alert();

-- 7) Comprehension views
CREATE OR REPLACE VIEW public.comprehension_overview
WITH (security_invoker = true) AS
WITH completions AS (
  SELECT user_id, (payload ->> 'score')::numeric AS score, (payload ->> 'total')::numeric AS total
  FROM public.app_events WHERE name = 'course_completed'
),
last_mode AS (
  SELECT DISTINCT ON (user_id) user_id, payload ->> 'mode' AS mode
  FROM public.app_events WHERE name = 'view_mode_changed'
  ORDER BY user_id, occurred_at DESC
)
SELECT
  (SELECT count(DISTINCT user_id) FROM public.app_events WHERE name = 'course_started') AS users_started_course,
  (SELECT count(DISTINCT user_id) FROM completions) AS users_completed_course,
  (SELECT count(*) FROM completions) AS total_completions,
  (SELECT round(avg(score / NULLIF(total, 0)) * 100, 1) FROM completions WHERE total > 0) AS avg_quiz_pct,
  (SELECT count(*) FROM last_mode WHERE mode = 'simple') AS mode_simple_users,
  (SELECT count(*) FROM last_mode WHERE mode = 'expert') AS mode_expert_users;

CREATE OR REPLACE VIEW public.comprehension_retention
WITH (security_invoker = true) AS
WITH completers AS (SELECT DISTINCT user_id FROM public.app_events WHERE name = 'course_completed')
SELECT
  (f.user_id IN (SELECT user_id FROM completers)) AS completed_course,
  count(DISTINCT f.user_id) AS cohort_size,
  count(DISTINCT e7.user_id) AS retained_d7
FROM public.app_event_first_seen f
LEFT JOIN public.app_events e7 ON e7.user_id = f.user_id AND e7.occurred_at::date BETWEEN f.cohort_day + 5 AND f.cohort_day + 9
GROUP BY (f.user_id IN (SELECT user_id FROM completers));

GRANT SELECT ON public.comprehension_overview, public.comprehension_retention TO authenticated, service_role;
