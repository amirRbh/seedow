-- ─────────────────────────────────────────────────────────
-- Reconstitution du catalogue après désactivation des 26 actifs à ISIN
-- invalide (cf. 20260716160000_fix_investable_universe.sql).
--
-- Pour chacun des tickers ci-dessous, recherche d'un fonds réel de
-- substitution dans la même catégorie/thème, vérifié en 2 temps :
--   1. présence dans l'index de recherche Yahoo Finance (nom du fonds)
--   2. cours live effectivement renvoyé par l'endpoint chart Yahoo Finance
--      (le vrai test : un fonds retiré de cote apparaît parfois encore
--      dans l'index de recherche mais ne renvoie plus de prix)
--
-- L'ISIN d'origine (fabriqué, motif IE00BMDPB* séquentiel) est mis à NULL
-- plutôt que remplacé par un ISIN deviné : on ne l'a pas vérifié aussi
-- rigoureusement que le symbole/nom (confirmés tous les deux), donc on
-- n'affirme pas une donnée qu'on n'a pas confirmée avec certitude.
--
-- Pas de substitut réel trouvé (recherché mais introuvable) pour :
--   SOVR, XGRB (green bonds — doublons non nécessaires, 4 fonds déjà couverts)
--   SOCB, SOCG, SUST (social bonds — pas de véhicule UCITS coté dédié trouvé)
--   IBTL (souverains — 2/3 déjà couverts, pas de 3e fonds distinct trouvé)
--   GBLD (REIT — seuls des REIT non filtrés ESG trouvés ; pas ajoutés pour
--         ne pas présenter un fonds non-ESG dans un catalogue ESG)
-- Ces 7 restent désactivés — catégories plus étroites mais 100% honnêtes.
-- ─────────────────────────────────────────────────────────

-- Actions développées (3 substituts)
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

-- Actions émergentes (3 substituts — catégorie entièrement reconstituée)
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

-- Thématiques (7 substituts)
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

-- Green bonds (3 substituts, en plus de GREB déjà mappé)
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

-- Matières premières (1 substitut — catégorie entièrement reconstituée)
UPDATE public.assets SET
  yahoo_symbol = 'VOLT.MI', isin = NULL, is_active = true,
  name = 'WisdomTree Battery Solutions UCITS ETF', issuer = 'WisdomTree', currency = 'EUR', region = 'world'
WHERE ticker = 'CMET';
