# Scoring v2 — indice de transparence Seedow (STI 2.0)

**Version** 2.0 · **Périmètre** Observatoire, fiches fonds, aperçu public de la landing · **Remplace** le score composite de durabilité 0–100

---

## 1. La décision

**Le score de durabilité est abandonné.** Trois raisons, dans l'ordre.

**Il est indéfendable.** Noter la durabilité d'un fonds suppose de mesurer un effet sur le monde. Seedow écrit lui-même, sur sa page de méthodologie, qu'il ne mesure pas cet effet. Le score comblait ce vide par des estimations et des appréciations internes non publiées : la structure exacte du greenwashing que la marque dénonce.

**Il est perdu d'avance.** Sur le terrain de la notation de durabilité, les concurrents sont MSCI, Sustainalytics, ISS et Clarity AI, avec des équipes d'analystes et des données propriétaires. Seedow n'a que des documents publics. Sur ce terrain, la comparaison est toujours défavorable.

**Il produit des classements toxiques.** Un ETF nucléaire à 86 au-dessus d'un ETF solaire à 45 est un titre de presse contre Seedow. Tout score agrégé unique finit par produire ce résultat, quelle que soit la pondération.

**Ce qui le remplace.** Seedow ne note plus si un fonds est durable : il note **ce que le fonds publie, et à quel niveau de précision**. Fait vérifiable par un tiers, indépendant de la domiciliation, non attaquable, et territoire que personne n'occupe. Le renversement est total : un fonds qui ne publie pas son intensité carbone ne fait plus baisser la fiabilité de Seedow, il fait baisser sa propre note.

---

## 2. Les trois objets, strictement séparés

| Objet                            | Nature                | Agrégation                  | Où il vit dans le code            |
| -------------------------------- | --------------------- | --------------------------- | --------------------------------- |
| **Indice de transparence (STI)** | Fait documentaire     | Score 0–100                 | `src/lib/esg/v2/sti.ts`           |
| **Constats d'écart**             | Contradiction sourcée | Jamais agrégée, liste finie | `src/lib/esg/v2/discrepancies.ts` |
| **Faits bruts**                  | Donnée publiée        | Jamais agrégée              | repris tels quels dans les vues   |

Aucun n'alimente les deux autres. Un fonds peut avoir un STI de 90 **et** un constat : il publie beaucoup, et dans ce qu'il publie il y a une contradiction. C'est l'usage le plus intéressant de l'Observatoire, et il serait invisible si le constat faisait baisser le score. Le test `observatory.test.ts` verrouille cette indépendance.

---

## 3. La grille STI 2.0

| Bloc | Objet                                                                                                  | Points |
| ---- | ------------------------------------------------------------------------------------------------------ | ------ |
| A    | Documentation accessible (KID 5, politique d'exclusion 10, rapport ESG 5, composition ≤ 1 mois 10)     | 30     |
| B    | Précision des exclusions — 6 secteurs × (seuil quantifié 4 / sans seuil 2 / non mentionné 0), plafonné | 25     |
| C    | Métriques d'impact publiées (scope 1+2 10, scope 3 5, taux de couverture 5, PAI 5)                     | 25     |
| D    | Fraîcheur de la donnée la plus récente des blocs A et C (≤ 3 mois 10, 3–6 6, 6–12 3, au-delà 0)        | 10     |
| E    | Vérification tierce (label public 5, audit tiers 5)                                                    | 10     |

Le bloc C est ouvert aux fonds non européens : un ETF américain qui publie son intensité carbone marque les points. C'est là que la neutralité de domiciliation se joue.

**Le bloc B note la précision de la déclaration, pas la sévérité.** Un fonds qui déclare explicitement ne pas exclure les fossiles est plus transparent qu'un fonds silencieux, et il marque donc plus de points. C'est contre-intuitif : la phrase figure noir sur blanc sur `/methodologie` et dans le composant `StiBlocks`, sinon la grille est lue de travers.

### Règle d'abstention

Trois statuts par signal — `publié`, `absent`, `non_vérifié` — et le troisième n'est pas un zéro :

- `absent` est un fait sur **le fonds** (recherche menée, rien publié) : il coûte des points ;
- `non_vérifié` est un fait sur **Seedow** (source injoignable) : il rend le bloc **nul**, jamais zéro.

Confondre les deux fait payer au fonds les trous de collecte de Seedow. C'est ce qui rendait 59 des 67 constats de la v1 attaquables.

Le STI n'est publié que si **4 blocs sur 5** sont évaluables, **A et B obligatoirement**. Sinon : « Documentation insuffisante pour être noté », sans chiffre. Le score publié est reproportionné sur les blocs évalués, et la fiche affiche sur combien de blocs il a été calculé.

Le **taux de fonds non notables** est publié en tête d'Observatoire, avant tout classement.

### Libellés

`80–100` transparence élevée · `60–79` correcte · `40–59` partielle · `< 40` faible · `n/a` non notable.

Aucun libellé ne contient « aligné », « durable », « responsable » ou « bon ».

---

## 4. Constats d'écart — typologie fermée

Un constat requiert **trois éléments simultanés** : une revendication citée d'un document public avec source et date ; un fait d'un document public qui la contredit, avec source et date ; **aucune inférence** entre les deux. `isOpposable()` est la porte, et la contrainte SQL `fund_discrepancies_opposable` l'impose aussi en base.

| Code | Constat                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| E1   | Article 8/9 sans aucune exclusion sectorielle formelle publiée                                           |
| E2   | Terme durable dans la dénomination ou l'objectif, sans exclusion publiée sur les secteurs correspondants |
| E3   | Intensité carbone publiée supérieure à l'indice de référence **déclaré par le fonds lui-même**           |
| E4   | Engagement de reporting au prospectus, non tenu depuis plus de 24 mois                                   |
| E5   | Divergence entre communication commerciale et prospectus                                                 |

E3 est le seul qui compare des chiffres, et il utilise l'indice déclaré par le fonds, jamais un indice choisi par Seedow. C'est la différence entre un constat et une opinion.

**Supprimés définitivement** : « revendication durable sans donnée carbone mesurée » (trou de données Seedow → bloc C du STI), « revendication appuyée sur des données estimées » (décrit la source Seedow → indicateur de couverture), « thème environnemental avec score climat à la limite » (circulaire : Seedow attribuait le thème puis constatait l'écart avec son propre score).

Chaque constat s'affiche en trois lignes fixes, la troisième obligatoire :

```
Ce que le fonds déclare : « [citation] » — [document], [date]
Ce que le document montre : [fait] — [document], [date]
Ce que ce constat ne dit pas : [limite explicite]
```

---

## 5. Thèmes, déduplication, comparaison

**Thèmes.** Les pourcentages sont supprimés (saisis à la main, tous multiples de 5, méthode jamais publiée). Trois niveaux sourcés : _revendiqué_ (dénomination ou objectif d'investissement), _mentionné_ (documentation ESG sans être un objectif), _non revendiqué_. **Seedow n'attribue aucun thème que le fonds ne revendique pas** — ce qui supprime d'un coup l'or physique en « climat 10 % », les monétaires thématisés et l'ETF cyber en « biodiversité 85 % ».

**Déduplication.** L'entité de référence est le fonds, clé `(émetteur, stratégie, indice répliqué)`. Les parts de classe sont des attributs : une fiche, un STI, les ISIN listés dessous.

**Comparaison.** Aucun tri global du catalogue. Les comparaisons n'existent qu'à l'intérieur d'un groupe de pairs `(classe d'actifs, zone, thématique déclarée)`. `assertComparable()` échoue à l'exécution plutôt que de laisser une nouvelle surface d'affichage contourner la règle.

**Interdictions d'affichage** : aucun score sans son taux de couverture au même niveau visuel ; aucun libellé qualitatif sans le chiffre ; aucune moyenne de STI par émetteur.

---

## 6. Gouvernance

- **Notification préalable** à l'émetteur, 15 jours ouvrés, date affichée sur la fiche.
- **Droit de réponse** publié intégralement, sans commentaire de Seedow. Un constat contesté reste publié, avec la mention.
- **Correction** sous 48 h si le document manquant est produit, tracée dans l'historique (`fund_discrepancy_events`) — jamais de suppression silencieuse.
- **Versionnage** : toute modification de la grille produit une version numérotée avec changelog public (`sti_methodology_versions`) et recalcul complet.

Un émetteur notifié, publié avec sa réponse et corrigé sous 48 h n'attaque pas.

---

## 7. Où c'est implémenté

```
src/lib/esg/v2/
├── signal.ts            # le grain : statut, valeur, source, dates, méthode
├── sti.ts               # la grille, l'abstention, la reproportion, les libellés
├── discrepancies.ts     # E1–E5, la porte d'opposabilité, les détecteurs
├── fund-entity.ts       # déduplication des parts de classe
├── theme-claims.ts      # les trois niveaux, aucune attribution
├── peer-group.ts        # groupes de pairs, refus du classement inter-catégories
├── observatory.ts       # assemblage, statistiques d'en-tête
└── observatory.functions.ts   # server functions (liste + fiche)

src/components/observatory/     # StiScore, StiBlocks, DiscrepancyCard,
                                # ThemeClaims, SectorDisclosure
src/routes/observatoire.tsx     # la liste, groupée par pairs
src/routes/fonds.$isin.tsx      # la fiche
src/routes/api.public.esg-preview.ts   # même assemblage, servi en edge
supabase/migrations/20260901120000_scoring_v2_sti.sql
scripts/build-fund-entities.ts  # phase 0 : déduplication du catalogue
```

---

## 8. Séquence

- **Phase 0 — assainissement, sans nouvelle donnée.** Score et libellés d'alignement retirés, pourcentages thématiques retirés, constats non opposables retirés, parts de classe regroupées. Fait : le code ne peut plus produire ces objets. `scripts/build-fund-entities.ts` écrit les entités et initialise les 16 signaux à `non_verifie` — le catalogue démarre donc en « documentation insuffisante », ce qui est l'état honnête tant que rien n'a été collecté.
- **Phase 1 — collecte.** Pipeline documentaire sur le catalogue dédupliqué (~70 fonds). Blocs A, B et D d'abord : 65 points sur 100, aucune donnée payante.
- **Phase 2 — publication du STI.** Grille publiée avant les scores ; page méthodologie réécrite (faite).
- **Phase 3 — constats E2 à E5**, une fois la base documentaire constituée.

---

## 9. Ce que la v2 fait perdre

112 lignes deviennent ~70. 67 constats deviennent 8. Des pourcentages thématiques précis deviennent trois niveaux. Un score de durabilité disparaît.

En échange : un indicateur qu'aucun émetteur ne peut contester, sur un territoire que personne n'occupe, et une réponse claire à « qu'apportez-vous de plus que l'article SFDR sur le KID ». Un observatoire plus petit et vrai vaut mieux qu'un observatoire large et attaquable, parce que la seule chose que Seedow vend est sa crédibilité.
