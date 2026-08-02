## Ce que j'ai vérifié avant de répondre

Trois lectures, pas une intuition :

1. **`assets` en base (112 actifs actifs)** : il n'existe que **3 valeurs distinctes de `expected_return`** sur 112 actifs — 0,1073 pour la quasi-totalité, plus deux valeurs de seed résiduelles (0,07 et 0,03) sur des actifs sans historique suffisant. En revanche la volatilité, elle, est bien différenciée (106 valeurs distinctes).
2. **`src/lib/market/risk-model.ts`** : le shrinkage de James-Stein calcule `w = min(1, (N−2)·moy(SE²)/dispersion)`. Avec 2 ans d'historique et ~110 actifs, le bruit d'estimation écrase la dispersion → **w = 1**, donc *tous* les rendements attendus sont ramenés exactement à la moyenne transversale. C'est mathématiquement conforme à l'estimateur, mais l'information de rendement disparaît totalement.
3. **`portfolios` en base (41 portefeuilles)** : rendement attendu moyen **4,12 %**, volatilité moyenne **6,15 %**, score ESG moyen **47,2**.

## Le diagnostic : l'écart n'est pas un coût de l'ESG

Le raisonnement « on est plus bas parce qu'on n'a pas tous les actifs / parce que le durable coûte du rendement » n'est **pas** ce que disent les données.

Quand tous les μ sont identiques, l'optimiseur moyenne-variance n'a plus aucune raison d'arbitrer entre actifs sur le rendement : le terme linéaire `μᵀw` devient une constante. Markowitz dégénère mécaniquement en **minimum-variance pur**. Résultat : il charge les obligations et le cash jusqu'aux bornes de classe, et sort un portefeuille à 6 % de vol / 4 % de rendement attendu. Face à un S&P 500 à 14,3 % de rendement et 14,25 % de vol, l'écart de 10 points ne mesure pas l'impact de l'ESG — il mesure **un portefeuille prudent comparé à un portefeuille 100 % actions US**.

Deux problèmes distincts se cumulent, et il faut les traiter séparément :

- **Un bug d'estimation** : le shrinkage à 100 % vide le modèle de son signal de rendement.
- **Une comparaison malhonnête par construction** : comparer un multi-actifs à 6 % de vol à un indice actions à 14 % de vol, sans normaliser le risque, ça n'a pas de sens financier. On perd toujours en haussier, on gagne toujours en baissier, et l'utilisateur n'apprend rien.

Le second point est aussi ce qui rend l'argument « même si tu perds, tu as un impact » faible aujourd'hui : on ne montre pas ce qu'on achète avec l'écart.

## Ce que je propose

### Volet 1 — Réparer le signal de rendement (cause racine)

- Plafonner l'intensité de shrinkage (`w ≤ 0,8` typiquement) : on garde la robustesse de James-Stein sans annihiler la dispersion. C'est la pratique standard côté buy-side.
- Ancrer les rendements attendus sur des **primes de risque par classe d'actifs** plutôt que sur la moyenne transversale : la cible de shrinkage devient la moyenne *de la classe* (actions dev / émergentes / thématique / obligataire / REIT / cash), pas la moyenne globale. Une obligation verte et un ETF actions monde n'ont aucune raison de converger vers le même chiffre.
- Allonger la fenêtre d'estimation là où l'historique existe, et exposer dans la méthodologie le nombre d'observations retenues par actif.
- Couvrir le tout par des tests dans `src/lib/portfolio/__tests__/` : invariant « la dispersion des μ après shrinkage reste > 0 », et « un actif actions a un μ supérieur à un actif monétaire ».

### Volet 2 — Rendre la comparaison honnête

- **Normaliser par le risque** : afficher côte à côte rendement attendu, volatilité et Sharpe, et ajouter une ligne « à volatilité comparable » — projeter le benchmark ramené au niveau de risque du portefeuille utilisateur. C'est la seule comparaison qui ait un sens.
- **Nommer l'écart** : un bloc « prix de l'alignement » qui dit explicitement, en euros sur 10 ans, ce que coûte (ou rapporte) l'écart vs le benchmark choisi. Pas de dissimulation, pas d'excuse.
- **Afficher le scénario baissier** : ce que devient le capital sur une année à −30 %, sur le portefeuille et sur le benchmark. C'est exactement ton point : la volatilité doit être montrée avant d'être subie, pas découverte.
- Retirer la comparaison ESG/carbone quand le benchmark ne publie rien (déjà fait pour S&P/CAC) et l'afficher franchement comme « non publié ».

### Volet 3 — Ce que l'écart achète réellement

C'est le cœur de ton intuition, et aujourd'hui il n'est pas monétisé à l'écran. Proposition : un module « contrepartie » sous le comparatif, qui rapporte les métriques d'impact réelles **au même capital** que la projection financière :

- Intensité carbone financée (WACI) du portefeuille vs indice parent MSCI ACWI, en tCO₂e/M$ — donnée réelle, déjà en base pour les fonds couverts, avec le taux de couverture affiché.
- Secteurs exclus effectivement absents du portefeuille (fossiles, armes, tabac…), avec le poids qu'ils représentent dans l'indice de référence.
- Répartition thématique du capital sur les causes choisies.

Le tout formulé sans surpromesse : « ton capital ne finance pas X » est vérifiable ; « ton capital évite Y tonnes » ne l'est pas et ne doit pas être écrit.

### Volet 4 — L'univers d'actifs

Réel mais secondaire. 112 actifs suffisent largement pour une optimisation multi-classes crédible ; les classes fines restent maigres (`social_bond` : 3, `cash` : 2, `sov_bond` : 5), ce qui contraint l'optimiseur aux bornes. À élargir après les volets 1 et 2, sinon on ajoute du bruit sur un modèle qui n'exploite pas encore son signal.

## Ordre recommandé

1. Volet 1 (le chiffre affiché est faux tant que ce n'est pas corrigé)
2. Volet 2 (comparaison à risque égal + prix de l'alignement + scénario −30 %)
3. Volet 3 (contrepartie d'impact)
4. Volet 4 (élargissement de l'univers)

## Détails techniques

- `src/lib/market/risk-model.ts` : `shrinkExpectedReturns` — plafond sur `w`, cible de shrinkage par classe d'actifs (nouvelle signature prenant la classe de chaque actif).
- `src/routes/hooks/recompute-risk-model.ts` : relance du recalcul après correction, puis vérification que `count(distinct expected_return)` remonte bien au-dessus de 3.
- `src/components/portfolio/ComparatifPanel.tsx` : lignes Sharpe et « à volatilité comparable », bloc « prix de l'alignement », scénario baissier.
- Nouveau composant pour le module contrepartie, alimenté par `src/lib/impact/portfolioImpact.ts` et `src/lib/esg/benchmark.ts` (ACWI WACI = 115, déjà sourcé et daté).
- `src/routes/methodologie.tsx` : documenter le plafond de shrinkage et la convention de comparaison à risque égal.
- Nouvelles chaînes via `update_locales.ts`.
