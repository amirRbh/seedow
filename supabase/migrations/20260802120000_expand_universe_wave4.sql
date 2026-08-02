-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 4 d'élargissement de l'univers investissable : +3 fonds ciblant les
-- deux causes les moins couvertes de l'univers actuel — l'égalité femmes-hommes
-- et l'économie circulaire (respectivement 2 et 3 expositions avant cette vague,
-- contre 75 pour le climat). On ajoute aussi une exposition « droits humains /
-- diversité ».
--
-- Honnêteté des données (contrat de transparence Seedow) — mêmes règles que les
-- vagues précédentes :
--   - isin NULL : non vérifié, donc non affirmé.
--   - env/social/governance_score et intensité carbone NULL : pas de donnée
--     fournisseur → l'UI affiche « données estimées », c'est voulu.
--   - esg_score : estimation interne par catégorie de fonds, tracée via
--     esg_score_source = 'seedow-internal-v1' (jamais présentée comme un score
--     fournisseur certifié).
--   - excluded_sectors vide : ces fonds appliquent des filtres ESG, mais on
--     n'affirme pas une liste d'exclusions précise qu'on n'a pas vérifiée.
--   - sfdr_article NULL : ETF cotés aux États-Unis ; le règlement SFDR ne
--     s'applique qu'aux fonds distribués dans l'UE, on n'affirme pas une
--     classification qui n'existe pas.
--   - expected_return / volatility : placeholders prudents par classe, écrasés
--     par le modèle de risque dès que l'historique de cours est chargé.
--
-- Faits vérifiés (nom légal, émetteur, TER) au 2026-08 via les fiches fonds
-- publiques. Symboles US « pleins » (sans suffixe de place), résolvables par
-- l'ingestion Yahoo ; un actif dont le cours ne remonterait pas reste « cours
-- indisponible » dans l'UI (dégradation déjà gérée, cf. useAssetUniverse).
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
-- ── Égalité femmes-hommes ────────────────────────────────────────────────────
('WOMN', 'Impact Shares YWCA Women''s Empowerment ETF', 'Impact Shares', 'equity_dev', 'us', 'USD', 0.0075, 66,
 'seedow-internal-v1', NULL, 0.07, 0.16,
 '{"egalite": 0.9, "humain": 0.3}', '{}',
 'Actions de grandes entreprises américaines sélectionnées sur des critères d''égalité femmes-hommes (mixité des instances dirigeantes, politique salariale, congés parentaux), selon une grille définie avec la YWCA.', 'WOMN', true),

-- ── Droits humains & diversité ───────────────────────────────────────────────
('NACP', 'Impact Shares NAACP Minority Empowerment ETF', 'Impact Shares', 'equity_dev', 'us', 'USD', 0.0049, 65,
 'seedow-internal-v1', NULL, 0.07, 0.16,
 '{"humain": 0.9, "egalite": 0.4}', '{}',
 'Actions de grandes entreprises américaines évaluées sur leurs pratiques d''inclusion et de diversité ethnique (embauche, représentation, chaîne d''approvisionnement), selon une grille définie avec la NAACP.', 'NACP', true),

-- ── Économie circulaire (services à l''environnement) ────────────────────────
('EVX', 'VanEck Environmental Services ETF', 'VanEck', 'thematic', 'us', 'USD', 0.0055, 60,
 'seedow-internal-v1', NULL, 0.07, 0.22,
 '{"circulaire": 0.7, "climat": 0.3}', '{}',
 'Sociétés des services à l''environnement : collecte et traitement des déchets, gestion de l''eau usée, dépollution et valorisation énergétique — les métiers de l''économie des ressources.', 'EVX', true);
