-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 4 — Ingestion MSCI ESG réelle (fiche iShares, données MSCI as of 2026-06-19).
-- Extraite via le pipeline scriptable curl + unpdf + parseur (voir
-- scripts/ingest-issuer-esg.ts) — même contrat de transparence (source + date).
--
--   BGRN — iShares USD Green Bond ETF : A · 6.82/10 · WACI 757.34 · ITR >2.5-3.0°C
--
-- Note honnête : WACI très élevé (757) pour un fonds d'obligations vertes — les
-- green bonds financent souvent la TRANSITION d'émetteurs aujourd'hui intensifs
-- en carbone (utilities, industrie), d'où une intensité carbone/CA des émetteurs
-- élevée. C'est réel et contre-intuitif : l'intensité seule ne dit pas l'usage
-- des fonds. Affiché tel quel.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.assets SET
  esg_score = 68.2, msci_esg_quality_score = 6.82,
  esg_score_source = 'MSCI ESG Fund Ratings (iShares fact sheet)', esg_data_asof = '2026-06-19',
  waci_tco2e_per_musd_sales = 757.34, implied_temp_rise = '>2.5-3.0°C',
  carbon_intensity_source = 'MSCI WACI (iShares fact sheet)',
  carbon_intensity_updated_at = '2026-06-19T00:00:00Z'
WHERE ticker = 'BGRN';
