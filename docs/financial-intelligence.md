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
`FRESHNESS_DAYS` (cours 5 j, compositions 45 j, historique 10 j, historique
mensuel 45 j, documents réglementaires 400 j, ESG émetteur 548 j, indicateurs
ESG de fonds MSCI 120 j).

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
- `seriesFrequency` : quotidienne (écart médian ≤ 7 j), mensuelle (25–35 j) ou
  irrégulière. Sur une série mensuelle (ETF américains), pas de volatilité
  « quotidienne », écart de suivi annualisé sur 12 périodes, et la perte
  maximale entre fins de mois est signalée comme sous-estimant la perte
  intra-mois. Sur une série irrégulière, aucune mesure dépendant de la
  fréquence n'est calculée.

**Validation indépendante** (`performance.test.ts`) : sur les 10 fonds de
l'instantané (5 UCITS quotidiens, 5 ETF américains dont 4 mensuels), les rendements annualisés 1, 3 et 5 ans recalculés retrouvent
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
  associés) lu dans les répartitions publiées, avec sa couverture. Quand
  l'émetteur publie par sous-industrie (ETF thématiques), on additionne les
  sous-industries du secteur Énergie (`energySectorPct`).

## 4. Cadre ESG (`src/lib/esg/framework.ts`)

Six couches, rendues séparément, chacune avec son statut et « ce qu'elle ne dit
pas » :

1. **Classification SFDR** — catégorie de divulgation déclarée, pas une note.
   L'article déclaré par l'émetteur prime sur le catalogue ; un écart entre les
   deux est **affiché**, jamais arbitré en silence.
2. **Notation ESG** — la notation MSCI ESG du fonds quand l'émetteur la
   publie (ETF américains), reprise telle quelle et attribuée au calculateur
   ET au diffuseur ; sinon `UNAVAILABLE`. Jamais recalculée, jamais convertie
   en score Seedow, jamais utilisée pour classer. Dans un export, elle est
   signalée (`published_not_exported`) sans sa valeur.
3. **Caractéristiques promues** — exclusions _documentées_ (les secteurs « non
   vérifiés » ne comptent pas) et thèmes revendiqués.
4. **Taxonomie UE** — non collectée, jamais déduite de l'article SFDR.
5. **PAI** — on suit seulement la publication de la déclaration.

Hors Espace économique européen (`euFrameworkApplies`, lu sur le pays de
l'ISIN) et sans article déclaré, SFDR, Taxonomie et PAI sont « non
applicables » — ni un trou de collecte, ni un défaut du fonds. 6. **Impact réel** — non mesuré par Seedow, et écrit comme tel.

Grille d'indicateurs E (9) / S (8) / G (4), fixe et publique. Les ETF
américains remplissent, depuis leurs feuilles MSCI : intensité carbone (WACI,
scopes 1+2), hausse de température implicite (bande publiée), charbon
thermique et sables bitumineux (> 5 % du CA), armes controversées (≈ PAI 14),
violations du Pacte mondial (≈ PAI 10, sans les principes OCDE), tabac. Couverture par
pilier et confiance (≥ 80 % élevée, ≥ 60 % moyenne, ≥ 30 % faible, sinon
insuffisante). `gatedPillarScore` refuse toute note sous 60 % de couverture ;
aucune note composite n'est affichée sur les surfaces publiques
(`docs/scoring-v2.md`).

## 5. Données de démonstration et fonds de référence (`src/content/demo/fund-snapshots.json`)

Instantané figé par `scripts/snapshot-demo-funds.ts` à partir du classeur
produit officiel iShares (API publique de l'émetteur, URL rejouable conservée) :
identité, SFDR déclaré, TER, indice, expositions sectorielle et géographique,
répartition par devise (toutes positions), 150 premières positions, ~6 ans de
« croissance de 10 000 » fonds et indice, rendements publiés.

Dix fonds : cinq UCITS (le portefeuille de démonstration) et cinq ETF
américains — CRBN, ESGU, SUSL, ICLN, et IVV comme point de comparaison non ESG
(qui ne publie pas de feuilles MSCI : rien n'est inventé). Pour les classeurs
américains, l'ISIN est déduit du CUSIP publié (ISO 6166), le domicile en
découle, et les indicateurs MSCI (« Sustainability Characteristics »,
« Business Involvement ») sont conservés tels quels.

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
| `/comparer/rapport`   | Rapport institutionnel imprimable (A4, PDF), mêmes données que l'API       |
| `/developpeurs`       | Documentation de l'API publique et des exports                             |

## 7. API publique v1 et exports institutionnels (`src/lib/api/v1.ts`)

Lecture seule, sans authentification, CORS ouvert en lecture, cache en
bordure (`s-maxage=3600`). Spécification : `/api/public/v1/openapi.json`.

| Point d'accès                     | Contenu                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /funds`                      | Univers comparable, filtres `q`, `sfdr`, `maxTer`, `fossilPolicy`, `withPerformance` |
| `GET /funds/{isin}`               | Fiche complète, provenance `{ value, status, source, asOf }` par champ               |
| `GET /compare?isins=…`            | 1 à 8 fiches dans l'ordre demandé + lignes d'export                                  |
| `GET /compare?isins=…&format=csv` | CSV RFC 4180, colonnes stables `EXPORT_COLUMNS`                                      |

Règles : aucun classement (ordre alphabétique), aucun score, une valeur absente
est `null` + `UNAVAILABLE`, et **aucune donnée calculée par MSCI** n'est servie
(pas de licence de redistribution) — l'API indique seulement qu'elles existent
et où les lire. Le CSV, le JSON et le rapport imprimable sortent du même
assemblage (`lib/api/data.server.ts`, `exportRow`). Testé dans
`src/lib/api/__tests__/v1.test.ts`, y compris l'absence de toute valeur MSCI
dans les sorties.

## 8. Limites connues

- `fund_holdings` est vide en production : le look-through en ligne ne couvre
  que les fonds de l'instantané tant que le cron d'ingestion n'a pas tourné.
- Pas de taux sans risque sourcé : le ratio de Sharpe n'est pas affiché.
- Pas de note ESG sous licence : seules les notations MSCI que publient les
  émetteurs américains sont reprises (affichage attribué, pas d'export).
- Pas de Taxonomie ni de valeurs PAI : les annexes périodiques SFDR des
  émetteurs ne sont pas joignables depuis l'environnement de collecte, et aucun
  flux EET sous licence n'est branché. Les classeurs UCITS d'iShares ne
  contiennent pas ces valeurs.
- Les séries de performance sont dans la devise de la part (souvent USD) ;
  aucune conversion de change n'est appliquée.
- Le comparateur ne classe pas les fonds et ne recommande rien.
