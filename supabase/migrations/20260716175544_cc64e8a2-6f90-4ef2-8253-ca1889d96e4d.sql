-- ── 6 mappings confirmés (nom du fonds vérifié via ISIN) ──
UPDATE public.assets SET yahoo_symbol = 'HTWO.MI' WHERE ticker = 'HTWO';
UPDATE public.assets SET yahoo_symbol = 'IH2O.L'  WHERE ticker = 'IH2O';
UPDATE public.assets SET yahoo_symbol = 'INRG.L'  WHERE ticker = 'INRG';
UPDATE public.assets SET yahoo_symbol = 'SUSW.L'  WHERE ticker = 'LDEM';
UPDATE public.assets SET yahoo_symbol = 'SNAW.DE' WHERE ticker = 'SUSW';
UPDATE public.assets SET yahoo_symbol = 'XZW0.DE' WHERE ticker = 'SADE';

-- ── 5 mappings plausibles ──
UPDATE public.assets SET yahoo_symbol = 'A4H8.DE' WHERE ticker = 'AECB';
UPDATE public.assets SET yahoo_symbol = 'CEMJ.DE' WHERE ticker = 'ESCG';
UPDATE public.assets SET yahoo_symbol = 'CLIM.PA' WHERE ticker = 'GREB';
UPDATE public.assets SET yahoo_symbol = 'SEGA.L'  WHERE ticker = 'IEGA';
UPDATE public.assets SET yahoo_symbol = 'EGOV.PA' WHERE ticker = 'SAGG';

-- ── 26 actifs désactivés : ISIN inexistant ou pointant vers un tout autre fonds ──
UPDATE public.assets SET is_active = false
WHERE ticker IN (
  'EESG', 'EUSD', 'SUSU', 'UB39', '5MVL', 'EMSR', 'SUSM', 'CIRC', 'NUKL', 'SDG', 'SMRT',
  'AIQU', 'GREN', 'TECH', 'GBNX', 'GRNB', 'SOVR', 'SUOE', 'XGRB',
  'SOCB', 'SOCG', 'SUST', 'IBTL', 'GBLD', 'AGRC', 'CMET'
);

-- ─────────────────────────────────────────────────────────
-- Reconstitution : substituts vérifiés
-- ─────────────────────────────────────────────────────────

-- Actions développées
UPDATE public.assets SET
  yahoo_symbol = 'ESGL.SW', isin = NULL, is_active = true,
  name = 'Amundi MSCI Europe ESG Selection UCITS ETF', issuer = 'Amundi', currency = 'CHF', region = 'europe'
WHERE ticker = 'EESG';

UPDATE public.assets SET
  yahoo_symbol = 'IESE.AS', isin = NULL, is_active = true,
  name = 'iShares MSCI Europe SRI UCITS ETF', issuer = 'iShares', currency = 'EUR', region = 'europe'
WHERE ticker = 'EUSD';

UPDATE public.assets SET
  yahoo_symbol = 'ESPX.AS', isin = NULL, is_active = true,
  name = 'iShares S&P 500 Scored and Screened UCITS ETF', issuer = 'iShares', currency = 'USD', region = 'us'
WHERE ticker = 'SUSU';

UPDATE public.assets SET
  yahoo_symbol = 'PACSI.SW', isin = NULL, is_active = true,
  name = 'UBS MSCI Pacific Socially Responsible UCITS ETF', issuer = 'UBS', currency = 'USD', region = 'pacific'
WHERE ticker = 'UB39';

-- Actions émergentes
UPDATE public.assets SET
  yahoo_symbol = 'XZEM.L', isin = NULL, is_active = true,
  name = 'Xtrackers MSCI Emerging Markets ESG UCITS ETF', issuer = 'Xtrackers', currency = 'USD', region = 'em'
WHERE ticker = '5MVL';

UPDATE public.assets SET
  yahoo_symbol = 'EMSR.L', isin = NULL, is_active = true,
  name = 'UBS MSCI EM Socially Responsible UCITS ETF', issuer = 'UBS', currency = 'GBP', region = 'em'
WHERE ticker = 'EMSR';

UPDATE public.assets SET
  yahoo_symbol = 'SUSM.MI', isin = NULL, is_active = true,
  name = 'iShares MSCI EM SRI UCITS ETF', issuer = 'iShares', currency = 'EUR', region = 'em'
WHERE ticker = 'SUSM';

-- Thématiques
UPDATE public.assets SET
  yahoo_symbol = 'RBOT.MI', isin = NULL, is_active = true,
  name = 'iShares Automation & Robotics UCITS ETF', issuer = 'iShares', currency = 'EUR', region = 'world'
WHERE ticker = 'AIQU';

UPDATE public.assets SET
  yahoo_symbol = 'REUSE.PA', isin = NULL, is_active = true,
  name = 'BNP Paribas Easy ECPI Circular Economy Leaders UCITS ETF', issuer = 'BNP Paribas', currency = 'EUR', region = 'world'
WHERE ticker = 'CIRC';

UPDATE public.assets SET
  yahoo_symbol = 'ISPY.L', isin = NULL, is_active = true,
  name = 'L&G Cyber Security UCITS ETF', issuer = 'L&G', currency = 'GBP', region = 'world'
WHERE ticker = 'GREN';

UPDATE public.assets SET
  yahoo_symbol = 'NUCL.L', isin = NULL, is_active = true,
  name = 'VanEck Uranium and Nuclear Technologies UCITS ETF', issuer = 'VanEck', currency = 'USD', region = 'world'
WHERE ticker = 'NUKL';

UPDATE public.assets SET
  yahoo_symbol = 'GENE.L', isin = NULL, is_active = true,
  name = 'UBS Global Gender Equality UCITS ETF', issuer = 'UBS', currency = 'GBP', region = 'world'
WHERE ticker = 'SDG';

UPDATE public.assets SET
  yahoo_symbol = 'CITY.AS', isin = NULL, is_active = true,
  name = 'iShares Smart City Infrastructure UCITS ETF', issuer = 'iShares', currency = 'USD', region = 'world'
WHERE ticker = 'SMRT';

UPDATE public.assets SET
  yahoo_symbol = 'SHLD.L', isin = NULL, is_active = true,
  name = 'iShares Digital Security UCITS ETF', issuer = 'iShares', currency = 'USD', region = 'world'
WHERE ticker = 'TECH';

-- Green bonds
UPDATE public.assets SET
  yahoo_symbol = 'XGBE.DE', isin = NULL, is_active = true,
  name = 'Xtrackers EUR Corporate Green Bond UCITS ETF', issuer = 'Xtrackers', currency = 'EUR', region = 'europe'
WHERE ticker = 'GBNX';

UPDATE public.assets SET
  yahoo_symbol = 'GRON.DE', isin = NULL, is_active = true,
  name = 'iShares € Green Bond UCITS ETF', issuer = 'iShares', currency = 'EUR', region = 'europe'
WHERE ticker = 'GRNB';

UPDATE public.assets SET
  yahoo_symbol = 'FLRG.DE', isin = NULL, is_active = true,
  name = 'Franklin Sustainable Euro Green Bond UCITS ETF', issuer = 'Franklin Templeton', currency = 'EUR', region = 'europe'
WHERE ticker = 'SUOE';

-- Matières premières
UPDATE public.assets SET
  yahoo_symbol = 'VOLT.MI', isin = NULL, is_active = true,
  name = 'WisdomTree Battery Solutions UCITS ETF', issuer = 'WisdomTree', currency = 'EUR', region = 'world'
WHERE ticker = 'CMET';