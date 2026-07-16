-- ─────────────────────────────────────────────────────────
-- Nettoyage de l'univers investissable après audit ISIN manuel (16/07).
--
-- Sur les 37 actifs actifs sans cours, vérification un par un via
-- l'API de recherche Yahoo Finance par ISIN (le seul identifiant fiable —
-- le ticker seul produit des collisions dangereuses, ex: SUSU pointait vers
-- un fonds obligataire réel alors que le catalogue le décrit en actions S&P 500) :
--
--   - 6 ISIN confirmés : le fonds réel trouvé correspond au nom du catalogue.
--   - 5 ISIN plausibles : rebrand Lyxor→Amundi (Amundi a absorbé Lyxor en 2021,
--     ISIN conservé, nom parfois raccourci) ou fonds retrouvé par nom exact
--     faute d'ISIN en base — à revérifier visuellement contre le prospectus
--     si un doute apparaît en usage.
--   - 26 ISIN invalides : soit ils ne correspondent à AUCUN instrument coté
--     réel (probablement des identifiants placeholder du seed initial —
--     motif suspect IE00BMDPB* avec suffixes séquentiels), soit ils pointent
--     vers un fonds réel mais totalement différent (mauvaise région, mauvais
--     émetteur, mauvaise stratégie). Désactivés plutôt que laissés en l'état :
--     présenter un produit financier fictif ou mal identifié comme
--     investissable est plus grave qu'un simple "cours indisponible".
-- ─────────────────────────────────────────────────────────

-- ── 6 mappings confirmés (nom du fonds vérifié via ISIN) ──
UPDATE public.assets SET yahoo_symbol = 'HTWO.MI' WHERE ticker = 'HTWO'; -- L&G Hydrogen Economy UCITS ETF
UPDATE public.assets SET yahoo_symbol = 'IH2O.L'  WHERE ticker = 'IH2O'; -- iShares Global Water UCITS ETF USD (Dist)
UPDATE public.assets SET yahoo_symbol = 'INRG.L'  WHERE ticker = 'INRG'; -- iShares Global Clean Energy Transition UCITS ETF
UPDATE public.assets SET yahoo_symbol = 'SUSW.L'  WHERE ticker = 'LDEM'; -- iShares MSCI World SRI UCITS ETF EUR (Acc)
UPDATE public.assets SET yahoo_symbol = 'SNAW.DE' WHERE ticker = 'SUSW'; -- iShares MSCI World Screened UCITS ETF USD (Acc)
UPDATE public.assets SET yahoo_symbol = 'XZW0.DE' WHERE ticker = 'SADE'; -- Xtrackers MSCI World ESG UCITS ETF 1C

-- ── 5 mappings plausibles (à re-confirmer visuellement en cas de doute) ──
UPDATE public.assets SET yahoo_symbol = 'A4H8.DE' WHERE ticker = 'AECB'; -- Amundi EUR Corporate Bond ESG UCITS ETF DR (C)
UPDATE public.assets SET yahoo_symbol = 'CEMJ.DE' WHERE ticker = 'ESCG'; -- iShares $ Corp Bond ESG SRI UCITS ETF EUR Hedged (Acc)
UPDATE public.assets SET yahoo_symbol = 'CLIM.PA' WHERE ticker = 'GREB'; -- ex-Lyxor Green Bond DR → Amundi Global Aggregate Green Bond UCITS ETF
UPDATE public.assets SET yahoo_symbol = 'SEGA.L'  WHERE ticker = 'IEGA'; -- iShares Core € Govt Bond UCITS ETF EUR (Dist)
UPDATE public.assets SET yahoo_symbol = 'EGOV.PA' WHERE ticker = 'SAGG'; -- ex-Lyxor ESG Euro Govt Bond → Amundi Core Euro Government Bond UCITS ETF

-- ── 26 actifs désactivés : ISIN inexistant ou pointant vers un tout autre fonds ──
UPDATE public.assets SET is_active = false
WHERE ticker IN (
  -- ISIN pointant vers un fonds réel mais complètement différent (11)
  'EESG', 'EUSD', 'SUSU', 'UB39', '5MVL', 'EMSR', 'SUSM', 'CIRC', 'NUKL', 'SDG', 'SMRT',
  -- ISIN ne correspondant à aucun instrument coté (15)
  'AIQU', 'GREN', 'TECH', 'GBNX', 'GRNB', 'SOVR', 'SUOE', 'XGRB',
  'SOCB', 'SOCG', 'SUST', 'IBTL', 'GBLD', 'AGRC', 'CMET'
);
