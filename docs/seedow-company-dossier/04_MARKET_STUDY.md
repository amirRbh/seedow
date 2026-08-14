# 04 — Market Study

> Toutes les données externes sont datées et sourcées ; détail dans `20_DATA_AND_SOURCES.md`. Sources privilégiées : régulateur (AMF), Morningstar, Commission européenne. Les rapports d'analystes privés (tailles de marché) sont signalés comme tels (méthodo variable).

## 1. Retail investing — France (source primaire : AMF)

- **1,9 M** de particuliers actifs sur les actions en France en 2025, **+21 %** vs 2024 ; 56 M de transactions (vs 41 M). _(FACT — AMF, Tableau de bord n°21, mars 2026.)_
- **> 1,1 M** d'investisseurs ETF en 2025, **+83 %** vs 607 000 en 2024. _(FACT — AMF.)_
- **2,5 M** de Français ayant passé au moins un ordre en 2025 ; **780 000 nouveaux** entrants en 2025 (1,6 M sur 3 ans). _(FACT — AMF.)_
- Signal clé : **l'ETF est le véhicule d'entrée du retail** et il croît deux fois plus vite que l'action en direct → cohérent avec l'univers ETF/fonds de Seedow.

## 2. Investissement durable — Europe (sources : Morningstar, Commission UE)

- **~50 % des encours (AUM) de l'UE** sont classés **Article 8 ou 9 SFDR** ; l'Europe représente **~84 % des actifs de fonds durables dans le monde**. _(FACT — Morningstar, Q3 2025.)_
- Flux **Article 8 : +75 Md€** de collecte nette au T3 2025 (vs 47 Md€ au trimestre précédent) ; +52 Md€ au T1 2025 (plus haut depuis 2021). _(FACT — Morningstar.)_
- **Risque réglementaire structurant** : la Commission européenne a proposé (20 nov. 2025) une **révision « SFDR 2.0 » pivotant vers un régime de labels** (abandon possible de la logique Article 6/8/9). _(FACT — COM(2025) 841.)_ → **L'heuristique greenwashing de Seedow, indexée sur l'article SFDR (`lib/esg/transparency.ts`), devra être refondue.** Voir `11`/`19`.

## 3. Wealthtech / robo-advisory — Europe

- Marché robo-advisory **Europe ~2,77 Md$ (2025)**, ~28 % du marché mondial ; AUM robo mondiaux > 1 000 Md$. _(ESTIMATION d'analystes privés — Market.us / Fortune Business Insights ; méthodo non uniforme, à traiter comme ordre de grandeur.)_
- Leader européen : **Scalable Capital > 20 Md€ d'AUM**. _(FACT — Mandalore Partners, European WealthTech Map 2026.)_
- Le paysage wealthtech européen s'est densifié (IA, actifs numériques, données ESG, regtech). Seedow se situe au croisement **données ESG + robo léger + pédagogie/engagement**.

## 4. Pourquoi maintenant (synthèse)

Trois courbes convergent _(interprétation appuyée sur les FACTs ci-dessus)_ :

1. **Entrée massive du retail** jeune via l'ETF (AMF).
2. **Domination européenne de la finance durable** (84 % des actifs mondiaux) + défiance greenwashing → besoin de transparence vérifiable.
3. **IA conversationnelle** rendant la pédagogie personnalisée économiquement viable (Ethi).

## 5. Vents contraires

- **Consolidation** : Trade Republic, Revolut, Scalable, BoursoBank offrent déjà ETF à bas coût + (parfois) filtres ESG. Le retail responsable n'est pas un marché vierge.
- **Fatigue ESG / backlash** et **incertitude réglementaire (SFDR 2.0)** : le label « durable » est contesté et mouvant.
- **Barrière réglementaire à l'exécution** : devenir plateforme d'investissement en Europe exige agrément (PSI/CIF, KYC/AML, MiFID II) — coûteux, long. C'est le vrai fossé entre Seedow-simulateur et Seedow-plateforme.

## 6. TAM / SAM / SOM (dimensionnement défendable)

> Méthode assumée **top-down croisée bottom-up**, marché **France d'abord** (langue, personas, données AMF), extensible UE. Chiffres de traction propres à Seedow : **UNKNOWN**. Ce sont des ordres de grandeur à défendre, pas des promesses.

**Hypothèses ARPU** _(HYPOTHÈSE — aucun prix n'existe encore)_ : scénario abonnement B2C **~50 €/an** (4,17 €/mois), cohérent avec un premium wealthtech léger. Alternative « couche + rétrocession » traitée en `07`.

- **TAM (France, cœur cible).** Investisseurs retail actifs + entrants récents sensibles ESG. Base : ~2,5 M d'actifs 2025 + 1,6 M d'entrants sur 3 ans (AMF). En retenant **~3 M** de personnes atteignables comme public d'un outil d'investissement responsable grand public × 50 €/an = **~150 M€/an**. _(ESTIMATION.)_
- **SAM (France, réellement accessible).** Sous-segment jeune (25-40), ETF-first, à sensibilité ESG déclarée. En posant **~30 %** du TAM (part plausible « valeurs + digital-native ») ≈ **~900 k personnes × 50 € = ~45 M€/an**. _(ESTIMATION — le 30 % est l'hypothèse la plus fragile ; à sonder.)_
- **SOM (3 ans, réaliste).** Capture de **1-3 %** du SAM en abonnés payants : **9 000–27 000 abonnés → 0,45–1,35 M€ ARR**. _(OBJECTIF, conditionné à : exécution réelle branchée, activation prouvée, canal d'acquisition rentable.)_

**Sensibilité.** Le SOM bascule d'un ordre de grandeur selon (a) le modèle (abonnement vs % d'encours vs B2B2C), (b) l'ouverture UE (×5 à ×8 le TAM), (c) le fait d'exécuter ou non les investissements (un modèle % d'encours change tout le calcul — voir `07`/`08`).

> **Honnêteté d'investisseur** : à revenu = 0 et traction = UNKNOWN, ces chiffres sont un _cadre de raisonnement_, pas une preuve de marché. La preuve à obtenir : cohortes réelles d'activation et de rétention (voir `15`).
