# 08 — Unit Economics

> **Aucune donnée réelle** (CAC, LTV, conversion, churn) n'existe dans le repo → **rien n'est inventé**. Ci-dessous : un *framework* + trois scénarios avec hypothèses explicites, à remplacer par les vraies cohortes dès instrumentation.

## Définitions (à instrumenter en priorité)

- **CAC** = dépense d'acquisition ÷ nouveaux inscrits activés.
- **Activation** = a complété onboarding + généré un portefeuille + revu Le Fil (proposition de définition — à figer).
- **Conversion payante** = abonnés ÷ inscrits activés.
- **ARPU** = revenu moyen / utilisateur payant / an.
- **Churn** = attrition mensuelle des payants.
- **LTV** = ARPU × marge brute × durée de vie (1/churn).
- **Payback** = CAC ÷ (ARPU mensuel × marge).

## Scénarios (hypothèses, modèle abonnement 50 €/an, marge brute ~80 %)

| Hypothèse | Conservative | Base | Aggressive |
|---|---:|---:|---:|
| CAC (activé) | 25 € | 15 € | 8 € |
| Inscrit→activé | 35 % | 50 % | 65 % |
| Activé→payant | 3 % | 6 % | 12 % |
| ARPU (€/an) | 40 | 50 | 60 |
| Churn payant (mensuel) | 5 % | 3,5 % | 2 % |
| Durée de vie (mois) | 20 | ~29 | 50 |
| **LTV** (ARPU×0,8×vie/12) | **~53 €** | **~96 €** | **~200 €** |
| CAC *par payant* (=CAC/conv.) | 833 € | 250 € | 67 € |
| **LTV/CAC (par payant)** | **0,06** ❌ | **0,38** ❌ | **3,0** ✅ |

**Lecture brutale.** Avec une conversion payante de 3-6 % sur un produit **sans exécution**, l'économie **ne tient pas** : le CAC ramené au *payant* écrase la LTV. Le modèle abonnement seul ne devient viable que dans le scénario agressif (conversion ≥ 12 %, CAC ≤ 8 €), improbable sans acquisition organique forte.

## Implications

1. **L'acquisition organique est vitale** (certificat viral, SEO cours, PR anti-greenwashing) — le paid seul ne finance pas ce modèle.
2. **La conversion doit venir de l'acte réel** : brancher l'exécution/passerelle courtier change la willingness-to-pay et la rétention (un utilisateur qui a de l'argent placé ne churne pas comme un simulateur).
3. **Le modèle % d'encours** (si exécution) a une économie très différente : un abonné à 5 000 € d'encours × 0,5 % = 25 €/an *récurrents et croissants* → LTV bien supérieure. C'est l'argument pour, à terme, exécuter (`07`/`14`).
4. **B2B2C/licence data** contourne le CAC retail (le distributeur amène les utilisateurs) → meilleure économie unitaire à moyen terme.

## À prouver (les seules choses qui comptent)

- **Activation réelle** (≥ 40-50 % inscrit→portefeuille) et **rétention D30/D90** de cohortes.
- **Willingness-to-pay** (un vrai test de prix, pas une intention).
- **CAC organique** via la boucle certificat/contenu.

> Tant que ces trois chiffres sont UNKNOWN, toute valorisation « SaaS/fintech » est spéculative. Voir `13` et `15`.
