# Seedow — Moteur d'intelligence financière et ESG

> Référence technique des calculs financiers, du cadre ESG et de la couche
> qualité des données. Chaque formule ci-dessous est implémentée dans une
> fonction pure et couverte par un test. En cas d'écart entre ce document et le
> code, c'est un bug à corriger d'un côté ou de l'autre.

---

## 1. Statuts de donnée (`src/lib/data/status.ts`)

| Statut        | Sens                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `VERIFIED`    | Source primaire identifiée, datée, reprise sans retraitement de fond |
| `ESTIMATED`   | Calculé ou modélisé par Seedow à partir de données réelles           |
| `SIMULATED`   | Illustration d'un mécanisme (montants fictifs, panier simulé)        |
| `STALE`       | Était vérifié, mais dépasse la fenêtre de fraîcheur de son jeu       |
| `UNAVAILABLE` | Absent ou non collecté — jamais remplacé par zéro                    |

Règles : une donnée sans date ne peut pas être `VERIFIED` ; un calcul prend le
statut de son entrée la plus faible (`weakestStatus`). Fenêtres de fraîcheur :
`FRESHNESS_DAYS` (cours 5 j, compositions 45 j, historique 10 j, documents
réglementaires 400 j, ESG émetteur 548 j).

Le registre des sources (`src/lib/data/sources.ts`) décrit l'état RÉEL de
chaque intégration (planifiée, manuelle, instantané, référence, non intégrée),
avec sa licence, sa transformation et ses limites. Il est publié sur `/donnees`.

## 2. Performance historique (`src/lib/portfolio/performance.ts`)

| Mesure                 | Formule                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| Rendement cumulé       | `P_fin / P_début − 1`                                                   |
| Rendement annualisé    | `(P_fin / P_début)^(365,25 / jours calendaires) − 1`                    |
| Volatilité (affichée)  | écart-type échantillon des rendements **mensuels** (fins de mois) × √12 |
| Volatilité quotidienne | écart-type échantillon des rendements quotidiens × √252                 |
| Perte maximale         | `min_t (P_t / max_{s≤t} P_s − 1)`                                       |
| Écart de suivi         | écart-type des (r_fonds − r_indice) quotidiens × √252                   |
| Sharpe                 | `(R − rf) / σ` — **uniquement si `rf` est fourni**, sinon `null`        |

- Fenêtre N ans : départ au dernier point ≤ (fin − N ans). Si la série ne
  remonte pas assez loin, la fenêtre est **non calculable** — jamais raccourcie.
- Comparaison à l'indice : uniquement si l'indice couvre exactement les mêmes
  bornes.
- `blendSeries` : panier à poids constants rééquilibré à chaque date commune,
  sans interpolation. Toujours affiché `SIMULATED`.

**Validation indépendante** (`performance.test.ts`) : sur les 5 fonds de
l'instantané, les rendements annualisés 1, 3 et 5 ans recalculés retrouvent
ceux publiés par l'émetteur dans le même document à moins de 0,05 point, et la
volatilité 3 ans retrouve l'écart-type publié **au centième**.

## 3. Exposition look-through (`src/lib/portfolio/exposure.ts`)

```
exposition(b) = Σ_positions valeur(p) × part_de_b_dans(p) / valeur totale
```

- Part non ventilée **explicite** par dimension (secteur, zone, devise) : une
  donnée manquante n'est jamais un zéro, et les pourcentages se lisent sur la
  valeur totale (connus + non ventilé = 100 %).
- Ventilation publiée > 100 % : ramenée à 100 % et signalée (`issues`).
- Titres sous-jacents agrégés par clé (ISIN, sinon ticker + nom normalisé) :
  un titre détenu en direct et via plusieurs fonds = une ligne, avec le détail
  direct / indirect et la contribution de chaque position.
- Concentration : poids de la plus grosse position, HHI des positions, nombre
  effectif `1 / HHI`, part des 10 premiers titres sous-jacents (borne basse).
- Frais : TER moyen pondéré par la valeur **sur la seule part dont les frais
  sont connus**, avec sa couverture ; `null` si aucun TER n'est connu.
- Énergie : secteur Énergie au sens GICS (pétrole, gaz, charbon et services
  associés) lu dans les répartitions publiées, avec sa couverture.

## 4. Cadre ESG (`src/lib/esg/framework.ts`)

Six couches, rendues séparément, chacune avec son statut et « ce qu'elle ne dit
pas » :

1. **Classification SFDR** — catégorie de divulgation déclarée, pas une note.
   L'article déclaré par l'émetteur prime sur le catalogue ; un écart entre les
   deux est **affiché**, jamais arbitré en silence.
2. **Risque ESG** — aucune note sous licence branchée : `UNAVAILABLE`.
3. **Caractéristiques promues** — exclusions _documentées_ (les secteurs « non
   vérifiés » ne comptent pas) et thèmes revendiqués.
4. **Taxonomie UE** — non collectée, jamais déduite de l'article SFDR.
5. **PAI** — on suit seulement la publication de la déclaration.
6. **Impact réel** — non mesuré par Seedow, et écrit comme tel.

Grille d'indicateurs E (6) / S (5) / G (4), fixe et publique. Couverture par
pilier et confiance (≥ 80 % élevée, ≥ 60 % moyenne, ≥ 30 % faible, sinon
insuffisante). `gatedPillarScore` refuse toute note sous 60 % de couverture ;
aucune note composite n'est affichée sur les surfaces publiques
(`docs/scoring-v2.md`).

## 5. Données de démonstration (`src/content/demo/fund-snapshots.json`)

Instantané figé par `scripts/snapshot-demo-funds.ts` à partir du classeur
produit officiel iShares (API publique de l'émetteur, URL rejouable conservée) :
identité, SFDR déclaré, TER, indice, expositions sectorielle et géographique,
répartition par devise (toutes positions), 150 premières positions, ~6 ans de
« croissance de 10 000 » fonds et indice, rendements publiés.

Seuls les **montants** du portefeuille de démonstration sont fictifs
(`SIMULATED`). L'instantané vieillit visiblement : il passe `STALE` au-delà des
fenêtres de fraîcheur. Le JSON n'est chargé que côté serveur
(`src/lib/demo/demo.functions.ts`).

Régénérer : `bun run scripts/snapshot-demo-funds.ts`.

## 6. Surfaces

| Route                 | Contenu                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `/demo`               | Parcours en 5 étapes : découvrir, explorer, analyser, comparer, comprendre |
| `/comparer`           | Filtrage du catalogue + comparaison de 4 fonds, export CSV                 |
| `/donnees`            | Registre des sources et statuts                                            |
| `/fonds/$isin`        | Fiche : performance, expositions, positions, six couches, couverture E/S/G |
| `/portfolio` (Impact) | Look-through des positions réelles de l'utilisateur                        |

## 7. Limites connues

- `fund_holdings` est vide en production : le look-through en ligne ne couvre
  que les fonds de l'instantané tant que le cron d'ingestion n'a pas tourné.
- Pas de taux sans risque sourcé : le ratio de Sharpe n'est pas affiché.
- Pas de note de risque ESG sous licence, pas de Taxonomie, pas de valeurs PAI.
- Les séries de performance sont dans la devise de la part (souvent USD) ;
  aucune conversion de change n'est appliquée.
- Le comparateur ne classe pas les fonds et ne recommande rien.
