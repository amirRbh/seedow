-- =========================================================
-- PREUVE ESG/SFDR — colonnes additives sur le ledger existant (§7, §15)
-- =========================================================
-- Le pipeline SFDR (src/lib/esg/sfdr-pipeline) réutilise le ledger de provenance
-- DÉJÀ en place (data_sources / fund_documents / data_observations, migration
-- data_engine_foundation) plutôt que de créer une table redondante (§9).
--
-- Il manque seulement, pour répondre à « pourquoi cet ETF est-il Article 8 ? »
-- avec une preuve reproductible :
--   1. evidence_text  — le snippet EXACT du document qui prouve la classification
--   2. parser_version — version du parseur ayant produit la valeur (repro §15)
--   3. document_id    — lien vers le document officiel (fund_documents) d'où
--                        la preuve est extraite
--
-- 100 % additif : aucune donnée touchée, aucune contrainte durcie, RLS inchangée
-- (les policies de data_observations couvrent déjà ces colonnes). Aucune donnée
-- insérée — le pipeline remplit ces colonnes à l'exécution.
-- =========================================================

ALTER TABLE public.data_observations
  ADD COLUMN IF NOT EXISTS evidence_text  text,
  ADD COLUMN IF NOT EXISTS parser_version integer,
  ADD COLUMN IF NOT EXISTS document_id    uuid REFERENCES public.fund_documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.data_observations.evidence_text IS
  'Snippet exact du document officiel prouvant la valeur (ex. « The Fund is classified as an Article 8 product »). §7 : traçabilité, Seedow doit pouvoir montrer la preuve.';
COMMENT ON COLUMN public.data_observations.parser_version IS
  'Version du parseur ayant produit la valeur (reproductibilité §15). Un changement de logique incrémente cette version.';
COMMENT ON COLUMN public.data_observations.document_id IS
  'Document officiel (fund_documents) dont la preuve est extraite. NULL si l''observation ne provient pas d''un document.';

-- Index pour retrouver toutes les observations issues d'un document donné.
CREATE INDEX IF NOT EXISTS data_observations_document_idx
  ON public.data_observations (document_id)
  WHERE document_id IS NOT NULL;
