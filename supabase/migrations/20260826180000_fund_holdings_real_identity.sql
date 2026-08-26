-- ─────────────────────────────────────────────────────────────────────────────
-- fund_holdings : l'identité d'une ligne, telle que les fichiers réels la
-- publient.
--
-- ── Ce que les fichiers réels ont montré ────────────────────────────────────
--
-- Le schéma identifiait une position par (asset_id, security_name, as_of). Cette
-- hypothèse ne survit pas au premier fichier officiel téléchargé :
--
--   · iShares Global Corp Bond (IE00B7J7TB45) publie 14 978 lignes, dont 2 077
--     noms répétés — « AT&T INC » 80 fois, « VERIZON COMMUNICATIONS INC » 75
--     fois. Ce ne sont pas des doublons : ce sont 80 obligations AT&T
--     différentes, distinguées par leur ÉCHÉANCE et leur COUPON, deux colonnes
--     que l'émetteur publie et que le pipeline jetait.
--   · iShares Core MSCI World (IE00B4L5Y983) répète 14 noms, dont
--     « CHOCOLADEFABRIKEN LINDT & SPRUENGL » : le fonds détient l'action
--     nominative (LISN) et le bon de participation (LISP), deux lignes cotées
--     distinctes.
--
-- Sous l'ancienne clé, ces positions s'écrasaient les unes les autres à
-- l'insertion. Aucune erreur n'aurait été levée : la composition enregistrée
-- aurait simplement été une composition que l'émetteur n'a jamais publiée —
-- exactement ce que le contrat de transparence interdit (CLAUDE.md §1.3).
--
-- ── Pourquoi la clé est le RANG, et pas l'échéance ─────────────────────────
--
-- L'échéance et le coupon séparent les 80 obligations AT&T. Ils ne séparent pas
-- tout, et le même fichier le prouve : deux tranches HSBC y portent la même
-- échéance ET le même coupon, deux sociétés distinctes y figurent sous le sigle
-- « EQT », et l'export du iShares Core MSCI EM IMI publie jusqu'à douze jambes
-- de change « SAR/USD » que rien ne distingue. L'émetteur lui-même ne les
-- départage pas dans ce document.
--
-- Fusionner ces lignes perdrait des positions réelles ; sommer leurs poids
-- fabriquerait une ligne jamais publiée. La clé retenue est donc le RANG de la
-- ligne dans le document — la seule qui restitue le fichier tel quel. Il est
-- stable pour un fichier donné : ré-ingérer la même date réécrit les mêmes
-- lignes au lieu d'en empiler des copies.
--
-- L'échéance et le coupon restent persistés : ils ne servent plus de clé, mais
-- ils sont ce qui permet à l'interface de dire QUELLE obligation AT&T est
-- détenue.
--
-- ── Poids négatifs ─────────────────────────────────────────────────────────
--
-- Cinq des vingt et un fonds vérifiés publient une ligne à poids négatif : un
-- compte de liquidités à découvert (« USD CASH −0,39 % »), une jambe de change
-- à terme (« JPY/GBP −0,04 % »). Le CHECK à zéro les refusait. Ce sont des
-- positions réelles, publiées par l'émetteur ; les écarter revenait à publier
-- une composition amputée. La borne devient l'implausible : une ligne ne peut
-- pas peser plus que le fonds entier, dans un sens comme dans l'autre.
--
-- RLS : inchangée (lecture `authenticated`, écriture `service_role`) — la table
-- existe déjà et sa politique reste celle de la migration fondatrice.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Colonnes publiées par l'émetteur, jusqu'ici lues puis jetées.
--
-- `security_sector` mérite une mention à part : le parser le lisait depuis
-- toujours, les 29 941 lignes réelles en portent un sans exception, et le bloc
-- « Ce qu'il y a derrière ton investissement » est bâti autour de lui — il
-- annonce le secteur dominant AVANT la liste des titres, parce que c'est ce qui
-- décrit vraiment une exposition. Mais la colonne n'existait pas : le lecteur
-- renvoyait `sector: null` en dur, et ce bloc n'aurait jamais rien pu montrer.
ALTER TABLE public.fund_holdings
  ADD COLUMN IF NOT EXISTS security_sector       text,
  ADD COLUMN IF NOT EXISTS security_maturity     text,
  ADD COLUMN IF NOT EXISTS security_coupon_pct   numeric(9,4),
  ADD COLUMN IF NOT EXISTS security_asset_class  text;

COMMENT ON COLUMN public.fund_holdings.security_sector IS
  'Secteur tel que publié par l''émetteur (« Information Technology », « Treasury »…). Non déduit.';

COMMENT ON COLUMN public.fund_holdings.security_maturity IS
  'Échéance telle que publiée par l''émetteur (fonds obligataires). NULL en actions : la colonne n''existe pas dans leur export, elle n''est pas déduite.';
COMMENT ON COLUMN public.fund_holdings.security_coupon_pct IS
  'Coupon (%) tel que publié. Avec l''échéance, c''est ce qui distingue deux obligations du même émetteur.';
COMMENT ON COLUMN public.fund_holdings.security_asset_class IS
  'Classe d''actif telle que publiée (« Equity », « Fixed Income », « Cash »…).';

-- 2) Rang de la ligne dans le document publié.
--    NOT NULL avec un défaut : la table est vide en production (aucune
--    composition n'a jamais été ingérée), mais un défaut évite qu'une écriture
--    plus ancienne, oubliée quelque part, échoue au déploiement.
ALTER TABLE public.fund_holdings
  ADD COLUMN IF NOT EXISTS line_no integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.fund_holdings.line_no IS
  'Rang de la ligne dans le document publié (0-indexé). Clé d''unicité : c''est la seule qui restitue le fichier tel quel, y compris les lignes que l''émetteur ne distingue pas lui-même.';

-- 3) L'unicité porte désormais sur la position dans le document.
ALTER TABLE public.fund_holdings
  DROP CONSTRAINT IF EXISTS fund_holdings_asset_id_security_name_as_of_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fund_holdings_line_identity_key'
  ) THEN
    ALTER TABLE public.fund_holdings
      ADD CONSTRAINT fund_holdings_line_identity_key
      UNIQUE (asset_id, as_of, line_no);
  END IF;
END $$;

-- 4) Un poids négatif est une donnée publiée, pas une anomalie.
ALTER TABLE public.fund_holdings
  DROP CONSTRAINT IF EXISTS fund_holdings_weight_pct_check;

ALTER TABLE public.fund_holdings
  ADD CONSTRAINT fund_holdings_weight_pct_check
  CHECK (weight_pct IS NULL OR (weight_pct >= -100 AND weight_pct <= 100));
