## Audit — état réel constaté (chiffres tirés de la base aujourd'hui)

**Univers investissable : 79 actifs actifs**, répartis ainsi :

| Classe | Actifs actifs |
|---|---|
| thematic | 33 |
| equity_dev | 19 |
| corporate_bond | 6 |
| equity_em | 5 |
| green_bond | 5 |
| reit / sov_bond / commodity | 3 chacun |
| cash | 2 |
| **social_bond** | **0** (les 3 existants sont désactivés) |

Régions : 42 « world », 18 us, 12 europe, 5 em, 1 japan, 1 pacific.

### Ce qui marche déjà (à mettre en avant en beta)
- 79/79 actifs ont un `yahoo_symbol` et une cotation ; 76/79 ont un historique de prix ; 2 206 paires de covariance calculées → le moteur Markowitz tourne sur des données réelles.
- Cron d'ingestion marché actif (jours ouvrés 18h), dernier run OK le 31/07 — le trou du 1-2 août est simplement le week-end, pas une panne.
- 41 portefeuilles déjà générés, moyenne 8,4 lignes par portefeuille : la génération est robuste.
- Parcours complet en place : simulateur sans compte, Ethi, cours, impact, méthodologie.

### Les 5 trous qui peuvent faire échouer une beta ouverte

1. **Impact carbone entièrement vide.** 0 actif sur 79 a un `waci_tco2e_per_musd_sales` ou un `carbon_intensity_gco2e_per_eur`. Conséquence directe : le bloc Impact (delta WACI vs ETF Monde, intensité brute) n'a rien à afficher, alors que c'est la promesse centrale du produit. C'est le point n°1, avant même d'ajouter des actifs.
2. **Classe `social_bond` vide alors que le moteur en exige.** Les bornes de classe imposent un minimum de 5 % en social_bond sur les profils défensif et équilibré. Sans aucun actif éligible, l'optimiseur part en contrainte non satisfaite : **14 portefeuilles sur 41 (34 %) sortent avec `esg_floor_relaxed = true`**. Un tiers des utilisateurs voit un portefeuille dégradé.
3. **Traçabilité ESG à moitié absente.** 39 actifs sur 79 n'ont aucun `esg_score_source`, les 40 autres portent `seedow-internal-v1`. Aucun n'a de `esg_data_asof`. 61 sur 79 n'ont pas d'ISIN. C'est en contradiction frontale avec la règle « chaque chiffre est sourcé et daté », et c'est exactement ce que le persona sceptique du greenwashing va tester.
4. **Filtres d'exclusion peu discriminants.** 33 actifs sur 79 ont un tableau `excluded_sectors` vide : cocher « fossiles » ou « armes » ne les écarte jamais, même si l'exposition réelle existe. Le filtre paraît fonctionner sans être fiable.
5. **Profondeur insuffisante sur les classes non-actions.** Obligations, REIT, matières premières et cash tournent à 2-6 lignes. Le best-in-class (top 50 % ESG par classe) ne s'applique même pas en dessous de 4 actifs → sur ces classes, on garde tout, y compris les moins bien notés.

### Priorisation pour la beta ouverte
Ordre d'impact décroissant : (2) débloquer social_bond → (1) remplir le carbone → (3) sourcer/dater l'ESG → (5) élargir l'univers → (4) fiabiliser les exclusions.

---

## Plan proposé

### Étape 1 — Débloquer les portefeuilles dégradés
Réactiver ou remplacer les 3 obligations sociales désactivées par des lignes cotées avec symbole Yahoo valide, puis recalculer la covariance. Objectif mesurable : faire tomber le taux de `esg_floor_relaxed` sous 10 % sur des générations de test couvrant les trois profils de risque.

### Étape 2 — Étendre l'univers à ~110-120 actifs
Ajout ciblé sur les classes creuses plutôt qu'un empilement d'actions thématiques :
- social_bond : 4-5 lignes
- green_bond : +5 (10 au total)
- sov_bond : +5 (8 au total)
- corporate_bond : +6 (12 au total)
- reit : +4 (7 au total)
- equity_em : +5 (10 au total)
- equity_dev : +5 sur régions sous-couvertes (Japon, Pacifique, Canada)
- commodity : +2

Chaque ajout passe par une migration avec ticker, ISIN, symbole Yahoo, TER, scores E/S/G, article SFDR, exclusions sectorielles et exposition aux causes — pas de ligne partielle. Vérification que la cotation Yahoo répond avant insertion.

### Étape 3 — Remplir la donnée carbone
Renseigner `waci_tco2e_per_musd_sales`, sa source et `esg_data_asof` sur les actifs pour lesquels l'émetteur publie la donnée. Là où elle n'existe pas, l'afficher comme « non publiée » dans la fiche plutôt que de la laisser vide silencieusement. Le comparatif vs ACWI (115 tCO2e/M$) devient alors réellement calculable, avec son taux de couverture affiché.

### Étape 4 — Sourcer et dater tout l'ESG
Compléter `esg_score_source`, `esg_data_asof` et l'ISIN sur les 79 actifs existants. Afficher source + date sur la fiche actif et dans le screener.

### Étape 5 — Fiabiliser les exclusions
Passer en revue les 33 actifs sans exclusion déclarée et renseigner leurs secteurs exclus à partir des documents fournisseur. Ceux dont on ne sait rien sont marqués comme non vérifiés dans la couverture de données, pas comme « propres ».

### Détails techniques
- Tout passe par des migrations SQL (INSERT/UPDATE sur `public.assets`), suivies d'un recalcul de `asset_covariance` via le hook `recompute-risk-model`.
- La nouvelle classe éventuelle n'est pas nécessaire : l'enum `asset_class` couvre déjà tous les besoins listés.
- Les bornes de classe dans `src/lib/portfolio/types.ts` seront revérifiées après l'étape 2 pour vérifier qu'aucun minimum ne cible une classe trop mince.
- Tests : ajouter un test de non-régression qui échoue si une classe référencée avec un `min > 0` dans `getClassBounds` n'a aucun actif actif en base.

### Ce que ce plan ne traite pas
L'acquisition et l'onboarding (1 seule inscription en liste d'attente, 7 comptes, 0 retour de feedback à ce jour) : la donnée d'usage est trop mince pour en tirer une conclusion produit. À traiter dans un second temps, une fois l'univers solide.
