# Méthodologie d'impact carbone — Seedow

> Ce document est la source de vérité de tout chiffre carbone affiché dans le
> produit. Il découle du non-négociable §1.2 du `CLAUDE.md` : **chaque chiffre est
> sourcé et attribué à l'écran**, et §1.3 : **pas de sur-promesse**. Si un écran
> affiche un chiffre carbone qui n'est pas décrit ici, c'est un bug de conformité,
> pas une fonctionnalité.

---

## 0. Ce que cette méthodo corrige

Avant, l'UI (`ImpactHero`, `certificat`) affichait un « CO₂ évité » et des
équivalences fabriqués :

```
co2_évité (t)   = co2_avoided_tons × montant / 10 000
arbres          = co2_évité × 45
énergie (kWh)   = montant / 5
```

Ces trois formules sont **inventées** : aucune n'est reliée à une donnée
d'émission réelle d'un émetteur, et `énergie = montant / 5` n'a strictement aucun
fondement physique. Afficher « tu as évité X tonnes / planté Y arbres » sur cette
base, c'est exactement le greenwashing que Seedow prétend combattre. Cette
méthodo les remplace par des mesures dérivées de données réelles, ou par **rien**
quand la donnée n'existe pas.

---

## 1. Deux grandeurs, jamais confondues

| Grandeur | Définition | Unité | Sert à |
|---|---|---|---|
| **Intensité carbone** | Émissions par euro investi et par an | gCO₂e/€/an | Comparer deux portefeuilles de tailles différentes |
| **Empreinte financée** | Intensité × montant investi (part couverte) | kg CO₂e/an | Rendre l'impact concret pour l'utilisateur |
| **WACI** | Weighted Average Carbon Intensity, émissions par M$ de chiffre d'affaires | tCO₂e/M$ CA | Comparer à un **indice de référence** (« vs ETF Monde ») |

- **Intensité** et **empreinte financée** suivent la logique **PCAF** (Partnership
  for Carbon Accounting Financials) / **GHG Protocol** : on attribue à
  l'investisseur une part des émissions de l'émetteur au prorata de son
  investissement. Code : `src/lib/esg/carbon.ts` → `computePortfolioCarbon`,
  `financedEmissionsKgPerYear`.
- **WACI** est l'indicateur **PAI SFDR** publié par les émetteurs (intensité par
  revenu). C'est la seule grandeur homogène pour comparer à un indice.
  Code : `computePortfolioWaci`, `relativeIntensityVsBenchmark`.

⚠️ **On ne convertit jamais un WACI (par revenu) en empreinte absolue (par €).**
Les deux mesures ne partagent pas le même dénominateur.

---

## 2. La règle d'or : couverture et qualité, toujours affichées

Aucun actif sans intensité carbone réelle ne contribue au calcul. On expose donc
systématiquement **deux garde-fous** :

- **Couverture** (`coverage`, 0..1) : part du poids du portefeuille disposant
  d'une donnée réelle. Une empreinte calculée sur 20 % du portefeuille n'est pas
  représentative — on l'indique.
- **Qualité PCAF** (1 = émissions vérifiées/auditées … 5 = estimées par proxy
  sectoriel) : on ne présente jamais une estimation grossière comme une mesure.

L'empreinte absolue est calculée sur `montant × couverture`, **pas** sur le
montant total : on n'extrapole jamais la donnée manquante.

---

## 3. Règle de visibilité (anti-greenwashing)

`src/lib/impact/equivalences.ts` → `presentImpact()` applique une règle unique et
non négociable pour l'affichage d'équivalences concrètes (« ≈ X km en voiture ») :

| Condition | Affichage |
|---|---|
| Pas de donnée carbone (`intensité = null`) | **Aucun chiffre carbone.** État « en cours de mesure » + score ESG réel. |
| Donnée **estimée** (basis ≠ `measured`) | Pas d'équivalence. Raison explicite. |
| Donnée mesurée mais **couverture < 50 %** | Empreinte affichable, mais **pas d'équivalence** (`impact.reason.low_coverage`). |
| Donnée mesurée **et couverture ≥ 50 %** | Empreinte + équivalences concrètes sourcées. |

Point d'entrée UI unique : `src/lib/impact/portfolioImpact.ts` →
`buildPortfolioImpact(metrics, montant)`. Tout composant qui affiche un chiffre
carbone **doit** passer par lui. `ImpactHero` et `certificat` le font.

---

## 4. Équivalences : facteurs sourcés et datés

Une équivalence n'est qu'une multiplication par un facteur **ADEME Base Carbone®**,
nommé, daté et attribué à l'écran (`ADEME_FACTORS`) :

| Équivalence | Facteur | Source | Millésime |
|---|---|---|---|
| km en voiture | 0,193 kgCO₂e/km | ADEME Base Carbone | 2023 |
| A/R Paris–New York (avion) | 1 800 kgCO₂e | ADEME / DGAC | 2023 |
| Repas avec bœuf | 7 kgCO₂e | ADEME Agribalyse | 2023 |
| Fabrication d'un smartphone | 57 kgCO₂e | ADEME | 2022 |

À réviser à chaque publication d'une nouvelle Base Carbone. **Ne jamais coder un
facteur « de mémoire »** sans source vérifiable.

Les « arbres équivalents » et « énergie verte financée » sont **supprimés** :
aucune source ne relie une empreinte carbone financée à un nombre d'arbres ou de
kWh de façon défendable au niveau d'un investisseur individuel.

---

## 5. Comparaison à un indice (« le miroir »)

Pour situer un portefeuille face à un « ETF Monde classique », on compare son
WACI à celui du **MSCI ACWI** (indice parent, non filtré) :

- **Référence : 115 tCO₂e/M$ de CA** (Scope 1+2), ligne *« Wtd avg carbon
  intensity (t CO₂e/$M sales) »* du **MSCI ACWI Climate Indexes Report, as of
  2026-06-30** (msci.com). Constante `BENCHMARK_ACWI_WACI` dans
  `src/lib/portfolio/server.functions.ts`, **à mettre à jour à chaque nouveau
  rapport MSCI daté**.
- L'écart relatif `(bench − portefeuille) / bench` est **signé honnêtement** : s'il
  est négatif (le portefeuille est **plus** intensif que l'indice), on l'affiche
  tel quel. Pas de sur-promesse (§1.3).
- Cette comparaison alimente le **miroir d'onboarding** (`MirrorReveal`), qui ne
  montre que des nombres réels calculés sur la sélection : WACI, écart vs indice,
  nombre de secteurs exclus, lignes filtrées de l'univers. Si le WACI n'est pas
  couvert, le miroir affiche « intensité en cours de mesure » au lieu d'inventer.
- **L'intensité WACI est aussi l'état « mesuré » du dashboard et du certificat.**
  Comme l'empreinte par € investi n'est pas encore sourçable (réservée à une
  divulgation future), `ImpactHero` / `ImpactRibbon` / `certificat` affichent, par
  ordre de préférence : (1) l'empreinte financée par € si elle existe un jour,
  (2) **sinon l'intensité WACI + l'écart vs ETF Monde** (sourçable dès aujourd'hui
  via les fiches fonds), (3) sinon le score ESG seul. Le WACI est agrégé dans les
  métriques du portefeuille (`computeMetrics`) sur la seule part couverte, avec sa
  couverture affichée. Le benchmark est centralisé dans `lib/esg/benchmark.ts`
  (source unique, serveur + client).

---

## 6. Ce que Seedow **ne** revendique **pas**

- ❌ Un « CO₂ évité » dérivé d'un score ESG. Le score ESG mesure une qualité de
  gestion des risques de durabilité, **pas** une tonne de CO₂.
- ❌ Des « émissions évitées » (avoided emissions) attribuées à un investisseur
  individuel : la littérature scientifique ne les considère pas robustes à cette
  échelle. On parle d'**empreinte** (ce que le portefeuille émet) et d'**écart
  d'intensité vs un indice**, jamais d'un « tu as sauvé la planète de X tonnes ».
- ❌ Des équivalences (arbres, kWh) sur une base non mesurée.
- ❌ Le moindre chiffre carbone certifié / réglementaire. Ce qu'on affiche est une
  mesure de transparence, pas un reporting SFDR opposable.

---

## 7. Carte du code

| Rôle | Fichier |
|---|---|
| Agrégation carbone PCAF (intensité, empreinte, couverture, qualité) | `src/lib/esg/carbon.ts` |
| WACI + comparaison indice | `src/lib/esg/carbon.ts` |
| Équivalences ADEME + règle de visibilité | `src/lib/impact/equivalences.ts` |
| Vue d'impact honnête pour l'UI (point d'entrée unique) | `src/lib/impact/portfolioImpact.ts` |
| Dashboard — bloc impact | `src/components/impact/ImpactHero.tsx` |
| Certificat | `src/routes/certificat.tsx` |
| Miroir d'onboarding | `src/components/onboarding/MirrorReveal.tsx` |
| Calcul serveur (WACI, écart, univers) | `src/lib/portfolio/server.functions.ts` |

Toute évolution de la méthodo se fait **dans `lib/`** (avec tests), jamais en
recodant une formule dans un composant.
