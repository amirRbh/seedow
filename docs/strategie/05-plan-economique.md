# Livrable 5 — Plan économique

> **Aucun chiffre de ce document n'est mesuré.** Taux de conversion, de rétention, temps de livraison et prix sont des hypothèses de travail, rangées dans [hypotheses.md](hypotheses.md) et remplacées par des mesures au fil des pilotes. Les calculs sont reproductibles à la main ; la simulation sur 12 mois a été faite en Python (formule : `clients(m) = clients(m-1) × (1 − attrition) + pilotes × conversion`).

## 1. Opportunité A — Pré-contrôle documentaire pour SGP (recommandée)

### Ce qu'on vend et comment on facture

| Élément                   | Valeur                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Produit                   | Rapport de pré-contrôle par fonds + suivi                                                                                            |
| Payeur                    | Société de gestion                                                                                                                   |
| Unité de facturation      | Le pilote (≤ 10 fonds), puis l'abonnement mensuel de suivi                                                                           |
| Prix d'entrée             | **Pilote 2 400 € HT**, 50 % à la commande                                                                                            |
| Prix cible du suivi       | **450 € HT/mois** (prudent : 300 ; ambitieux : 750 avec relecture des documents commerciaux)                                         |
| Coût variable par client  | ~10 €/mois (extraction de texte, LLM, stockage) [SUPPOSÉ]                                                                            |
| Temps de livraison        | Pilote : 12 h au début, objectif 6 h ; suivi : 4 / 3 / 2,5 h par mois selon le scénario                                              |
| Coût horaire de livraison | 37,5 €/h si délégué à un analyste (≈ 4 500 €/mois chargé pour 120 h productives) [SUPPOSÉ]                                           |
| Coûts fixes               | ~450 €/mois : expert-comptable 100, RC Pro 100, logiciels et infra 150, banque 20, avocat amorti 50, divers 30 [SUPPOSÉ, à chiffrer] |
| Coût d'acquisition        | Temps fondateur : ~25 h/mois de prospection ; cash ≈ 0 € (aucune publicité)                                                          |
| Récupération du CAC       | **Immédiate** : le pilote est payé, il finance son acquisition                                                                       |
| Besoin de trésorerie      | 1 000 à 1 500 € : note d'avocat (300–800 €), création de la structure, premier trimestre d'assurance                                 |

### Marge brute unitaire du suivi (livraison comptée à 37,5 €/h)

| Scénario  | Prix/mois | Heures/mois | Coût livraison | Coût variable | Marge brute | Taux |
| --------- | --------: | ----------: | -------------: | ------------: | ----------: | ---: |
| Prudent   |     300 € |         4 h |          150 € |          10 € |       140 € | 47 % |
| Central   |     450 € |         3 h |        112,5 € |          10 € |     327,5 € | 73 % |
| Ambitieux |     750 € |       2,5 h |         93,8 € |          10 € |     646,2 € | 86 % |

**Lecture** : à 300 €/mois et 4 h de travail, le service n'est pas une bonne affaire dès qu'il faut payer quelqu'un pour le livrer. **Prix plancher du suivi recommandé : 400 € HT/mois.**

### Trois scénarios à 10, 50 et 100 clients récurrents

Hypothèses de dimensionnement : le fondateur livre lui-même jusqu'à 40 h/mois ; au-delà, des analystes à 4 500 €/mois pour 120 h. Coûts fixes portés à 750 €/mois à 50 clients et 1 200 €/mois à 100 clients (outils, comptabilité, assurance plus élevée).

| Clients | Scénario  | CA mensuel | Coût variable | Analystes    | Fixes | **Résultat opérationnel / mois** | Heures fondateur |
| ------: | --------- | ---------: | ------------: | ------------ | ----: | -------------------------------: | ---------------: |
|      10 | Prudent   |    3 000 € |         100 € | 0            |   450 |                      **2 450 €** |   40 + 25 prosp. |
|      10 | Central   |    4 500 € |         100 € | 0            |   450 |                      **3 950 €** |          30 + 25 |
|      10 | Ambitieux |    7 500 € |         100 € | 0            |   450 |                      **6 950 €** |          25 + 25 |
|      50 | Prudent   |   15 000 € |         500 € | 2 (9 000 €)  |   750 |                      **4 750 €** |       40 + vente |
|      50 | Central   |   22 500 € |         500 € | 1 (4 500 €)  |   750 |                     **16 750 €** |       40 + vente |
|      50 | Ambitieux |   37 500 € |         500 € | 1 (4 500 €)  |   750 |                     **31 750 €** |       40 + vente |
|     100 | Prudent   |   30 000 € |       1 000 € | 3 (13 500 €) | 1 200 |                     **14 300 €** |       40 + vente |
|     100 | Central   |   45 000 € |       1 000 € | 3 (13 500 €) | 1 200 |                     **29 300 €** |       40 + vente |
|     100 | Ambitieux |   75 000 € |       1 000 € | 2 (9 000 €)  | 1 200 |                     **63 800 €** |       40 + vente |

**Ce tableau ne montre pas** : les revenus ponctuels des pilotes (en plus), l'impôt sur les sociétés ou le revenu, les cotisations sociales du fondateur, les délais de paiement. **Le résultat opérationnel n'est pas la rémunération du fondateur.**

**Réalisme** : 100 SGP clientes représenteraient entre un tiers et deux tiers de la cible qualifiée estimée en France (150–300, non mesurée). Le scénario à 100 clients **suppose** soit l'ouverture au Luxembourg et à la Belgique, soit le canal C (cabinets de conformité). En France seule, 30 à 50 clients est un plafond plus plausible à 2–3 ans [SUPPOSÉ].

### Trajectoire sur 12 mois (simulation)

| Scénario  | Pilotes/mois | Pilote → suivi | Attrition/mois | Clients M3 |  MRR M3 | Clients M6 |  MRR M6 | Clients M12 |  **MRR M12** | CA pilotes/mois |
| --------- | -----------: | -------------: | -------------: | ---------: | ------: | ---------: | ------: | ----------: | -----------: | --------------: |
| Prudent   |            1 |           30 % |            5 % |        0,9 |   257 € |        1,6 |   477 € |         2,8 |    **827 €** |         2 400 € |
| Central   |            2 |           50 % |            3 % |        2,9 | 1 310 € |        5,6 | 2 505 € |        10,2 |  **4 592 €** |         4 800 € |
| Ambitieux |            3 |           70 % |            2 % |        6,2 | 4 631 € |       12,0 | 8 990 € |        22,6 | **16 954 €** |         7 200 € |

Le pilote est la source principale de chiffre d'affaires la première année dans les trois scénarios : **il faut le vendre comme un produit à part entière**, pas comme un essai.

### Combien de clients pour chaque palier

| Palier de CA mensuel | Avec le suivi seul (450 €) | Avec pilotes (2 400 €)     | Mixte réaliste                               |
| -------------------- | -------------------------- | -------------------------- | -------------------------------------------- |
| 1 000 €              | 3 clients                  | 1 pilote tous les 2,4 mois | 1 pilote ce mois-ci                          |
| 5 000 €              | 12 clients                 | 2 pilotes/mois             | 6 suivis + 1 pilote/mois                     |
| 10 000 €             | 23 clients                 | —                          | 15 suivis + 1 cabinet partenaire + 1 pilote  |
| 30 000 €             | 67 clients                 | —                          | 40 suivis + 4 cabinets partenaires + pilotes |

### Scénario « quelques clients à forte valeur » (canal C)

3 cabinets de conformité externalisée qui utilisent l'outil pour leurs clients SGP, à 2 000 € HT/mois chacun (≈ 10 SGP chacun, 8 h de travail Seedow/mois) : **6 000 € de MRR**, marge brute ≈ 82 % (8 h × 37,5 € + 50 € de variable = 350 € de coût par cabinet). Risque : concentration (un cabinet = un tiers du CA).

### Point mort

- **Point mort « survie »** (couvrir les coûts fixes, fondateur non payé) : 450 €/mois ⇒ **1 client en suivi**, ou un pilote tous les cinq mois.
- **Point mort « fondateur payé 3 000 € net/mois »** : en micro-entreprise de services, cotisations sociales d'environ 25 % du CA [À VÉRIFIER : taux et plafond 2026 avec un expert-comptable] ⇒ CA ≈ (3 000 + 450 + 100) / 0,75 ≈ **4 700 € HT/mois**, soit environ 2 pilotes par mois, ou 6 suivis + 1 pilote.

## 2. Opportunité B — Gouvernance produit pour distributeurs (alternative)

| Élément              | Valeur [SUPPOSÉ]                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Unité de facturation | Abonnement mensuel par cabinet, selon le nombre de fonds référencés                            |
| Prix                 | 250 € HT/mois (150 à 400)                                                                      |
| Livraison            | 1,5 h/mois après outillage                                                                     |
| Marge brute unitaire | 250 − 56 − 5 = 189 € ⇒ **76 %**                                                                |
| CAC                  | Plus élevé qu'en A : plus de prospects pour un ticket plus petit ; canal associations / salons |

| Clients | CA mensuel | Marge brute |   Fixes | Résultat opérationnel |
| ------: | ---------: | ----------: | ------: | --------------------: |
|      10 |    2 500 € |     1 890 € |   450 € |           **1 440 €** |
|      50 |   12 500 € |     9 450 € |   750 € |           **8 700 €** |
|     100 |   25 000 € |    18 900 € | 1 200 € |          **17 700 €** |

Lecture : B a besoin de **deux fois plus de clients** que A pour le même revenu, mais l'univers est plus large (~1 470 CIF de plus de 50 clients, S1) et le besoin est récurrent par obligation.

## 3. Opportunité C — Marque blanche pour cabinets de conformité

| Clients (cabinets) | Prix         | CA mensuel | Marge brute (82 %) | Fixes | Résultat |
| -----------------: | ------------ | ---------: | -----------------: | ----: | -------: |
|                  3 | 2 000 €/mois |    6 000 € |            4 950 € | 450 € |  4 500 € |
|                 10 | 2 000 €/mois |   20 000 € |           16 500 € | 750 € | 15 750 € |

Il n'existe probablement pas 50 ou 100 cabinets de ce type en France : la modélisation à 50 et 100 clients n'a pas de sens pour C.

## 4. Ce qu'il faut retenir

1. **Le premier euro vient du pilote, pas de l'abonnement.** Objectif du mois 1 : un pilote signé.
2. **Le prix plancher du suivi est 400 €** ; en dessous, le service ne survit pas à l'embauche d'un analyste.
3. **Le temps de livraison est la variable qui décide de tout** : il doit passer de 12 h à 6 h par pilote après trois pilotes. C'est la seule raison de continuer à coder.
4. **Les 1 000 € mensuels sont atteignables en un mois avec un pilote**, les 5 000 € demandent 6 à 12 mois dans le scénario central, les 10 000–30 000 € demandent un canal partenaire ou l'international.
