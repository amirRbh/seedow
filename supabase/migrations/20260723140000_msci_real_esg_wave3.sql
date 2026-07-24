-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 3 — Ingestion de données MSCI ESG réelles (suite des vagues 1 & 2).
-- Même contrat de transparence : source + date « as of » par actif. Données
-- vérifiées sur les fiches produit iShares/BlackRock (données MSCI ESG),
-- toutes as of 2026-06-19 (holdings 2026-05-31).
--
--   SUSL — iShares ESG MSCI USA Leaders ETF   : AA · 7.23 · WACI 48.94  · ITR >2.5-3.0°C
--   ICLN — iShares Global Clean Energy ETF    : A  · 6.91 · WACI 299.74 · ITR >1.5-2.0°C
--   SUSC — iShares ESG Aware USD Corp Bond ETF: AA · 7.76 · WACI 142.96 · ITR >2.0-2.5°C
--   SUSB — iShares ESG Aware 1-5y USD Corp Bond: AA · 8.28 · WACI 110.43 · ITR >2.0-2.5°C
--
-- Note honnête : ICLN (clean energy) a un WACI élevé (fabricants d'équipements
-- énergétiques, intensité carbone/CA forte) MAIS le meilleur ITR (>1.5-2.0°C,
-- le plus aligné Paris) — c'est la nuance que l'intensité seule ne dit pas.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.assets SET
  esg_score = 72.3, msci_esg_quality_score = 7.23,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)', esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 48.94, implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSL';

UPDATE public.assets SET
  esg_score = 69.1, msci_esg_quality_score = 6.91,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)', esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 299.74, implied_temp_rise = '>1.5-2.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'ICLN';

UPDATE public.assets SET
  esg_score = 77.6, msci_esg_quality_score = 7.76,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)', esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 142.96, implied_temp_rise = '>2.0-2.5°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSC';

UPDATE public.assets SET
  esg_score = 82.8, msci_esg_quality_score = 8.28,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)', esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 110.43, implied_temp_rise = '>2.0-2.5°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'SUSB';
