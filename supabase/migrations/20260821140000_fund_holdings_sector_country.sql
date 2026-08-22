-- ─────────────────────────────────────────────────────────────────────────────
-- PIU — sector/pays du titre sous-jacent sur `fund_holdings` (look-through, §7/§9).
--
-- Le CSV de composition officiel (iShares…) porte déjà, PAR LIGNE, le secteur et
-- le pays du titre. Le parser les extrait (`ParsedHolding.sector/.country`) mais
-- ils étaient jusqu'ici jetés à la persistance. On les conserve désormais,
-- DÉNORMALISÉS sur la ligne de holding (sourcés depuis le même document daté),
-- pour alimenter directement le profil look-through « ce que ton argent finance »
-- (répartition sectorielle et géographique) sans dépendre d'une réconciliation
-- `securities` (qui reste un chantier ultérieur pour l'identité fine des titres).
--
-- Colonnes NULLABLES : NULL = le document ne fournit pas l'info (jamais inventée,
-- §1.3). Aucune donnée insérée ici ; RLS inchangée (colonnes héritées de la table).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.fund_holdings
  ADD COLUMN IF NOT EXISTS security_sector text NULL,
  ADD COLUMN IF NOT EXISTS security_country text NULL;

COMMENT ON COLUMN public.fund_holdings.security_sector IS
  'Secteur du titre sous-jacent, tel que fourni par le document de composition. NULL = non fourni (jamais inventé).';
COMMENT ON COLUMN public.fund_holdings.security_country IS
  'Pays du titre sous-jacent, tel que fourni par le document de composition. NULL = non fourni.';

-- La vue « dernière composition connue » reprend toutes les colonnes (SELECT h.*),
-- elle expose donc automatiquement les nouvelles. On la recrée par sécurité.
CREATE OR REPLACE VIEW public.fund_latest_holdings AS
SELECT h.*
FROM public.fund_holdings h
WHERE h.as_of = (
  SELECT max(h2.as_of) FROM public.fund_holdings h2 WHERE h2.asset_id = h.asset_id
);
