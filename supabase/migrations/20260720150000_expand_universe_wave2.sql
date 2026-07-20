-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 2 d'élargissement de l'univers investissable : +40 fonds réels
-- (39 → 79 actifs actifs).
--
-- Chaque symbole a été vérifié le 2026-07-20 contre l'endpoint chart Yahoo
-- Finance (cours live + nom + devise renvoyés) — même méthodologie que
-- 20260716170000_expand_investable_universe.sql. Les noms ci-dessous sont
-- ceux renvoyés par Yahoo, pas des noms devinés.
--
-- Honnêteté des données (contrat de transparence Seedow) :
--   - isin NULL : non vérifié, donc non affirmé.
--   - env/social/governance_score et intensité carbone NULL : pas de donnée
--     fournisseur → l'UI affichera « données estimées », c'est voulu.
--   - esg_score : estimation interne par catégorie de fonds, tracée via
--     esg_score_source = 'seedow-internal-v1'.
--   - sfdr_article : renseigné uniquement pour les UCITS (article 8 quand la
--     documentation du fonds le confirme). NULL pour les fonds cotés US :
--     le règlement SFDR ne s'applique qu'aux fonds distribués dans l'UE.
--   - expected_return / volatility : placeholders prudents par classe,
--     écrasés par le modèle de risque dès que l'historique est chargé.
--
-- ⚠ Opérations post-migration OBLIGATOIRES (sinon les nouveaux actifs restent
--   sans cours ni covariance) :
--   1. POST /hooks/refresh-market-data  { "seed": true }   → backfill 2 ans
--   2. POST /hooks/recompute-risk-model                    → μ/σ + covariance
--   (via le panneau admin bêta ou curl avec CRON_SECRET)
--   En attendant, l'optimiseur retombe sur volatility² en diagonale
--   (fix engine.buildCovariance dans le même commit) : pas de variance nulle.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.assets
  (ticker, name, issuer, asset_class, region, currency, ter, esg_score,
   esg_score_source, sfdr_article, expected_return, volatility,
   cause_exposure, excluded_sectors, description, yahoo_symbol, is_active)
VALUES
-- ── Actions monde/US/Japon développées ESG-SRI (UCITS) ──────────────────────
('V3AA', 'Vanguard ESG Global All Cap UCITS ETF (USD) Accumulating', 'Vanguard', 'equity_dev', 'world', 'USD', 0.0024, 70,
 'seedow-internal-v1', 8, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{fossiles,armes,tabac,jeux}',
 'Actions mondiales toutes capitalisations, filtres FTSE ESG : exclusion fossiles, armes, tabac, jeux d''argent.', 'V3AA.L', true),
('SUAS', 'iShares MSCI USA SRI UCITS ETF USD (Acc)', 'iShares', 'equity_dev', 'us', 'USD', 0.0020, 78,
 'seedow-internal-v1', 8, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{armes,tabac}',
 'Actions US best-in-class MSCI SRI : sélection des 25 % d''entreprises les mieux notées ESG par secteur.', 'SUAS.L', true),
('SUJP', 'iShares MSCI Japan SRI UCITS ETF', 'iShares', 'equity_dev', 'japan', 'USD', 0.0030, 77,
 'seedow-internal-v1', 8, 0.06, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{armes,tabac}',
 'Actions japonaises best-in-class MSCI SRI — couverture Japon manquante dans l''univers jusqu''ici.', 'SUJP.L', true),
('USRI', 'Amundi MSCI USA SRI Climate Paris Aligned UCITS ETF Acc', 'Amundi', 'equity_dev', 'us', 'USD', 0.0025, 79,
 'seedow-internal-v1', 8, 0.065, 0.16,
 '{"climat": 0.5, "humain": 0.2}', '{fossiles,armes,tabac}',
 'Actions US SRI alignées Accord de Paris : trajectoire de décarbonation -50 % vs indice parent.', 'USRI.PA', true),
('ESGU', 'iShares ESG Aware MSCI USA ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0015, 66,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.15}', '{armes,tabac}',
 'Actions US optimisées ESG (MSCI ESG Aware) — exclusions armes controversées, tabac, charbon thermique.', 'ESGU', true),
('ESGV', 'Vanguard ESG U.S. Stock ETF', 'Vanguard', 'equity_dev', 'us', 'USD', 0.0009, 68,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.15}', '{fossiles,armes,tabac,jeux}',
 'Actions US larges avec filtres d''exclusion FTSE : fossiles, armes, tabac, jeux — frais parmi les plus bas du marché.', 'ESGV', true),
('ESGD', 'iShares ESG Aware MSCI EAFE ETF', 'iShares', 'equity_dev', 'world', 'USD', 0.0020, 66,
 'seedow-internal-v1', NULL, 0.06, 0.15,
 '{"climat": 0.15}', '{armes,tabac}',
 'Actions développées hors Amérique du Nord (Europe, Japon, Australie) optimisées ESG.', 'ESGD', true),
('DSI', 'iShares ESG MSCI KLD 400 ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0025, 74,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.2, "humain": 0.2}', '{armes,tabac,jeux}',
 'Le plus ancien indice ESG au monde (KLD 400, créé en 1990) : 400 valeurs US à fort profil ESG.', 'DSI', true),
('SUSA', 'iShares ESG Optimized MSCI USA ETF', 'iShares', 'equity_dev', 'us', 'USD', 0.0025, 73,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.2}', '{armes,tabac}',
 'Actions US sélectionnées et pondérées selon les notations MSCI ESG (méthode « ESG Select »).', 'SUSA', true),
('SNPE', 'Xtrackers S&P 500 Scored & Screened ETF', 'Xtrackers', 'equity_dev', 'us', 'USD', 0.0010, 65,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"climat": 0.15}', '{armes,tabac}',
 'S&P 500 filtré ESG : exclusion armes controversées, tabac, charbon thermique, pires notations ESG.', 'SNPE', true),
('SHE', 'State Street SPDR MSCI USA Gender Diversity ETF', 'State Street', 'equity_dev', 'us', 'USD', 0.0020, 62,
 'seedow-internal-v1', NULL, 0.065, 0.16,
 '{"egalite": 0.9}', '{}',
 'Entreprises US leaders en mixité et représentation des femmes dans les instances dirigeantes.', 'SHE', true),
('MPCT', 'iShares MSCI Global Sustainable Development Goals ETF', 'iShares', 'thematic', 'world', 'USD', 0.0049, 72,
 'seedow-internal-v1', NULL, 0.065, 0.18,
 '{"humain": 0.5, "climat": 0.4}', '{armes,tabac}',
 'Entreprises dont l''activité contribue directement aux Objectifs de Développement Durable de l''ONU.', 'SDG', true),
-- ── Actions émergentes ESG ──────────────────────────────────────────────────
('SAEM', 'iShares MSCI EM IMI Screened UCITS ETF USD (Acc)', 'iShares', 'equity_em', 'em', 'USD', 0.0018, 64,
 'seedow-internal-v1', 8, 0.07, 0.20,
 '{"humain": 0.2}', '{armes,tabac}',
 'Marchés émergents toutes capitalisations avec filtres d''exclusion ESG (armes, tabac, charbon).', 'SAEM.L', true),
('ESGE', 'iShares ESG Aware MSCI EM ETF', 'iShares', 'equity_em', 'em', 'USD', 0.0025, 62,
 'seedow-internal-v1', NULL, 0.07, 0.20,
 '{"humain": 0.2}', '{armes,tabac}',
 'Marchés émergents optimisés ESG (MSCI ESG Aware), version cotée US.', 'ESGE', true),
-- ── Thématiques énergie propre & climat ─────────────────────────────────────
('TAN', 'Invesco Solar ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0067, 68,
 'seedow-internal-v1', NULL, 0.07, 0.30,
 '{"climat": 0.9}', '{}',
 'Le fonds solaire de référence mondiale : fabricants de panneaux, onduleurs, développeurs de centrales.', 'TAN', true),
('FAN', 'First Trust Global Wind Energy ETF', 'First Trust', 'thematic', 'world', 'USD', 0.0060, 67,
 'seedow-internal-v1', NULL, 0.06, 0.24,
 '{"climat": 0.9}', '{}',
 'Éolien mondial : turbiniers, opérateurs de parcs et équipementiers de la chaîne de valeur du vent.', 'FAN', true),
('QCLN', 'First Trust NASDAQ Clean Edge Green Energy Index Fund', 'First Trust', 'thematic', 'us', 'USD', 0.0058, 66,
 'seedow-internal-v1', NULL, 0.07, 0.30,
 '{"climat": 0.85, "tech": 0.15}', '{}',
 'Énergies propres US cotées Nasdaq : solaire, éolien, batteries, réseaux intelligents, véhicules électriques.', 'QCLN', true),
('PBW', 'Invesco WilderHill Clean Energy ETF', 'Invesco', 'thematic', 'us', 'USD', 0.0066, 65,
 'seedow-internal-v1', NULL, 0.07, 0.32,
 '{"climat": 0.9}', '{}',
 'Pionnier des ETF énergie propre (2005) : pondération égalitaire sur l''ensemble des cleantechs US.', 'PBW', true),
('ACES', 'ALPS Clean Energy ETF', 'ALPS', 'thematic', 'us', 'USD', 0.0055, 66,
 'seedow-internal-v1', NULL, 0.07, 0.28,
 '{"climat": 0.9}', '{}',
 'Énergie propre Amérique du Nord : production renouvelable, stockage, efficacité énergétique.', 'ACES', true),
('SMOG', 'VanEck Low Carbon Energy ETF', 'VanEck', 'thematic', 'world', 'USD', 0.0060, 67,
 'seedow-internal-v1', NULL, 0.07, 0.26,
 '{"climat": 0.9}', '{}',
 'Énergie bas-carbone mondiale : renouvelables, véhicules électriques, hydrogène, réseaux.', 'SMOG', true),
('RNRG', 'Global X Renewable Energy Producers ETF', 'Global X', 'thematic', 'world', 'USD', 0.0065, 68,
 'seedow-internal-v1', NULL, 0.06, 0.22,
 '{"climat": 0.9}', '{}',
 'Producteurs d''électricité 100 % renouvelable (hydro, éolien, solaire, géothermie) — pas les équipementiers.', 'RNRG', true),
('RAYS', 'Global X Solar ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 68,
 'seedow-internal-v1', NULL, 0.07, 0.30,
 '{"climat": 0.9}', '{}',
 'Chaîne de valeur solaire mondiale, de la fabrication de cellules à l''exploitation de fermes solaires.', 'RAYS', true),
('CTEC', 'Global X ClimateTech ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 66,
 'seedow-internal-v1', NULL, 0.07, 0.28,
 '{"climat": 0.8, "tech": 0.2}', '{}',
 'Technologies climatiques : capture carbone, efficacité énergétique, matériaux et procédés décarbonés.', 'CTEC', true),
('HYDR', 'Global X Hydrogen ETF', 'Global X', 'thematic', 'world', 'USD', 0.0050, 64,
 'seedow-internal-v1', NULL, 0.07, 0.34,
 '{"climat": 0.85, "tech": 0.15}', '{}',
 'Hydrogène version US : électrolyseurs, piles à combustible, infrastructures — complète HTWO (UCITS).', 'HYDR', true),
('ERTH', 'Invesco MSCI Sustainable Future ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0055, 70,
 'seedow-internal-v1', NULL, 0.065, 0.22,
 '{"climat": 0.5, "biodiversite": 0.3, "circulaire": 0.2}', '{}',
 'Économie durable au sens large : énergie propre, eau, bâtiment vert, agriculture durable, prévention pollution.', 'ERTH', true),
-- ── Thématiques mobilité & batteries ────────────────────────────────────────
('LIT', 'Global X Lithium & Battery Tech ETF', 'Global X', 'thematic', 'world', 'USD', 0.0075, 58,
 'seedow-internal-v1', NULL, 0.07, 0.32,
 '{"climat": 0.6, "tech": 0.3}', '{}',
 'Chaîne du lithium et des batteries : extraction, raffinage, cellules, constructeurs de VE.', 'LIT', true),
('ECAR', 'iShares Electric Vehicles and Driving Technology UCITS ETF USD (Acc)', 'iShares', 'thematic', 'world', 'USD', 0.0040, 60,
 'seedow-internal-v1', 8, 0.07, 0.26,
 '{"climat": 0.6, "tech": 0.4}', '{}',
 'Véhicules électriques et technologies de conduite (UCITS) : constructeurs, semi-conducteurs, capteurs.', 'ECAR.L', true),
('BATT', 'L&G Battery Value-Chain UCITS ETF', 'L&G', 'thematic', 'world', 'USD', 0.0049, 60,
 'seedow-internal-v1', 8, 0.07, 0.28,
 '{"climat": 0.6, "tech": 0.3}', '{}',
 'Chaîne de valeur du stockage d''énergie (UCITS) : fabricants de batteries et fournisseurs de technologies.', 'BATT.L', true),
('TANN', 'HANetf Solar Energy UCITS ETF', 'HANetf', 'thematic', 'world', 'USD', 0.0069, 69,
 'seedow-internal-v1', 8, 0.07, 0.30,
 '{"climat": 0.9}', '{}',
 'Solaire pur-play en enveloppe UCITS : uniquement des entreprises dont l''activité principale est le solaire.', 'TANN.L', true),
-- ── Thématiques eau, alimentation, santé ────────────────────────────────────
('GLUG', 'L&G Clean Water UCITS ETF', 'L&G', 'thematic', 'world', 'USD', 0.0049, 67,
 'seedow-internal-v1', 8, 0.06, 0.20,
 '{"biodiversite": 0.5, "climat": 0.3}', '{}',
 'Eau propre (UCITS) : traitement, distribution, technologies de gestion durable de la ressource.', 'GLUG.L', true),
('PHO', 'Invesco Water Resources ETF', 'Invesco', 'thematic', 'us', 'USD', 0.0060, 66,
 'seedow-internal-v1', NULL, 0.06, 0.20,
 '{"biodiversite": 0.5, "climat": 0.3}', '{}',
 'Ressources en eau US : services aux collectivités, infrastructures, technologies de purification.', 'PHO', true),
('PIO', 'Invesco Global Water ETF', 'Invesco', 'thematic', 'world', 'USD', 0.0075, 66,
 'seedow-internal-v1', NULL, 0.06, 0.20,
 '{"biodiversite": 0.5, "climat": 0.3}', '{}',
 'Eau mondiale : version internationale du thème, complémentaire de IH2O et GLUG.', 'PIO', true),
('FOOD', 'Rize Sustainable Future of Food UCITS ETF', 'Rize', 'thematic', 'world', 'USD', 0.0045, 63,
 'seedow-internal-v1', 8, 0.06, 0.24,
 '{"biodiversite": 0.5, "humain": 0.3}', '{}',
 'Alimentation durable (UCITS) : protéines alternatives, agriculture de précision, emballages durables.', 'FOOD.L', true),
('HEAL', 'iShares Healthcare Innovation UCITS ETF', 'iShares', 'thematic', 'world', 'USD', 0.0040, 60,
 'seedow-internal-v1', 8, 0.065, 0.22,
 '{"humain": 0.8, "tech": 0.2}', '{}',
 'Innovation santé (UCITS) : diagnostic, robotique chirurgicale, médecine personnalisée.', 'HEAL.L', true),
-- ── Marché du carbone ───────────────────────────────────────────────────────
('KRBN', 'KraneShares Global Carbon ETF', 'KraneShares', 'commodity', 'world', 'USD', 0.0079, 60,
 'seedow-internal-v1', NULL, 0.05, 0.30,
 '{"climat": 0.9}', '{}',
 'Quotas carbone mondiaux (EU ETS, Californie, RGGI) : s''exposer au prix du CO2, mécanisme clé de la transition.', 'KRBN', true),
-- ── Obligations ESG ─────────────────────────────────────────────────────────
('BGRN', 'iShares USD Green Bond ETF', 'iShares', 'green_bond', 'world', 'USD', 0.0020, 78,
 'seedow-internal-v1', NULL, 0.03, 0.06,
 '{"climat": 0.8}', '{}',
 'Obligations vertes libellées en dollar : financement fléché vers des projets environnementaux vérifiés.', 'BGRN', true),
('EAGG', 'iShares ESG U.S. Aggregate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0010, 66,
 'seedow-internal-v1', NULL, 0.028, 0.05,
 '{}', '{}',
 'Obligataire US diversifié (souverain + entreprises) avec optimisation ESG — brique cœur de portefeuille.', 'EAGG', true),
('SUSB', 'iShares ESG 1-5 Year USD Corporate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0012, 68,
 'seedow-internal-v1', NULL, 0.025, 0.03,
 '{}', '{armes,tabac}',
 'Obligations d''entreprises USD court terme (1-5 ans) filtrées ESG : faible sensibilité aux taux.', 'SUSB', true),
('SUSC', 'iShares ESG USD Corporate Bond ETF', 'iShares', 'corporate_bond', 'us', 'USD', 0.0018, 68,
 'seedow-internal-v1', NULL, 0.03, 0.06,
 '{}', '{armes,tabac}',
 'Obligations d''entreprises USD toutes maturités avec optimisation ESG.', 'SUSC', true),
('RBND', 'SPDR Bloomberg SASB Corporate Bond ESG Select ETF', 'State Street', 'corporate_bond', 'us', 'USD', 0.0012, 67,
 'seedow-internal-v1', NULL, 0.03, 0.06,
 '{}', '{armes,tabac}',
 'Obligations d''entreprises US sélectionnées selon les critères de matérialité ESG du référentiel SASB.', 'RBND', true)
ON CONFLICT (ticker) DO NOTHING;
