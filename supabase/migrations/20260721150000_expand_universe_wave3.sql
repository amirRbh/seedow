-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 3 d'élargissement de l'univers investissable : +15 fonds, en visant les
-- secteurs encore peu couverts (eau, forêt/biodiversité, nucléaire bas-carbone,
-- réseaux intelligents, bas-carbone / sans énergies fossiles) et en approfondissant
-- le socle actions ESG et obligataire ESG.
--
-- Honnêteté des données (contrat de transparence Seedow) — mêmes règles que les
-- vagues précédentes :
--   - isin NULL : non vérifié, donc non affirmé.
--   - env/social/governance_score et intensité carbone NULL : pas de donnée
--     fournisseur → l'UI affichera « données estimées », c'est voulu.
--   - esg_score : estimation interne par catégorie de fonds, tracée via
--     esg_score_source = 'seedow-internal-v1'.
--   - sfdr_article NULL : ces fonds sont cotés aux États-Unis ; le règlement SFDR
--     ne s'applique qu'aux fonds distribués dans l'UE, donc on n'affirme pas une
--     classification qui n'existe pas.
--   - expected_return / volatility : placeholders prudents par classe, écrasés
--     par le modèle de risque dès que l'historique est chargé.
--
-- Symboles : ce sont des ETF américains largement diffusés et anciens (symbole
-- « plein », sans suffixe de place), sélectionnés dans le même style que les
-- lignes US de la vague 2. Contrairement à la vague 2, ce fichier n'affirme PAS
-- une vérification live individuelle — la validation se fait à l'étape de refresh
-- ci-dessous, et un actif dont le cours ne remonterait pas reste simplement
-- « cours indisponible » dans l'UI (dégradation déjà gérée, cf. useAssetUniverse).
--
-- ⚠ Opérations post-migration OBLIGATOIRES (sinon les nouveaux actifs restent
--   sans cours ni covariance) :
--   1. POST /hooks/refresh-market-data  { "seed": true }   → backfill 2 ans
--      (valide aussi les symboles : ceux sans cours restent sans prix)
--   2. POST /hooks/recompute-risk-model                    → μ/σ + covariance
--   (via le panneau admin bêta ou curl avec CRON_SECRET)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.assets
  (ticker, name, issuer, asset_class, region, currency, ter, esg_score,
   esg_score_source, sfdr_article, expected_return, volatility,
   cause_exposure, excluded_sectors, description, yahoo_symbol, is_active)
VALUES
-- ── Énergie propre & bas-carbone ────────────────────────────────────────────
('ICLN', 'iShares Global Clean Energy ETF', 'iShares', 'thematic', 'world', 'USD', 0.0041, 68,
 'seedow-internal-v1', NULL, 0.07, 0.30,
 '{"climat": 0.9}', '{fossiles}',
 'Le fonds énergie propre mondial de référence : solaire, éolien, géothermie et technologies associées, à l''échelle de la planète.', 'ICLN', true),
('PBD', 'Invesco Global Clean Energy ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0075, 66,
 'seedow-internal-v1', NULL, 0.07, 0.30,
 '{"climat": 0.9}', '{fossiles}',
 'Énergie propre mondiale, version internationale de PBW : producteurs et équipementiers des renouvelables hors seuls États-Unis.', 'PBD', true),
('GRID', 'First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund', 'First Trust', 'thematic', 'us', 'USD', 0.0056, 64,
 'seedow-internal-v1', NULL, 0.07, 0.24,
 '{"climat": 0.6, "tech": 0.3}', '{}',
 'Réseaux électriques intelligents : compteurs communicants, gestion de la demande, infrastructures d''intégration des renouvelables.', 'GRID', true),
('CRBN', 'iShares MSCI ACWI Low Carbon Target ETF', 'iShares', 'equity_dev', 'world', 'USD', 0.0018, 70,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.5}', '{}',
 'Actions monde surpondérant les entreprises à faible intensité carbone et faibles réserves fossiles — brique cœur orientée climat.', 'CRBN', true),
('SPYX', 'SPDR S&P 500 Fossil Fuel Reserves Free ETF', 'State Street', 'equity_dev', 'us', 'USD', 0.0020, 67,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.4}', '{fossiles}',
 'Le S&P 500 débarrassé des entreprises détenant des réserves d''énergies fossiles : approche par exclusion, simple et lisible.', 'SPYX', true),
('NLR', 'VanEck Uranium and Nuclear ETF', 'VanEck', 'thematic', 'world', 'USD', 0.0061, 58,
 'seedow-internal-v1', NULL, 0.06, 0.26,
 '{"climat": 0.7}', '{fossiles}',
 'Énergie nucléaire et uranium : électricité pilotable bas-carbone, brique controversée mais structurante du débat sur la transition.', 'NLR', true),
-- ── Eau ─────────────────────────────────────────────────────────────────────
('FIW', 'First Trust Water ETF', 'First Trust', 'thematic', 'us', 'USD', 0.0052, 66,
 'seedow-internal-v1', NULL, 0.06, 0.20,
 '{"biodiversite": 0.5, "climat": 0.3}', '{}',
 'Toute la chaîne de l''eau aux États-Unis : traitement, distribution, infrastructures et technologies d''économie de la ressource.', 'FIW', true),
('CGW', 'Invesco S&P Global Water Index ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0057, 66,
 'seedow-internal-v1', NULL, 0.06, 0.20,
 '{"biodiversite": 0.5, "climat": 0.3}', '{}',
 'Eau à l''échelle mondiale : services aux collectivités et équipementiers de la gestion durable de la ressource, tous continents.', 'CGW', true),
-- ── Forêt, sol & biodiversité ───────────────────────────────────────────────
('WOOD', 'iShares Global Timber & Forestry ETF', 'iShares', 'thematic', 'world', 'USD', 0.0043, 63,
 'seedow-internal-v1', NULL, 0.06, 0.22,
 '{"biodiversite": 0.7, "circulaire": 0.2}', '{}',
 'Forêt et filière bois durable : gestion forestière, papeterie et matériaux biosourcés — un puits de carbone et un enjeu de biodiversité.', 'WOOD', true),
-- ── Socle actions ESG (approfondissement) ───────────────────────────────────
('EFIV', 'SPDR S&P 500 ESG ETF', 'State Street', 'equity_dev', 'us', 'USD', 0.0010, 68,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.15, "humain": 0.15}', '{armes,tabac}',
 'Le S&P 500 filtré ESG : mêmes grandes valeurs US, moins les pires profils ESG et les activités controversées — frais très bas.', 'EFIV', true),
('SUSL', 'iShares ESG MSCI USA Leaders ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0010, 72,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{fossiles,armes,tabac}',
 'Actions US « best-in-class » : uniquement les entreprises les mieux notées ESG de leur secteur, exclusions fossiles/armes/tabac.', 'SUSL', true),
('USSG', 'Xtrackers MSCI USA ESG Leaders Equity ETF', 'Xtrackers', 'equity_dev', 'us', 'USD', 0.0010, 72,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{fossiles,armes,tabac}',
 'Actions US leaders ESG (indice MSCI ESG Leaders) — alternative à frais réduits à SUSL sur la même philosophie best-in-class.', 'USSG', true),
('VSGX', 'Vanguard ESG International Stock ETF', 'Vanguard', 'equity_dev', 'world', 'USD', 0.0012, 67,
 'seedow-internal-v1', NULL, 0.06, 0.17,
 '{"climat": 0.15, "humain": 0.2}', '{fossiles,armes,tabac,jeux}',
 'Actions internationales hors États-Unis (développées + émergentes) filtrées ESG : le complément géographique des fonds US.', 'VSGX', true),
('VOTE', 'Engine No. 1 Transform 500 ETF', 'Engine No. 1', 'equity_dev', 'us', 'USD', 0.0005, 62,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{}',
 'Cas d''usage différent : pas d''exclusion, mais de l''engagement actionnarial — voter aux assemblées des 500 plus grandes valeurs US pour peser sur leurs pratiques ESG.', 'VOTE', true),
-- ── Obligataire ESG (approfondissement) ─────────────────────────────────────
('VCEB', 'Vanguard ESG U.S. Corporate Bond ETF', 'Vanguard', 'corporate_bond', 'us', 'USD', 0.0012, 66,
 'seedow-internal-v1', NULL, 0.03, 0.06,
 '{}', '{fossiles,armes,tabac}',
 'Obligations d''entreprises US filtrées ESG (exclusions fossiles, armes, tabac) — brique obligataire de diversification à frais bas.', 'VCEB', true)
ON CONFLICT (ticker) DO NOTHING;
