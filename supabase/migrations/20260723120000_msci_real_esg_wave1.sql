-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 1 — Ingestion de données ESG/carbone RÉELLES depuis les divulgations
-- émetteurs (fiches produit iShares/BlackRock, données MSCI ESG Research).
--
-- Contexte : l'audit ESG a montré que 100 % des scores étaient propriétaires
-- (esg_score_source = 'seedow-internal-v1'/'yahoo') alors que l'UI annonçait
-- MSCI/Sustainalytics. On commence à raccorder de VRAIES données MSCI, actif par
-- actif, avec source ET date — de sorte que l'attribution « MSCI » devienne enfin
-- exacte pour les fonds couverts. Le reste de l'univers reste honnêtement en
-- notation propriétaire tant qu'il n'est pas raccordé.
--
-- Métrique carbone retenue : WACI (Weighted Average Carbon Intensity), en
-- tCO₂e / M$ de chiffre d'affaires — l'indicateur PAI SFDR standard publié par
-- les émetteurs, conçu pour COMPARER des fonds entre eux. C'est une intensité
-- « par revenu », PAS « par € investi » : on ne la met donc PAS dans
-- carbon_intensity_gco2e_per_eur (qui reste réservé à une future empreinte
-- « par € investi », seule base valable pour des équivalences absolues type
-- « km en voiture »). Séparer les deux métriques = pas de confusion trompeuse.
--
-- assets a déjà la RLS activée (table existante, lecture publique) : cette
-- migration n'ajoute que des colonnes + des UPDATE, aucune table utilisateur.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS waci_tco2e_per_musd_sales numeric NULL,
  ADD COLUMN IF NOT EXISTS msci_esg_quality_score numeric NULL,
  ADD COLUMN IF NOT EXISTS implied_temp_rise text NULL,
  ADD COLUMN IF NOT EXISTS esg_data_asof date NULL;

COMMENT ON COLUMN public.assets.waci_tco2e_per_musd_sales IS
  'WACI MSCI : intensité carbone moyenne pondérée, tCO2e / M$ de chiffre d''affaires (indicateur PAI SFDR, comparaison inter-fonds). NULL si non renseigné. NE PAS confondre avec carbon_intensity_gco2e_per_eur (par € investi).';
COMMENT ON COLUMN public.assets.msci_esg_quality_score IS
  'Score de qualité ESG MSCI pour fonds, échelle 0-10 (source: fiche émetteur). esg_score global = ce score ×10.';
COMMENT ON COLUMN public.assets.implied_temp_rise IS
  'MSCI Implied Temperature Rise (bande, ex. ">2.5-3.0°C") : alignement Accord de Paris estimé du fonds.';
COMMENT ON COLUMN public.assets.esg_data_asof IS
  'Date « as of » de la donnée ESG/carbone du fournisseur (traçabilité). NULL pour la notation propriétaire.';

ALTER TABLE public.assets
  ADD CONSTRAINT waci_range CHECK (waci_tco2e_per_musd_sales IS NULL OR waci_tco2e_per_musd_sales >= 0),
  ADD CONSTRAINT msci_quality_range CHECK (msci_esg_quality_score IS NULL OR (msci_esg_quality_score >= 0 AND msci_esg_quality_score <= 10));

-- ── Données vérifiées (fiches produit iShares/BlackRock, données MSCI ESG) ────
-- ESGU — iShares ESG Aware MSCI USA ETF
--   MSCI ESG Rating A · Quality 7.07/10 · WACI 69.03 tCO2e/M$ sales (cov 99.66%)
--   ITR >2.5-3.0°C · données MSCI as of 2026-04-17 (holdings 2026-03-31)
--   Source : fiche produit ESGU, ishares.com
UPDATE public.assets SET
  esg_score = 70.7,
  msci_esg_quality_score = 7.07,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-04-17',
  waci_tco2e_per_musd_sales = 69.03,
  implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-04-17T00:00:00Z'
WHERE ticker = 'ESGU';

-- ESGD — iShares ESG Aware MSCI EAFE ETF
--   MSCI ESG Rating AAA · Quality 8.65/10 · WACI 61.28 tCO2e/M$ sales (cov 98.96%)
--   ITR >2.0-2.5°C · données MSCI as of 2026-06-19 (holdings 2026-05-31)
--   Source : fiche produit ESGD, ishares.com
UPDATE public.assets SET
  esg_score = 86.5,
  msci_esg_quality_score = 8.65,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 61.28,
  implied_temp_rise = '>2.0-2.5°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'ESGD';

-- ESGE — iShares ESG Aware MSCI EM ETF
--   MSCI ESG Rating AA · Quality 7.95/10 · WACI 119.07 tCO2e/M$ sales (cov 99.17%)
--   ITR >2.5-3.0°C · données MSCI as of 2026-03-20 (holdings 2026-02-28)
--   Source : fiche produit ESGE, ishares.com
UPDATE public.assets SET
  esg_score = 79.5,
  msci_esg_quality_score = 7.95,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-03-20',
  waci_tco2e_per_musd_sales = 119.07,
  implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-03-20T00:00:00Z'
WHERE ticker = 'ESGE';
