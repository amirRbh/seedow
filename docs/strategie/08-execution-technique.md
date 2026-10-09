# Livrable 8 — Exécution technique

## Ce qui a été modifié

Choix assumé : **ne pas toucher à l'application B2C**. Le seul code ajouté est celui sans lequel le livrable du pilote ne peut pas être produit.

| Fichier                                                | Nature  | Contenu                                                                                                                                                                 |
| ------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/esg/naming/esma-fund-names.ts`                | Nouveau | Détection des termes ESG d'un nom (lexique FR/EN, catégories ESMA), exigences (80 %, CTB/PAB, durable, transition, impact), contrôle documentaire N0–N6, rendu Markdown |
| `src/lib/esg/naming/__tests__/esma-fund-names.test.ts` | Nouveau | 22 tests                                                                                                                                                                |
| `scripts/precheck-fund-names.ts`                       | Nouveau | CLI : `bun run scripts/precheck-fund-names.ts <entree.json> [sortie.md]`                                                                                                |
| `data/demo/precheck-demo.json`                         | Nouveau | 3 fonds **fictifs**, marqués comme tels dans chaque source et dans le rapport                                                                                           |
| `docs/strategie/*`                                     | Nouveau | Ce dossier                                                                                                                                                              |

Aucun fichier existant n'a été modifié. Aucune migration, aucune table, aucune donnée utilisateur touchée. Aucun déploiement.

## Règles de conception reprises de Seedow

- Le module réutilise le type `SourcedStatement` de `v2/discrepancies.ts` : un engagement sans document ni date n'est pas un engagement.
- Quatre statuts : `documente`, `ecart_documentaire`, `a_verifier`, `sans_objet`. Le contrôle ne dit **jamais** « conforme ».
- Chaque point porte sa ligne « ce que ce point ne dit pas ».
- N6 rappelle systématiquement que les positions ne sont pas vérifiées.
- Les termes non tranchés par le texte (« responsable », « éthique ») et la combinaison « transition + environnement » sont lus de la façon la plus prudente **et signalés** comme points de lecture à faire trancher par la conformité du client.

## Tests réalisés et résultats observés (2026-10-09)

| Commande                                                              | Résultat                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `bunx vitest run src/lib/esg/naming`                                  | 22/22 tests passent                                                    |
| `bun run test` (suite complète, après ajout)                          | 1 010 tests passent (988 + 22), 1 échec attendu                        |
| `bun run typecheck`                                                   | 0 erreur                                                               |
| `bun run lint`                                                        | 0 erreur ; 14 avertissements, tous préexistants                        |
| `bun run scripts/precheck-fund-names.ts data/demo/precheck-demo.json` | Rapport produit : 3 fonds, 5 écarts documentaires, 2 points documentés |

**Bogue trouvé par les tests et corrigé** : un renvoi explicite au socle CTB n'était pas compté comme couvrant les trois exclusions CTB lorsque le nom appelle le socle PAB ; le rapport listait donc à tort « armes controversées » comme manquantes. Corrigé dans `missingExclusions`.

**Non testé** : `bun run build` (le module n'est importé par aucune route, il n'entre pas dans le bundle Workers) ; aucun test sur de vrais documents de fonds — la saisie des engagements est manuelle au stade pilote.

## Problèmes restants

1. **Lexique et règles à faire relire par un juriste** : les rattachements de termes et la règle de combinaison « transition + environnement » sont des lectures prudentes, pas une interprétation validée des orientations ESMA et des Q&A.
2. **La saisie des engagements est manuelle.** Prochaine brique, **uniquement après un pilote signé** : brancher `sfdr-pipeline` pour pré-remplir `minAlignedProportionPct`, `minSustainableInvestmentPct` et les exclusions depuis l'annexe précontractuelle, avec validation humaine.
3. **E5** (document commercial vs prospectus) n'est pas outillé : manuel au pilote.
4. **Export PDF** : manuel (pandoc ou impression du Markdown).
5. Le lien vers l'environnement Lovable reste une dépendance pour l'application B2C ; il est sans effet sur le pilote, qui tourne en local.

## Procédure de lancement d'un pilote

```bash
bun install
# 1. Saisir les fonds du client dans un JSON au format de data/demo/precheck-demo.json,
#    chaque engagement avec sa citation, son document, sa date (et l'URL si publique).
#    "demo": false pour un vrai client.
# 2. Produire le rapport :
bun run scripts/precheck-fund-names.ts client-x.json rapport-client-x.md
# 3. Relire chaque point à la main, ajouter les constats E5, exporter en PDF.
```

**Les fichiers clients ne doivent jamais être versionnés dans ce dépôt** : les garder hors du repo (ou dans un dossier ignoré par git), sous accord de confidentialité.

## Pour qualifier la liste de prospects

`detectNameTerms(nom)` sert aussi à filtrer une liste de dénominations de fonds (base GECO de l'AMF) : un nom qui renvoie au moins un terme = une SGP à qualifier. Un petit script d'import sera écrit quand le fichier source aura été téléchargé (data.gouv.fr était injoignable depuis l'environnement de cette session : son format n'a pas pu être vérifié, et il n'a donc pas été deviné).
