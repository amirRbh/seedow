-- Seedow Pro — base UC de référence : provenance de l'identité, frais sourcés,
-- journal des imports. Migration ADDITIVE uniquement : aucune colonne ni table
-- supprimée, aucune donnée réécrite ; rejouable (IF NOT EXISTS partout).
--
-- Règle de la base : chaque donnée porte sa source et sa date. L'identité d'un
-- fonds (nom, société de gestion, classification) vient d'une source primaire
-- (GECO, base de l'AMF) ; les frais viennent du KID, page et ligne citées ; les
-- critères de durabilité viennent de l'annexe SFDR (table existante).

-- ---------- 1) pro_funds : identité sourcée ----------
ALTER TABLE public.pro_funds
  ADD COLUMN IF NOT EXISTS management_company_lei text
    CHECK (management_company_lei ~ '^[A-Z0-9]{18}[0-9]{2}$'),
  ADD COLUMN IF NOT EXISTS amf_classification text,
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS currency text CHECK (currency ~ '^[A-Z]{3}$'),
  ADD COLUMN IF NOT EXISTS identity_source text
    CHECK (identity_source IN ('amf_geco', 'annex', 'manual')),
  ADD COLUMN IF NOT EXISTS identity_source_url text,
  ADD COLUMN IF NOT EXISTS identity_retrieved_at timestamptz,
  -- Pourquoi ce fonds est dans la base (critère mécanique, jamais « recommandé »).
  ADD COLUMN IF NOT EXISTS selection_reason text,
  ADD COLUMN IF NOT EXISTS esma_name_terms text[];

COMMENT ON COLUMN public.pro_funds.identity_source IS
  'Origine du nom et de la société de gestion : amf_geco (GECO), annex (annexe SFDR), manual (saisie revue).';

-- ---------- 2) pro_fund_documents : pages d'origine ----------
-- Une annexe isolée d'un prospectus est archivée seule ; on garde l'empreinte
-- du document complet et les pages d'où elle vient, pour qu'un tiers retrouve
-- la même annexe dans le même prospectus.
ALTER TABLE public.pro_fund_documents
  ADD COLUMN IF NOT EXISTS source_sha256 text CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  ADD COLUMN IF NOT EXISTS source_page_start integer CHECK (source_page_start >= 1),
  ADD COLUMN IF NOT EXISTS source_page_end integer CHECK (source_page_end >= 1);

-- ---------- 3) Frais courants, lus dans le KID / DIC ----------
-- Historique en insertion seule : une nouvelle version du KID ajoute une ligne.
CREATE TABLE IF NOT EXISTS public.pro_fund_costs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin                text NOT NULL REFERENCES public.pro_funds(isin) ON DELETE CASCADE,
  -- En % de l'actif par an ; NULL = non lu (jamais estimé).
  ongoing_charges_pct numeric(6,3) CHECK (ongoing_charges_pct >= 0 AND ongoing_charges_pct <= 20),
  status              text NOT NULL CHECK (status IN ('auto', 'needs_review', 'not_found')),
  page                integer CHECK (page >= 1),
  quote               text,
  source_doc_type     text NOT NULL CHECK (source_doc_type IN ('kid', 'dici')),
  source_url          text NOT NULL,
  source_sha256       text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  doc_date            date,
  parser              text NOT NULL,
  retrieved_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (isin, source_sha256),
  CHECK (status <> 'auto' OR (ongoing_charges_pct IS NOT NULL AND page IS NOT NULL AND quote IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS pro_fund_costs_isin_idx
  ON public.pro_fund_costs (isin, retrieved_at DESC);
ALTER TABLE public.pro_fund_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pro_fund_costs readable by authenticated" ON public.pro_fund_costs;
CREATE POLICY "pro_fund_costs readable by authenticated" ON public.pro_fund_costs
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.pro_fund_costs TO authenticated;
GRANT SELECT, INSERT ON public.pro_fund_costs TO service_role;

-- ---------- 4) Journal des imports ----------
-- Un run d'import = une ligne : qui, quand, depuis quel commit, quelle source,
-- combien de fonds créés, mis à jour, en revue, en échec. Lisible par le seul
-- serveur (aucune politique pour `authenticated`).
CREATE TABLE IF NOT EXISTS public.pro_fund_imports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  git_sha     text,
  source      text NOT NULL,
  params      jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'partial', 'failed'))
);
ALTER TABLE public.pro_fund_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pro_fund_imports FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pro_fund_imports TO service_role;
