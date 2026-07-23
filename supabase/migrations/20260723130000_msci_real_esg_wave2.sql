-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 2 — Ingestion de données MSCI ESG réelles (suite de la vague 1).
-- Même méthode/contrat de transparence : source + date « as of » par actif.
-- Donnée vérifiée sur la fiche produit iShares/BlackRock (données MSCI ESG).
--
-- DSI — iShares ESG MSCI KLD 400 ETF
--   MSCI ESG Rating AA · Quality 7.29/10 · WACI 52.99 tCO2e/M$ sales (cov 99.78%)
--   ITR >2.5-3.0°C · données MSCI as of 2026-06-19 (holdings 2026-05-31)
--   Source : fiche produit DSI, ishares.com
-- ─────────────────────────────────────────────────────────────────────────────

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
