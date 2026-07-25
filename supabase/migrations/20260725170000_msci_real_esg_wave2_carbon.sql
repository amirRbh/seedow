-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 2 — Ingestion de données ESG/carbone RÉELLES (WACI) pour 7 fonds iShares
-- supplémentaires, dans la continuité de la vague 1 (ESGU/ESGD/ESGE).
--
-- Objectif produit : élargir la COUVERTURE carbone du portefeuille pour que le
-- bloc impact (ImpactHero / certificat / miroir) affiche l'intensité WACI réelle
-- + la comparaison à l'ETF Monde, au lieu de retomber sur « en cours de mesure ».
--
-- Provenance : fiches produit iShares (ishares.com/us), section « Sustainability
-- Characteristics », données MSCI ESG Research. Chaque valeur a été extraite en
-- exécution par `scripts/ingest-issuer-esg.ts` (parser `parseISharesFactSheet`,
-- testé) — aucune valeur saisie « de mémoire » (contrat de transparence §1.2).
--
-- Métrique : WACI (tCO₂e / M$ de CA), intensité « par revenu » (indicateur PAI
-- SFDR). NE PAS confondre avec carbon_intensity_gco2e_per_eur (par € investi),
-- qui reste réservé à une future divulgation. Colonnes déjà créées par la vague 1
-- → cette migration ne fait que des UPDATE (aucune table utilisateur touchée).
-- ─────────────────────────────────────────────────────────────────────────────

-- DSI — iShares ESG MSCI KLD 400 Social ETF
--   MSCI ESG Rating AA · Quality 7.29/10 · WACI 52.99 tCO2e/M$ · ITR >2.5-3.0°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit DSI, ishares.com
UPDATE public.assets SET
  esg_score = 72.9,
  msci_esg_quality_score = 7.29,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 52.99,
  implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'DSI';

-- SUSL — iShares ESG MSCI USA Leaders ETF
--   MSCI ESG Rating AA · Quality 7.23/10 · WACI 48.94 tCO2e/M$ · ITR >2.5-3.0°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit SUSL, ishares.com
UPDATE public.assets SET
  esg_score = 72.3,
  msci_esg_quality_score = 7.23,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 48.94,
  implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSL';

-- EAGG — iShares ESG Aware U.S. Aggregate Bond ETF (obligataire : pas d'ITR publié)
--   MSCI ESG Rating A · Quality 6.71/10 · WACI 135.49 tCO2e/M$
--   Données MSCI as of 2026-06-19 · Source : fiche produit EAGG, ishares.com
UPDATE public.assets SET
  esg_score = 67.1,
  msci_esg_quality_score = 6.71,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 135.49,
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'EAGG';

-- ICLN — iShares Global Clean Energy ETF
--   MSCI ESG Rating A · Quality 6.91/10 · WACI 299.74 tCO2e/M$ · ITR >1.5-2.0°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit ICLN, ishares.com
UPDATE public.assets SET
  esg_score = 69.1,
  msci_esg_quality_score = 6.91,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 299.74,
  implied_temp_rise = '>1.5-2.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'ICLN';

-- SUSC — iShares ESG Aware USD Corporate Bond ETF
--   MSCI ESG Rating AA · Quality 7.76/10 · WACI 142.96 tCO2e/M$ · ITR >2.0-2.5°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit SUSC, ishares.com
UPDATE public.assets SET
  esg_score = 77.6,
  msci_esg_quality_score = 7.76,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 142.96,
  implied_temp_rise = '>2.0-2.5°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSC';

-- SUSB — iShares ESG Aware 1-5 Year USD Corporate Bond ETF
--   MSCI ESG Rating AA · Quality 8.28/10 · WACI 110.43 tCO2e/M$ · ITR >2.0-2.5°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit SUSB, ishares.com
UPDATE public.assets SET
  esg_score = 82.8,
  msci_esg_quality_score = 8.28,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 110.43,
  implied_temp_rise = '>2.0-2.5°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSB';

-- BGRN — iShares USD Green Bond ETF
--   MSCI ESG Rating A · Quality 6.82/10 · WACI 757.34 tCO2e/M$ · ITR >2.5-3.0°C
--   Données MSCI as of 2026-06-19 · Source : fiche produit BGRN, ishares.com
--   (WACI élevé attendu : green bonds financent des projets d'infrastructure
--   énergétique — l'intensité par revenu de l'émetteur reste élevée.)
UPDATE public.assets SET
  esg_score = 68.2,
  msci_esg_quality_score = 6.82,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)',
  esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 757.34,
  implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'BGRN';
