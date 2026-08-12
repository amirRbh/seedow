-- =========================================================
-- DATA ENGINE — FONDATION (provenance, holdings, documents, monitoring)
-- =========================================================
-- Objectif : donner à la table `assets` (= « fund » côté produit) une couche
-- de données sourcées, historisées et validées, SANS casser l'existant.
-- Toutes les nouvelles tables ont la RLS activée (§1.4 non négociable).
-- Écritures réservées au service_role (ingestion serveur) ; lectures ouvertes
-- aux utilisateurs authentifiés pour le catalogue, restreintes pour les
-- demandes utilisateur.
--
-- Aucune donnée n'est inventée ici : ces tables sont vides à la création et se
-- remplissent via les connecteurs du Data Engine (src/lib/data-engine).
-- =========================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.data_source_type AS ENUM (
    'official_regulator', 'official_document', 'official_asset_manager',
    'public_open_data', 'public_api', 'secondary_financial', 'commercial'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.data_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.data_validation_status AS ENUM ('valid', 'review_required', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fund_document_type AS ENUM (
    'kid', 'dici', 'prospectus', 'factsheet', 'annual_report', 'sfdr', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.source_health AS ENUM ('healthy', 'degraded', 'broken', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1) DATA_SOURCES (miroir DB du SOURCE_REGISTRY) ----------
CREATE TABLE IF NOT EXISTS public.data_sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,                 -- ex. 'amf_geco'
  name         text NOT NULL,
  source_type  public.data_source_type NOT NULL,
  priority     smallint NOT NULL CHECK (priority BETWEEN 1 AND 4),
  home_url     text,
  terms_url    text,
  robots_allowed boolean,
  automation   text,                                  -- api | document_download | scrape | manual
  attribution  text,
  notes        text,
  health       public.source_health NOT NULL DEFAULT 'unknown',
  last_checked_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_sources readable by authenticated" ON public.data_sources
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
CREATE TRIGGER data_sources_updated_at BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2) SECURITIES (titres sous-jacents : entreprises, etc.) ----------
CREATE TABLE IF NOT EXISTS public.securities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin       text UNIQUE,
  ticker     text,
  name       text NOT NULL,
  sector     text,
  industry   text,
  country    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS securities_name_idx ON public.securities (lower(name));
ALTER TABLE public.securities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "securities readable by authenticated" ON public.securities
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.securities TO authenticated;
GRANT ALL ON public.securities TO service_role;
CREATE TRIGGER securities_updated_at BEFORE UPDATE ON public.securities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3) FUND_HOLDINGS (composition, HISTORISÉE §13) ----------
-- Clé (asset, security, as_of) : on n'écrase pas, on empile les dates (§13).
CREATE TABLE IF NOT EXISTS public.fund_holdings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  security_id  uuid REFERENCES public.securities(id) ON DELETE SET NULL,
  -- Copies dénormalisées quand le titre n'est pas encore résolu en `securities`.
  security_isin text,
  security_name text NOT NULL,
  weight_pct   numeric(7,4) CHECK (weight_pct >= 0 AND weight_pct <= 100),
  as_of        date NOT NULL,                         -- date de référence (§12)
  source_id    uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_url   text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  confidence   public.data_confidence NOT NULL DEFAULT 'medium',
  validation_status public.data_validation_status NOT NULL DEFAULT 'valid',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, security_name, as_of)
);
CREATE INDEX IF NOT EXISTS fund_holdings_asset_asof_idx
  ON public.fund_holdings (asset_id, as_of DESC);
CREATE INDEX IF NOT EXISTS fund_holdings_security_idx ON public.fund_holdings (security_id);
ALTER TABLE public.fund_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_holdings readable by authenticated" ON public.fund_holdings
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_holdings TO authenticated;
GRANT ALL ON public.fund_holdings TO service_role;

-- ---------- 4) FUND_DOCUMENTS (sources documentaires officielles) ----------
CREATE TABLE IF NOT EXISTS public.fund_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  doc_type     public.fund_document_type NOT NULL,
  url          text NOT NULL,
  title        text,
  published_date date,
  language     text,
  source_id    uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  checksum     text,                                  -- déduplication / détection de changement
  parse_status public.data_validation_status NOT NULL DEFAULT 'review_required',
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, doc_type, url)
);
CREATE INDEX IF NOT EXISTS fund_documents_asset_idx ON public.fund_documents (asset_id, doc_type);
ALTER TABLE public.fund_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund_documents readable by authenticated" ON public.fund_documents
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fund_documents TO authenticated;
GRANT ALL ON public.fund_documents TO service_role;

-- ---------- 5) DATA_OBSERVATIONS (ledger de provenance générique §3) ----------
-- Chaque valeur atomique (ter, sfdr_article, domicile, …) écrite avec SA source.
CREATE TABLE IF NOT EXISTS public.data_observations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  security_id  uuid REFERENCES public.securities(id) ON DELETE CASCADE,
  field        text NOT NULL,                         -- ex. 'ter', 'sfdr_article'
  value_text   text,
  value_num    numeric,
  value_json   jsonb,
  source_id    uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_url   text,
  reference_date date,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  confidence   public.data_confidence NOT NULL DEFAULT 'medium',
  method       text,
  validation_status public.data_validation_status NOT NULL DEFAULT 'valid',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (asset_id IS NOT NULL OR security_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS data_observations_asset_field_idx
  ON public.data_observations (asset_id, field, reference_date DESC);
ALTER TABLE public.data_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_observations readable by authenticated" ON public.data_observations
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.data_observations TO authenticated;
GRANT ALL ON public.data_observations TO service_role;

-- ---------- 6) FUND_REQUESTS (data request §27) ----------
CREATE TABLE IF NOT EXISTS public.fund_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query         text NOT NULL,
  isin          text,
  matched_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'requested',    -- requested | queued | added | rejected
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fund_requests_status_idx ON public.fund_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fund_requests_isin_idx ON public.fund_requests (isin);
ALTER TABLE public.fund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own fund_requests" ON public.fund_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "users read own fund_requests" ON public.fund_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all fund_requests" ON public.fund_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT ON public.fund_requests TO authenticated;
GRANT ALL ON public.fund_requests TO service_role;

-- ---------- 7) INGESTION_JOBS / INGESTION_ERRORS (monitoring §20/§21) ----------
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_key   text,
  identifier   text,                                  -- ISIN/ticker traité
  status       text NOT NULL DEFAULT 'running',       -- running | success | failed
  observations_written int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE INDEX IF NOT EXISTS ingestion_jobs_source_idx
  ON public.ingestion_jobs (source_key, started_at DESC);
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ingestion_jobs" ON public.ingestion_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.ingestion_jobs TO authenticated;
GRANT ALL ON public.ingestion_jobs TO service_role;

CREATE TABLE IF NOT EXISTS public.ingestion_errors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
  source_key text,
  identifier text,
  stage      text,                                    -- fetch | parse | normalize | validate
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingestion_errors_job_idx ON public.ingestion_errors (job_id);
ALTER TABLE public.ingestion_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ingestion_errors" ON public.ingestion_errors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.ingestion_errors TO authenticated;
GRANT ALL ON public.ingestion_errors TO service_role;

-- ---------- 8) VUE : dernière composition connue par fonds ----------
CREATE OR REPLACE VIEW public.fund_latest_holdings AS
SELECT h.*
FROM public.fund_holdings h
WHERE h.as_of = (
  SELECT max(h2.as_of) FROM public.fund_holdings h2 WHERE h2.asset_id = h.asset_id
);

-- =========================================================
-- Seed initial du SOURCE_REGISTRY (miroir du code, idempotent).
-- Aucune donnée de fonds — uniquement la documentation des sources (§23).
-- =========================================================
INSERT INTO public.data_sources (key, name, source_type, priority, home_url, terms_url, automation, attribution, notes)
VALUES
  ('amf_geco', 'AMF — base GECO', 'official_regulator', 1, 'https://geco.amf-france.org/', 'https://www.amf-france.org/fr/mentions-legales', 'document_download', 'Source : AMF (GECO)', 'Base officielle AMF : OPC, prospectus, DICI, VL. Référence pour l''identification des fonds FR.'),
  ('ishares_factsheet', 'iShares / BlackRock — fiches produit', 'official_asset_manager', 1, 'https://www.ishares.com/', 'https://www.ishares.com/uk/legal/terms-and-conditions', 'document_download', 'Source : iShares / BlackRock (fiche produit officielle)', 'Factsheets et compositions publiées par l''émetteur. Déjà parsées (factsheet-parser).'),
  ('amundi_factsheet', 'Amundi ETF — documents officiels', 'official_asset_manager', 1, 'https://www.amundietf.fr/', 'https://www.amundietf.fr/fr/particuliers/mentions-legales', 'document_download', 'Source : Amundi ETF (document officiel)', 'DICI/KID et factsheets publics par ISIN.'),
  ('vanguard_factsheet', 'Vanguard — documents UCITS', 'official_asset_manager', 1, 'https://www.vanguard.co.uk/', 'https://www.vanguard.co.uk/legal/terms-and-conditions', 'document_download', 'Source : Vanguard (document officiel)', 'Gamme UCITS. Documents KID/factsheet publics.'),
  ('yahoo_finance', 'Yahoo Finance (cotations)', 'secondary_financial', 3, 'https://finance.yahoo.com/', 'https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html', 'api', NULL, 'Cotations uniquement (asset_quotes/asset_prices). Source secondaire, jamais faisant-foi pour identité/frais/holdings.')
ON CONFLICT (key) DO NOTHING;
