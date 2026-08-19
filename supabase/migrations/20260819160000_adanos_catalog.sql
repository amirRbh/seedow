-- ─────────────────────────────────────────────────────────────────────────────
-- Catalogue mondial des instruments — source Adanos Free Global Ticker Database
-- (github.com/adanos-software/free-ticker-database, licence MIT).
--
-- COUCHE SÉPARÉE, jamais `assets` : `assets` est l'univers CURÉ du moteur
-- (`ticker UNIQUE`, `asset_class` fonctionnel, esg_score/cause_exposure/return
-- consommés par l'optimiseur). Y déverser 61k lignes globales + cross-listings
-- casserait `ticker UNIQUE` et polluerait l'allocateur. Adanos alimente donc
-- `catalog_instruments` (identité des titres) ; holdings/ESG/carbone restent des
-- couches séparées. La promotion catalogue→assets (ETF uniquement, curée) est un
-- second chantier, hors de cette migration.
--
-- Aucune donnée insérée ici : ces tables se remplissent via
-- `scripts/import-adanos-catalog.ts` (GitHub Action). RLS activée (§1.4).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.catalog_asset_type AS ENUM ('etf', 'stock', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Catalogue (miroir de core_listings.csv, clé listing_key) ----------
CREATE TABLE IF NOT EXISTS public.catalog_instruments (
  listing_key           text PRIMARY KEY,           -- 'EXCHANGE::TICKER' (collision-safe)
  ticker                text,
  exchange              text,
  name                  text NOT NULL,
  asset_type            public.catalog_asset_type NOT NULL DEFAULT 'other',
  stock_sector          text,
  etf_category          text,
  country               text,
  country_code          text,
  isin                  text,                        -- canonique (Luhn) ou NULL, jamais deviné
  instrument_group_key  text,
  scope_reason          text,
  -- Provenance / versionnage (exigence 7) :
  source                text NOT NULL DEFAULT 'adanos',
  source_version        text,                        -- Adanos _meta.version (ex. '3.32.00')
  source_url            text,
  first_seen_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  -- true si présent dans le dernier import (permet de repérer les retraits sans supprimer).
  is_present_in_latest  boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_instruments_isin_idx ON public.catalog_instruments (isin)
  WHERE isin IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalog_instruments_asset_type_idx ON public.catalog_instruments (asset_type);
CREATE INDEX IF NOT EXISTS catalog_instruments_exchange_idx ON public.catalog_instruments (exchange);
ALTER TABLE public.catalog_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_instruments readable by authenticated" ON public.catalog_instruments
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.catalog_instruments TO authenticated;
GRANT ALL ON public.catalog_instruments TO service_role;
CREATE TRIGGER catalog_instruments_updated_at BEFORE UPDATE ON public.catalog_instruments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Journal d'import (exigences 7 + 8 : version/date/source + rapport) ----------
CREATE TABLE IF NOT EXISTS public.catalog_imports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source            text NOT NULL DEFAULT 'adanos',
  source_version    text,
  source_url        text,
  imported_at       timestamptz NOT NULL DEFAULT now(),
  count_before      integer,
  count_parsed      integer,
  count_new         integer,
  count_updated     integer,
  count_skipped_dup integer,
  count_no_isin     integer,
  count_etf         integer,
  count_stock       integer,
  count_errors      integer,
  status            text NOT NULL DEFAULT 'ok',       -- ok | partial | error
  details           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_imports_imported_at_idx ON public.catalog_imports (imported_at DESC);
ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_imports readable by authenticated" ON public.catalog_imports
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.catalog_imports TO authenticated;
GRANT ALL ON public.catalog_imports TO service_role;

-- ---------- Lien de traçabilité catalogue → moteur (non destructif) ----------
-- Quel `listing_key` du catalogue a été promu vers cet actif du moteur. NULL =
-- actif curé historique non issu du catalogue. Ne touche RIEN aux données
-- existantes.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS catalog_listing_key text NULL
    REFERENCES public.catalog_instruments(listing_key) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS assets_catalog_listing_key_idx ON public.assets (catalog_listing_key)
  WHERE catalog_listing_key IS NOT NULL;
COMMENT ON COLUMN public.assets.catalog_listing_key IS
  'listing_key Adanos si l''actif a été promu depuis catalog_instruments. NULL = actif curé historique.';
