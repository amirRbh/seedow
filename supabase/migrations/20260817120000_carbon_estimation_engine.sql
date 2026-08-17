-- =========================================================
-- MOTEUR D'ESTIMATION CARBONE (holdings → émetteur → fonds → portefeuille)
-- =========================================================
-- Objectif : ne plus afficher systématiquement « données carbone indisponibles »
-- quand un fonds ne publie pas son empreinte. On calcule une estimation à partir
-- de sa composition réelle (`fund_holdings`, déjà en place — data_engine_foundation),
-- des émissions connues par émetteur, et — seulement quand ça manque vraiment —
-- d'une intensité sectorielle sourcée. Jamais de chiffre inventé, jamais une
-- estimation présentée comme mesurée (CLAUDE.md §1.2/§1.3).
--
-- Réutilise le schéma existant : `securities` fait déjà office de table
-- « émetteur » (une ligne = une entreprise sous-jacente) et `fund_holdings`
-- relie déjà un fonds (`assets`) à ses positions pondérées. On ne recrée donc
-- pas de table issuers séparée — `issuer_id` référence `public.securities(id)`.
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.carbon_data_quality AS ENUM (
    'measured',           -- publié et audité par l'émetteur
    'reported',            -- publié par l'émetteur, non audité (ex. auto-déclaré)
    'estimated_company',   -- estimation spécifique à l'entreprise (méthode documentée)
    'estimated_sector',    -- intensité sectorielle appliquée au CA/EVIC réel de l'entreprise
    'proxy',                -- dernier recours : proxy générique, à éviter
    'unavailable'           -- aucune estimation honnête possible (ex. obligation souveraine)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.carbon_scope_bucket AS ENUM ('scope_1_2', 'scope_3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1) ISSUER_EMISSIONS (données d'émissions par émetteur/année) ----------
-- Une ligne = la meilleure valeur disponible pour (émetteur, année), déjà résolue
-- au niveau de priorité applicable (measured > reported > estimated_company >
-- estimated_sector > proxy). `estimated=false` uniquement pour measured/reported.
CREATE TABLE IF NOT EXISTS public.issuer_emissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id     uuid NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  year          smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  scope_1       numeric,                              -- tCO2e
  scope_2       numeric,                              -- tCO2e
  scope_3       numeric,                              -- tCO2e — jamais fondu dans scope_1+2 (§ méthodo)
  revenue       numeric,                               -- chiffre d'affaires, devise `currency`
  evic          numeric,                               -- Enterprise Value Including Cash, devise `currency`
  currency      text NOT NULL DEFAULT 'EUR',
  source        text NOT NULL,
  source_url    text,
  source_type   public.data_source_type,
  data_quality  public.carbon_data_quality NOT NULL,
  estimated     boolean NOT NULL DEFAULT false,
  methodology   text,
  retrieved_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (estimated = true OR data_quality IN ('measured', 'reported')),
  UNIQUE (issuer_id, year)
);
CREATE INDEX IF NOT EXISTS issuer_emissions_issuer_idx ON public.issuer_emissions (issuer_id, year DESC);
ALTER TABLE public.issuer_emissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issuer_emissions readable by authenticated" ON public.issuer_emissions
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.issuer_emissions TO authenticated;
GRANT ALL ON public.issuer_emissions TO service_role;

-- ---------- 2) SECTOR_CARBON_INTENSITY (proxy sectoriel, dernier recours) ----------
-- Vide à la création (§ non-négociable : aucun chiffre inventé). Se remplit via un
-- connecteur dédié (ex. base sectorielle ADEME/CDP), pas encore construit — tant
-- que cette table est vide, le palier 'estimated_sector'/'proxy' du moteur ne
-- produit simplement aucune estimation (couverture partielle honnête, pas de
-- fausse précision).
CREATE TABLE IF NOT EXISTS public.sector_carbon_intensity (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector         text NOT NULL,
  region         text NOT NULL DEFAULT 'world',
  -- tCO2e (scope 1+2) par M$ (ou M€, cf. currency) de chiffre d'affaires.
  scope_1_2_intensity numeric NOT NULL,
  currency       text NOT NULL DEFAULT 'EUR',
  source         text NOT NULL,
  source_url     text,
  year           smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector, region, year)
);
ALTER TABLE public.sector_carbon_intensity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sector_carbon_intensity readable by authenticated" ON public.sector_carbon_intensity
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.sector_carbon_intensity TO authenticated;
GRANT ALL ON public.sector_carbon_intensity TO service_role;
CREATE TRIGGER sector_carbon_intensity_updated_at BEFORE UPDATE ON public.sector_carbon_intensity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3) CARBON_ESTIMATES (agrégat par fonds, calculé depuis les holdings) ----------
-- Sert de repli pour `assets.carbon_intensity_gco2e_per_eur` quand le fonds ne
-- publie pas directement son empreinte : calculé bottom-up à partir de
-- `fund_holdings` × `issuer_emissions` (formule PCAF, cf. carbon-engine.ts).
-- `scope_3` est stocké séparément et n'alimente jamais le chiffre principal.
CREATE TABLE IF NOT EXISTS public.carbon_estimates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  as_of                 date NOT NULL,
  scope                 public.carbon_scope_bucket NOT NULL DEFAULT 'scope_1_2',
  intensity_gco2e_per_eur numeric,                    -- null si aucune position couvrable
  coverage              numeric(5,4) NOT NULL DEFAULT 0 CHECK (coverage BETWEEN 0 AND 1),
  sourced_coverage       numeric(5,4) NOT NULL DEFAULT 0 CHECK (sourced_coverage BETWEEN 0 AND 1),
  data_quality          public.carbon_data_quality NOT NULL DEFAULT 'unavailable',
  methodology           text NOT NULL,
  holdings_considered    int NOT NULL DEFAULT 0,
  holdings_covered       int NOT NULL DEFAULT 0,
  computed_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, as_of, scope)
);
CREATE INDEX IF NOT EXISTS carbon_estimates_asset_idx ON public.carbon_estimates (asset_id, as_of DESC);
ALTER TABLE public.carbon_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbon_estimates readable by authenticated" ON public.carbon_estimates
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.carbon_estimates TO authenticated;
GRANT ALL ON public.carbon_estimates TO service_role;

CREATE OR REPLACE VIEW public.carbon_estimates_latest AS
SELECT c.*
FROM public.carbon_estimates c
WHERE c.as_of = (
  SELECT max(c2.as_of) FROM public.carbon_estimates c2
  WHERE c2.asset_id = c.asset_id AND c2.scope = c.scope
);

-- ---------- 4) CARBON_EQUIVALENCES (facteurs paramétrables, pas hardcodés en front) ----------
CREATE TABLE IF NOT EXISTS public.carbon_equivalences (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                text NOT NULL UNIQUE,             -- ex. 'car_km'
  label_key          text NOT NULL,                    -- clé i18n
  unit_key           text NOT NULL,                     -- clé i18n
  kg_co2e_per_unit   numeric NOT NULL,
  source             text NOT NULL,
  region             text NOT NULL DEFAULT 'FR',
  year               smallint NOT NULL,
  is_primary         boolean NOT NULL DEFAULT false,    -- équivalence mise en avant (km voiture)
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carbon_equivalences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carbon_equivalences readable by authenticated" ON public.carbon_equivalences
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.carbon_equivalences TO authenticated;
GRANT ALL ON public.carbon_equivalences TO service_role;
CREATE TRIGGER carbon_equivalences_updated_at BEFORE UPDATE ON public.carbon_equivalences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed : mêmes valeurs déjà sourcées dans src/lib/impact/equivalences.ts
-- (ADEME Base Carbone / DGAC / Agribalyse), simplement relocalisées en base pour
-- que le frontend ne hardcode plus les facteurs. `car_km` = équivalence principale.
INSERT INTO public.carbon_equivalences (key, label_key, unit_key, kg_co2e_per_unit, source, region, year, is_primary)
VALUES
  ('car_km', 'impact.equiv.car_km', 'impact.unit.km', 0.193, 'ADEME Base Carbone', 'FR', 2023, true),
  ('flight_paris_ny', 'impact.equiv.flight_paris_ny', 'impact.unit.round_trip', 1800, 'ADEME / DGAC', 'FR', 2023, false),
  ('beef_meal', 'impact.equiv.beef_meal', 'impact.unit.meal', 7, 'ADEME Agribalyse', 'FR', 2023, false),
  ('smartphone', 'impact.equiv.smartphone', 'impact.unit.unit', 57, 'ADEME', 'FR', 2022, false)
ON CONFLICT (key) DO NOTHING;
