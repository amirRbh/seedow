## Objectif

Remplacer l'unique `ImpactHero` de l'accueil par une **séquence éditoriale de 3 modules empilés**, ton *data-terminal froid* (mono, chiffres bruts, laisser la donnée parler). Chaque module = un angle réel, aucun chiffre inventé, tout sourcé.

## Emplacement

`src/routes/dashboard.tsx` — remplace le bloc `{portfolio && holdings.length > 0 && <ImpactHero />}` placé juste après la valeur totale.

Le portfolio (`/portfolio` → onglet Impact) garde l'`ImpactHero` actuel inchangé.

## Structure — 3 modules empilés

### Module 1 — Empreinte carbone (chiffre principal)
- Eyebrow mono `N° 01 · EMPREINTE FINANCÉE` + rang N/N sur ta base.
- Gros chiffre `kg` ou `t CO₂e/an` en Bebas Neue XL (comme aujourd'hui), unité en mono ink-2.
- Sous-ligne équivalence tangible : `≈ 3 200 km voiture · ADEME 2024`.
- Ligne meta mono : `COUVERTURE 78% · MÉTHODE PCAF`.
- Fallback honnête si non mesuré : afficher WACI seul, ou état "en cours de mesure" (mêmes règles que `buildPortfolioImpact` déjà en place).

### Module 2 — Comparaison ETF Monde (contraste)
- Eyebrow `N° 02 · VS. ETF MONDE (ACWI)`.
- Deux colonnes côte à côte, style tableau de cotation :
  - Ton portefeuille : WACI en mono XL.
  - ACWI (référence) : WACI en mono XL, ink-2.
- Barre horizontale de contraste (deux segments), pas de camembert.
- Verdict factuel : `−50% D'INTENSITÉ CARBONE` en mint (ou `+X%` en alert si plus intensif), badge pill mono.
- Source : `MSCI ACWI · {ACWI_WACI_ASOF}`.

### Module 3 — Répartition par thème
- Eyebrow `N° 03 · OÙ VA TON ARGENT`.
- Agrégation dérivée en pur front : somme `allocationPct` des holdings groupée par `causes: CauseTag[]` (climat, biodiversité, humain, égalité, tech, circulaire). Répartir un holding multi-causes équitablement entre ses tags.
- Rendu : liste verticale de barres horizontales fines, chacune :
  - Label mono uppercase gauche (`CLIMAT`, `BIODIVERSITÉ`…).
  - Barre pleine ink (largeur = %).
  - % en mono bold à droite.
- Trié desc, top 4-5, reste en `AUTRES`.
- Note bas mono ink-3 : `BASÉ SUR LES TAGS DES {N} ACTIFS DE TON PORTEFEUILLE`.

### Bandeau tête de section — Score ESG
Au-dessus des 3 modules, ligne horizontale sobre :
- À gauche : `IMPACT` en Bebas display XL.
- À droite : `SCORE {esgScore}/100` en mono, badge pill neutre.
- Filet ink 1px `.gold-rule`.
- Lien discret `MÉTHODE →` en haut à droite.

## Design tokens (locked, mémoire)

- Fond : `bg-paper`, cards `bg-paper-2 border-paper-3 rounded-[14px]`, PAS d'ombre, PAS de gradient.
- Un seul accent signal actif à la fois par module : mint pour "moins intensif", alert pour "plus intensif", volt réservé au module thèmes si besoin d'un highlight.
- Chiffres : `.kpi-figure` / mono bold. Labels/eyebrows : mono uppercase tracking 0.15em ink-2.
- Espacement généreux entre modules (py-8), whitespace éditorial.

## Fichiers touchés

- **Créer** `src/components/impact/ImpactStack.tsx` — orchestrateur des 3 modules.
- **Créer** `src/components/impact/modules/FootprintModule.tsx`
- **Créer** `src/components/impact/modules/BenchmarkModule.tsx`
- **Créer** `src/components/impact/modules/ThemeBreakdownModule.tsx`
- **Créer** `src/lib/impact/themeBreakdown.ts` (pure) + test unitaire dans `__tests__/`.
- **Modifier** `src/routes/dashboard.tsx` — remplacer `<ImpactHero />` par `<ImpactStack />`.
- **Modifier** `src/i18n/locales/fr.json` + `en.json` — clés `impact_stack.*`.

## Règles produit respectées (mémoire projet §1, §5)

- Zéro chiffre non sourcé : équivalences ADEME datées, benchmark ACWI daté, thèmes = tags déclaratifs des actifs (mention explicite).
- Aucun langage jardin/graines.
- Cohérent avec `buildPortfolioImpact` existant (pas de duplication de logique carbone).
- Le portefeuille (`/portfolio`) reste inchangé — l'`ImpactHero` actuel y demeure.
