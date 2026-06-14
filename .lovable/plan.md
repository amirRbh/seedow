## Objectif

Rendre l'impact positif sur la nature beaucoup plus visible — aujourd'hui il n'apparaît que sur `/portfolio` via `ImpactRibbon`, et le dashboard ne montre que la valeur financière. On va le hisser au rang de second pilier narratif du dashboard, juste après la valeur, et lui donner un traitement éditorial cohérent avec la charte sobre (blanc ivoire, encre, or, vert forêt désaturé).

## Changements

### 1. Nouveau composant `ImpactHero` (signature éditoriale)

Fichier : `src/components/impact/ImpactHero.tsx`

- Bloc large, fond `paper` avec `paper-grain`, filet `gold-rule` en tête, eyebrow « N° 02 · Impact réel ».
- Chiffre héro **CO₂ évité** en `KPIFigure` size `xl` (Space Grotesk tabulaire), animé au mount via `AnimatedFigure`.
- Sous-ligne courte : équivalence concrète auto-choisie (« ≈ X arbres plantés sur 1 an » ou « ≈ Y trajets Paris–Lyon évités ») pour rendre le chiffre tangible.
- Bandeau de 3 mini-KPI alignés sous un filet or fin : arbres équivalents, énergie verte financée (kWh/MWh), score impact (0–100) — chacun en `KPIFigure` size `sm` avec libellé uppercase tracking 0.22em.
- Lien discret « Voir la méthodologie » → `/methodologie`, et « Détail de l'impact » → `/portfolio#impact`.
- **Pas de gradient moss saturé** comme l'actuel `ImpactRibbon` — on reste sur fond papier avec accents or/vert forêt désaturé pour respecter la direction Institutional White.

### 2. Intégration sur le dashboard

Fichier : `src/routes/dashboard.tsx`

- Insérer `<ImpactHero />` juste après le bloc valeur (section 1), **avant** l'aperçu portefeuille, pour qu'il soit le deuxième élément vu au scroll.
- Conditionner à `portfolio && plants.length > 0` (rien à montrer sans investissement).
- Source des données : `usePortfolioValuation` + `portfolio.metrics` (déjà disponibles), même calcul d'estimation CO₂ que `portfolio.tsx` (`co2_avoided_tons * totalInvested / 10000`).

### 3. Refonte de `ImpactRibbon` sur `/portfolio`

Fichier : `src/components/garden/ImpactRibbon.tsx`

- Remplacer le gradient vert saturé `from-moss-1 via-moss-2 to-moss-3` par un traitement papier cohérent : fond `paper-2`, filet or, chiffres en `KPIFigure`, accent or sur le CO₂.
- Garder l'API (`co2Avoided`, `treesEquivalent`, `energyFinanced`, `esgScore`) pour ne rien casser ailleurs.
- Retirer les emojis 🌳⚡✨ (incohérents avec le ton éditorial sobre) — remplacer par des micro-pictos SVG fins ou simplement par les labels.

### 4. i18n

Fichier : `src/i18n/locales/{fr,en}.json`

- Ajouter `impact_hero.eyebrow`, `impact_hero.headline`, `impact_hero.equivalence_trees`, `impact_hero.equivalence_trips`, `impact_hero.see_methodology`, `impact_hero.see_detail`, labels des 3 mini-KPI.
- Lexique sobre, sans champ lexical jardin (cf. mémoire projet).

## Détails techniques

- `ImpactHero` lit `usePortfolioValuation()` + `useActivePortfolio()` côté client (déjà fait dans `EthiBriefing`).
- Équivalence concrète : sélection déterministe basée sur la magnitude du CO₂ (≥ 1 t → trajets longue distance ; < 1 t → arbres). Pas de `Math.random` (hydration-safe).
- Réutilise `KPIFigure`, `AnimatedFigure`, `.paper-grain`, `.gold-rule` déjà en place.
- Aucune modification backend / metrics / engine — uniquement présentation.

## Hors scope

- Pas de nouvelles métriques calculées (biodiversité, eau, etc.) — on travaille avec ce que le moteur fournit déjà.
- Pas de refonte de `/portfolio` au-delà du restyling de `ImpactRibbon`.
- Pas de changement sur `EthiBriefing` ni sur le moteur de portefeuille.
