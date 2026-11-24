-- ════════════════════════════════════════════════════════════════════════════
-- Seedow Pro — preuve d'adéquation aux préférences de durabilité (MiFID II)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Module B2B pour cabinets CGP/CIF. Toutes les tables sont préfixées `pro_` :
-- `public.fund_documents` existe déjà côté B2C (data engine, clé asset_id) et
-- n'a ni le même grain ni la même clé. Aucun objet B2C n'est modifié ici.
--
-- Règles :
--   * RLS activée sur CHAQUE table (CLAUDE.md §1.4).
--   * Tables fonds : lecture pour `authenticated`, écriture service role seul
--     (le script d'ingestion `scripts/pro/ingest.ts` tourne en service role).
--   * Un cabinet ne voit que ses profils clients et ses rapports.
--   * `pro_reports` est immuable : aucune policy UPDATE/DELETE, et un trigger
--     refuse UPDATE/DELETE même au service role (défense en profondeur).
--   * `client_ref` est un pseudonyme : jamais de nom ni d'email (RGPD). Un
--     CHECK refuse les valeurs qui ressemblent à un email.

-- ---------- 1) Fonds ----------
CREATE TABLE IF NOT EXISTS public.pro_funds (
  isin               text PRIMARY KEY CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  name               text NOT NULL,
  management_company text,
  -- NULL = article non établi par un document (jamais « 6 » par défaut).
  sfdr_article       smallint CHECK (sfdr_article IN (6, 8, 9)),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_funds readable by authenticated" ON public.pro_funds
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.pro_funds TO authenticated;
GRANT ALL ON public.pro_funds TO service_role;

-- ---------- 2) Documents (annexes précontractuelles SFDR) ----------
CREATE TABLE IF NOT EXISTS public.pro_fund_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin         text NOT NULL REFERENCES public.pro_funds(isin) ON DELETE CASCADE,
  doc_type     text NOT NULL DEFAULT 'sfdr_precontractual'
                 CHECK (doc_type = 'sfdr_precontractual'),
  language     text CHECK (language IN ('fr', 'en')),
  source_url   text,
  storage_path text NOT NULL,
  sha256       text NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  doc_date     date,
  ingested_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pro_fund_documents_isin_idx
  ON public.pro_fund_documents (isin, doc_date DESC);
ALTER TABLE public.pro_fund_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_fund_documents readable by authenticated" ON public.pro_fund_documents
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.pro_fund_documents TO authenticated;
GRANT ALL ON public.pro_fund_documents TO service_role;

-- ---------- 3) Données de durabilité extraites ----------
-- Une ligne = une extraction d'un document. Chaque valeur renvoie à sa preuve
-- dans `evidence` : {champ: {page:int, quote:string, verified:bool}}.
CREATE TABLE IF NOT EXISTS public.pro_fund_sustainability_data (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id                     uuid NOT NULL REFERENCES public.pro_fund_documents(id) ON DELETE CASCADE,
  isin                            text NOT NULL REFERENCES public.pro_funds(isin) ON DELETE CASCADE,
  min_sustainable_pct             numeric(5,2) CHECK (min_sustainable_pct BETWEEN 0 AND 100),
  min_sustainable_env_pct         numeric(5,2) CHECK (min_sustainable_env_pct BETWEEN 0 AND 100),
  min_sustainable_social_pct      numeric(5,2) CHECK (min_sustainable_social_pct BETWEEN 0 AND 100),
  min_taxonomy_pct                numeric(5,2) CHECK (min_taxonomy_pct BETWEEN 0 AND 100),
  min_taxonomy_pct_excl_sovereign numeric(5,2) CHECK (min_taxonomy_pct_excl_sovereign BETWEEN 0 AND 100),
  min_es_aligned_pct              numeric(5,2) CHECK (min_es_aligned_pct BETWEEN 0 AND 100),
  considers_pai                   boolean,
  pai_categories                  text[] NOT NULL DEFAULT '{}'
    CHECK (pai_categories <@ ARRAY['ghg','biodiversity','water','waste','social']::text[]),
  fossil_gas_nuclear              text CHECK (fossil_gas_nuclear IN ('no', 'fossil_gas', 'nuclear', 'both')),
  evidence                        jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(evidence) = 'object'),
  extraction_model                text NOT NULL,
  extraction_version              text NOT NULL,
  status                          text NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('auto', 'needs_review', 'validated')),
  validated_by                    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at                    timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'validated') = (validated_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS pro_fsd_isin_idx
  ON public.pro_fund_sustainability_data (isin, created_at DESC);
CREATE INDEX IF NOT EXISTS pro_fsd_review_idx
  ON public.pro_fund_sustainability_data (status) WHERE status = 'needs_review';
ALTER TABLE public.pro_fund_sustainability_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_fsd readable by authenticated" ON public.pro_fund_sustainability_data
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.pro_fund_sustainability_data TO authenticated;
GRANT ALL ON public.pro_fund_sustainability_data TO service_role;

-- Ligne « courante » par ISIN : document le plus récent, puis extraction
-- validée de préférence, puis la plus récente. `security_invoker` : la vue
-- applique la RLS de l'appelant, pas celle de son propriétaire.
CREATE OR REPLACE VIEW public.pro_fund_current_data
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.isin)
  s.*,
  f.name            AS fund_name,
  f.management_company,
  f.sfdr_article,
  d.doc_date,
  d.language        AS doc_language,
  d.source_url      AS doc_source_url,
  d.sha256          AS doc_sha256
FROM public.pro_fund_sustainability_data s
JOIN public.pro_fund_documents d ON d.id = s.document_id
JOIN public.pro_funds f ON f.isin = s.isin
ORDER BY s.isin,
         d.doc_date DESC NULLS LAST,
         (s.status = 'validated') DESC,
         s.created_at DESC;
GRANT SELECT ON public.pro_fund_current_data TO authenticated, service_role;

-- ---------- 4) Cabinets (un utilisateur propriétaire, multi-users hors scope) ----------
CREATE TABLE IF NOT EXISTS public.pro_cabinets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  -- ORIAS : 8 chiffres.
  orias_number  text NOT NULL CHECK (orias_number ~ '^[0-9]{8}$'),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_cabinets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_cabinets owner select" ON public.pro_cabinets
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "pro_cabinets owner insert" ON public.pro_cabinets
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "pro_cabinets owner update" ON public.pro_cabinets
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.pro_cabinets TO authenticated;
GRANT ALL ON public.pro_cabinets TO service_role;

-- Appartenance au cabinet, en SECURITY DEFINER pour éviter la récursion RLS
-- (même motif que `has_role`).
CREATE OR REPLACE FUNCTION public.pro_owns_cabinet(_cabinet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pro_cabinets
    WHERE id = _cabinet_id AND owner_user_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.pro_owns_cabinet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pro_owns_cabinet(uuid) TO authenticated, service_role;

-- ---------- 5) Profils clients (pseudonymisés) ----------
CREATE TABLE IF NOT EXISTS public.pro_client_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id       uuid NOT NULL REFERENCES public.pro_cabinets(id) ON DELETE CASCADE,
  -- Pseudonyme interne au cabinet (ex. « CLI-2026-014 »). Jamais un nom ou un email.
  client_ref       text NOT NULL
    CHECK (client_ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' AND position('@' IN client_ref) = 0),
  taxonomy_min_pct numeric(5,2) CHECK (taxonomy_min_pct BETWEEN 0 AND 100),
  sfdr_min_pct     numeric(5,2) CHECK (sfdr_min_pct BETWEEN 0 AND 100),
  pai_required     boolean NOT NULL DEFAULT false,
  pai_categories   text[] NOT NULL DEFAULT '{}'
    CHECK (pai_categories <@ ARRAY['ghg','biodiversity','water','waste','social']::text[]),
  collected_at     date NOT NULL,
  adapted          boolean NOT NULL DEFAULT false,
  adaptation_note  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- Une adaptation des préférences (art. 54 §10 règl. 2017/565) se documente.
  CHECK (NOT adapted OR length(btrim(coalesce(adaptation_note, ''))) > 0),
  -- Des catégories PAI n'ont de sens que si les PAI sont demandées.
  CHECK (pai_required OR cardinality(pai_categories) = 0)
);
CREATE INDEX IF NOT EXISTS pro_client_profiles_cabinet_idx
  ON public.pro_client_profiles (cabinet_id, client_ref);
ALTER TABLE public.pro_client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_client_profiles cabinet select" ON public.pro_client_profiles
  FOR SELECT TO authenticated USING (public.pro_owns_cabinet(cabinet_id));
CREATE POLICY "pro_client_profiles cabinet insert" ON public.pro_client_profiles
  FOR INSERT TO authenticated WITH CHECK (public.pro_owns_cabinet(cabinet_id));
CREATE POLICY "pro_client_profiles cabinet update" ON public.pro_client_profiles
  FOR UPDATE TO authenticated
  USING (public.pro_owns_cabinet(cabinet_id)) WITH CHECK (public.pro_owns_cabinet(cabinet_id));
CREATE POLICY "pro_client_profiles cabinet delete" ON public.pro_client_profiles
  FOR DELETE TO authenticated USING (public.pro_owns_cabinet(cabinet_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_client_profiles TO authenticated;
GRANT ALL ON public.pro_client_profiles TO service_role;

-- ---------- 6) Rapports (immuables) ----------
-- Écrits par le serveur (service role) après calcul du moteur : un cabinet ne
-- peut pas insérer lui-même des « résultats ». Il lit les siens, rien d'autre.
CREATE TABLE IF NOT EXISTS public.pro_reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id         uuid NOT NULL REFERENCES public.pro_cabinets(id) ON DELETE RESTRICT,
  -- RESTRICT : un profil cité par un rapport archivé ne se supprime pas.
  client_profile_id  uuid REFERENCES public.pro_client_profiles(id) ON DELETE RESTRICT,
  profile_snapshot   jsonb NOT NULL,
  results            jsonb NOT NULL,
  engine_version     text NOT NULL,
  data_snapshot_hash text NOT NULL CHECK (data_snapshot_hash ~ '^[0-9a-f]{64}$'),
  pdf_path           text NOT NULL,
  pdf_sha256         text NOT NULL CHECK (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pro_reports_cabinet_idx
  ON public.pro_reports (cabinet_id, created_at DESC);
ALTER TABLE public.pro_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_reports cabinet select" ON public.pro_reports
  FOR SELECT TO authenticated USING (public.pro_owns_cabinet(cabinet_id));
-- Pas de policy INSERT/UPDATE/DELETE pour authenticated : volontaire.
GRANT SELECT ON public.pro_reports TO authenticated;
GRANT SELECT, INSERT ON public.pro_reports TO service_role;

CREATE OR REPLACE FUNCTION public.pro_reports_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'pro_reports est immuable (% refusé)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
DROP TRIGGER IF EXISTS pro_reports_no_update_delete ON public.pro_reports;
CREATE TRIGGER pro_reports_no_update_delete
  BEFORE UPDATE OR DELETE ON public.pro_reports
  FOR EACH ROW EXECUTE FUNCTION public.pro_reports_immutable();
DROP TRIGGER IF EXISTS pro_reports_no_truncate ON public.pro_reports;
CREATE TRIGGER pro_reports_no_truncate
  BEFORE TRUNCATE ON public.pro_reports
  FOR EACH STATEMENT EXECUTE FUNCTION public.pro_reports_immutable();

-- ---------- 7) Listes d'UC des contrats d'assurance-vie ----------
CREATE TABLE IF NOT EXISTS public.pro_contract_uc_lists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer       text NOT NULL,
  contract_name text NOT NULL,
  isin          text NOT NULL CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  source_url    text,
  list_date     date NOT NULL,
  UNIQUE (insurer, contract_name, isin, list_date)
);
CREATE INDEX IF NOT EXISTS pro_contract_uc_lists_contract_idx
  ON public.pro_contract_uc_lists (insurer, contract_name, list_date DESC);
ALTER TABLE public.pro_contract_uc_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_contract_uc_lists readable by authenticated" ON public.pro_contract_uc_lists
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.pro_contract_uc_lists TO authenticated;
GRANT ALL ON public.pro_contract_uc_lists TO service_role;

-- ---------- 8) Stockage ----------
-- `pro-annexes` : PDF d'annexes. Le script (service role) y range
-- `<isin>/<sha256>.pdf` ; un utilisateur dépose dans `inbox/<uid>/…`, traité
-- ensuite par le script (pas d'ingestion dans le Worker).
-- `pro-reports` : PDF de rapports, rangés `<cabinet_id>/<report_id>.pdf`,
-- écrits par le serveur, lisibles par le seul cabinet propriétaire.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pro-annexes', 'pro-annexes', false), ('pro-reports', 'pro-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pro-annexes read by authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pro-annexes');
CREATE POLICY "pro-annexes inbox upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pro-annexes'
    AND (storage.foldername(name))[1] = 'inbox'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );
CREATE POLICY "pro-reports cabinet read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pro-reports'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.pro_cabinets c WHERE c.owner_user_id = auth.uid()
    )
  );
