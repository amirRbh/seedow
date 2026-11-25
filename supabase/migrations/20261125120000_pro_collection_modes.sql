-- ════════════════════════════════════════════════════════════════════════════
-- Seedow Pro — modes de recueil des préférences, profils prédéfinis, fiches de
-- recueil archivées, exclusions d'indice de référence (orientations ESMA).
-- ════════════════════════════════════════════════════════════════════════════
--
-- Références : document conjoint ACPR/AMF « Mise en œuvre des préférences en
-- matière de durabilité sous DDA et MiFID II » (nov. 2025) ; synthèse SPOT AMF
-- (fév. 2026) ; orientations ESMA34-472-440 sur les noms de fonds.

-- ---------- 1) Profils prédéfinis du cabinet ----------
-- Choix proposés au client qui ne souhaite pas détailler lui-même ses
-- préférences : chacun repose sur au moins un critère MiFID/DDA, avec des
-- minimums que le cabinet juge « suffisamment élevés » au regard de son offre.
CREATE TABLE IF NOT EXISTS public.pro_predefined_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id       uuid NOT NULL REFERENCES public.pro_cabinets(id) ON DELETE CASCADE,
  label            text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  -- Explication remise au client : critères et engagements chiffrés.
  description      text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 2000),
  taxonomy_min_pct numeric(5,2) CHECK (taxonomy_min_pct > 0 AND taxonomy_min_pct <= 100),
  sfdr_min_pct     numeric(5,2) CHECK (sfdr_min_pct > 0 AND sfdr_min_pct <= 100),
  pai_required     boolean NOT NULL DEFAULT false,
  pai_categories   text[] NOT NULL DEFAULT '{}'
    CHECK (pai_categories <@ ARRAY['ghg','biodiversity','water','waste','social']::text[]),
  archived_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (taxonomy_min_pct IS NOT NULL OR sfdr_min_pct IS NOT NULL OR pai_required),
  CHECK (pai_required OR cardinality(pai_categories) = 0)
);
CREATE INDEX IF NOT EXISTS pro_predefined_profiles_cabinet_idx
  ON public.pro_predefined_profiles (cabinet_id) WHERE archived_at IS NULL;
ALTER TABLE public.pro_predefined_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_predefined_profiles cabinet select" ON public.pro_predefined_profiles
  FOR SELECT TO authenticated USING (public.pro_owns_cabinet(cabinet_id));
CREATE POLICY "pro_predefined_profiles cabinet insert" ON public.pro_predefined_profiles
  FOR INSERT TO authenticated WITH CHECK (public.pro_owns_cabinet(cabinet_id));
-- Seul l'archivage est permis (un profil déjà proposé à des clients ne se réécrit pas).
CREATE POLICY "pro_predefined_profiles cabinet archive" ON public.pro_predefined_profiles
  FOR UPDATE TO authenticated
  USING (public.pro_owns_cabinet(cabinet_id)) WITH CHECK (public.pro_owns_cabinet(cabinet_id));
GRANT SELECT, INSERT ON public.pro_predefined_profiles TO authenticated;
GRANT UPDATE (archived_at) ON public.pro_predefined_profiles TO authenticated;
GRANT ALL ON public.pro_predefined_profiles TO service_role;

-- ---------- 2) Mode de recueil sur le profil client ----------
--   neutral    : le client ne souhaite pas que la durabilité soit prise en compte
--                (ou ne répond pas) — ACPR/AMF : client « neutre » ;
--   detailed   : le client détaille lui-même les critères (a), (b), (c) ;
--   predefined : le client choisit un profil prédéfini du cabinet.
ALTER TABLE public.pro_client_profiles
  ADD COLUMN IF NOT EXISTS preference_mode text NOT NULL DEFAULT 'detailed'
    CHECK (preference_mode IN ('neutral', 'detailed', 'predefined')),
  ADD COLUMN IF NOT EXISTS predefined_profile_id uuid
    REFERENCES public.pro_predefined_profiles(id) ON DELETE RESTRICT,
  -- Copie figée du profil prédéfini au moment du recueil (il peut être archivé ensuite).
  ADD COLUMN IF NOT EXISTS predefined_label text,
  ADD COLUMN IF NOT EXISTS predefined_description text,
  -- Compte joint : une fiche par co-titulaire (synthèse SPOT AMF §3.3.2).
  ADD COLUMN IF NOT EXISTS joint_account boolean NOT NULL DEFAULT false;

ALTER TABLE public.pro_client_profiles
  ADD CONSTRAINT pro_client_profiles_mode_consistency CHECK (
    (preference_mode = 'neutral'
      AND taxonomy_min_pct IS NULL AND sfdr_min_pct IS NULL AND NOT pai_required
      AND predefined_profile_id IS NULL)
    OR (preference_mode = 'detailed' AND predefined_profile_id IS NULL)
    OR (preference_mode = 'predefined'
      AND predefined_profile_id IS NOT NULL AND predefined_label IS NOT NULL
      AND predefined_description IS NOT NULL)
  ) NOT VALID;
-- NOT VALID : les profils existants (tous « detailed » par défaut) restent
-- valides ; la contrainte s'applique à toute nouvelle ligne.

-- ---------- 3) Fiches de recueil (immuables) ----------
-- Trace sur support durable des explications données et des choix du client
-- (art. 54 §1 du règlement délégué 2017/565 ; synthèse SPOT §3.3.1).
CREATE TABLE IF NOT EXISTS public.pro_collection_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id        uuid NOT NULL REFERENCES public.pro_cabinets(id) ON DELETE RESTRICT,
  client_profile_id uuid NOT NULL REFERENCES public.pro_client_profiles(id) ON DELETE RESTRICT,
  snapshot          jsonb NOT NULL,
  pdf_path          text NOT NULL,
  pdf_sha256        text NOT NULL CHECK (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pro_collection_records_profile_idx
  ON public.pro_collection_records (client_profile_id, created_at DESC);
ALTER TABLE public.pro_collection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_collection_records cabinet select" ON public.pro_collection_records
  FOR SELECT TO authenticated USING (public.pro_owns_cabinet(cabinet_id));
GRANT SELECT ON public.pro_collection_records TO authenticated;
GRANT SELECT, INSERT ON public.pro_collection_records TO service_role;
DROP TRIGGER IF EXISTS pro_collection_records_no_update_delete ON public.pro_collection_records;
CREATE TRIGGER pro_collection_records_no_update_delete
  BEFORE UPDATE OR DELETE ON public.pro_collection_records
  FOR EACH ROW EXECUTE FUNCTION public.pro_reports_immutable();
DROP TRIGGER IF EXISTS pro_collection_records_no_truncate ON public.pro_collection_records;
CREATE TRIGGER pro_collection_records_no_truncate
  BEFORE TRUNCATE ON public.pro_collection_records
  FOR EACH STATEMENT EXECUTE FUNCTION public.pro_reports_immutable();

-- ---------- 4) Exclusions d'indice de référence déclarées par l'annexe ----------
-- 'pab' | 'ctb' | 'not_stated' (cherchées, non trouvées) ; NULL = non évalué
-- (extractions antérieures au prompt v2).
ALTER TABLE public.pro_fund_sustainability_data
  ADD COLUMN IF NOT EXISTS benchmark_exclusions text
    CHECK (benchmark_exclusions IN ('pab', 'ctb', 'not_stated'));

-- La vue développe s.* à sa création : on la recrée pour exposer la colonne.
DROP VIEW IF EXISTS public.pro_fund_current_data;
CREATE VIEW public.pro_fund_current_data
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
