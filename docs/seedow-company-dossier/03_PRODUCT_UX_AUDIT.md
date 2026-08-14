# 03 — Product & UX Audit

> Audit à distance : le repo n'a pas été exécuté (consigne : ne pas modifier le produit). Les constats s'appuient sur le code des routes/composants, la DA (CLAUDE.md §4) et l'historique git. Ce qui exige un test live est marqué **à vérifier en session live**.

## Ce qui est bien fait (FACT, appuyé sur le code)

- **DA cohérente et opinionnée** : tokens hex, Inter + IBM Plex Mono (data), sémantique mint=positif / alert=négatif stricte. Rare à ce stade.
- **A11y prise au sérieux** : `lib/a11y` + tests ; règle « jamais l'information par la couleur seule » (ex. `CheckIcon` porte un label) ; `--ink-2` assombri pour passer WCAG AA (commentaire dans les tokens).
- **Mobile-first assumé** : vague de commits « zero-scroll », « épure façon Trade Republic », « le solde d'abord » (#63→#97). Le produit a été retravaillé pour réduire scroll et clics.
- **Transparence comme parti pris UX** : affichage du `esg_floor_relaxed`, suppression du « CO₂ évité fabriqué » (#98), couverture de données visible. C'est un choix UX rare et défendable.
- **Logique métier testée hors UI** : les résumés (Le Fil), l'impact, la simulation sont extraits en fonctions pures testées — bon pour la fiabilité perçue.

## Problèmes (problème · preuve · impact · reco · effort)

| #   | Problème                                                                 | Preuve                                                                  | Impact                                                       | Recommandation                                                                                     | Effort |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------ |
| P1  | **Le parcours se termine sur un formulaire d'intention, pas une action** | `real_investment_intents` ; pas de custody                              | Déception au sommet du funnel → chute d'activation/rétention | Clarifier la promesse (« simule et prépare » vs « investis »), ou brancher l'exécution (voir `07`) | XL     |
| P2  | **Surcharge cognitive de l'onboarding conviction**                       | 6 causes×intensité + 6 exclusions + risque + horizon                    | Drop-off Léa/Inès                                            | Onboarding progressif (3 questions max → portefeuille → raffiner après)                            | M      |
| P3  | **Dispersion de surface**                                                | routes vote/reveil/wrapped/communaute/mcp/construire                    | Dilue le message, augmente maintenance                       | Prioriser un chemin héros unique ; masquer le reste en « labo »                                    | M      |
| P4  | **Univers étroit (~58 actifs)** perceptible à l'exploration              | migrations universe                                                     | « Découvrir » offre peu à découvrir                          | Élargir l'univers (data-engine) ou assumer le curating comme feature                               | L      |
| P5  | **Densité de chiffres pour un débutant**                                 | dashboard/portfolio riches en métriques                                 | Karim/Léa peuvent décrocher                                  | Mode « débutant/expert » (progressive disclosure)                                                  | M      |
| P6  | **Cap bêta + waitlist** freine l'acquisition                             | migrations beta cap                                                     | Perte d'élan viral (certificat partagé → mur d'attente)      | Ouvrir l'accès simulation sans compte, gater seulement le « vrai »                                 | S-M    |
| P7  | **Confiance dépend de la fraîcheur des sources**                         | benchmarks datés « as of » ; certains « estimation indicative » (bonds) | Un chiffre périmé mine la promesse #1                        | Badge de fraîcheur + process de mise à jour (voir `11`)                                            | S      |

## Redesign radical — « si on repartait de zéro »

**Question** : à quoi ressemblerait Seedow reconstruit sans l'existant ?

**Thèse.** Un **funnel unique, mobile, en 3 écrans** : (1) _« Où va ton argent aujourd'hui ? »_ (un miroir choc, sourcé, sur ce que finance une épargne/ETF standard) → (2) _« Voilà le tien »_ (portefeuille conviction généré en une interaction, 3 chiffres : perf attendue, risque, empreinte vs MSCI World) → (3) _« Passe à l'acte »_ (un vrai rail d'exécution ou une passerelle courtier claire). Tout le reste (Cours, Vote, Communauté, Wrapped) devient **de la rétention post-activation**, pas du parcours d'entrée.

Le Fil est déjà la bonne intuition (narratif > tableau de bord). Le manque n'est pas la surface — c'est **le débouché** (l'acte d'investir) et **la focalisation**.

_(Ces recommandations sont des hypothèses d'expert à valider par tests utilisateurs — aucune donnée d'usage réel n'existe dans le repo.)_
