-- ─────────────────────────────────────────────────────────
-- Provenance des statistiques risque/rendement des actifs (moteur v1.3).
--
-- Le moteur de portefeuille doit pouvoir distinguer un μ/σ estimé sur un
-- historique de marché réel suffisant d'une simple valeur de seed (chiffre
-- non observé). Sans cette provenance, une valeur inventée circule en silence
-- dans l'optimiseur — contraire à la règle « ne jamais inventer de donnée »
-- (CLAUDE.md §1.3).
--
--   * stats_observations : nombre de rendements quotidiens réellement utilisés
--     par /hooks/recompute-risk-model pour estimer expected_return/volatility.
--     NULL = le modèle de risque n'a jamais tourné sur cet actif (μ/σ = seed).
--   * stats_updated_at    : horodatage du dernier recalcul depuis le marché.
--
-- Colonnes nullable, purement additives. Aucune donnée n'est écrite ici : le
-- backfill se fait au prochain passage du cron de recalcul (données réelles).
-- La table `assets` est en lecture publique (univers investissable) ; ces deux
-- colonnes ne portent aucune donnée utilisateur → pas de changement de RLS.
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS stats_observations integer,
  ADD COLUMN IF NOT EXISTS stats_updated_at timestamptz;

COMMENT ON COLUMN public.assets.stats_observations IS
  'Nb d''observations (rendements quotidiens) ayant servi à estimer expected_return/volatility. NULL = valeur de seed (jamais recalculée depuis le marché).';
COMMENT ON COLUMN public.assets.stats_updated_at IS
  'Horodatage du dernier recalcul du modèle de risque depuis l''historique réel des cours.';
