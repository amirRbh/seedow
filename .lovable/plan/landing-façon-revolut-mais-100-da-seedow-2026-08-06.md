# Landing façon Revolut — mais 100 % DA Seedow

Objectif : reprendre les codes qui rendent la landing Revolut immédiatement lisible et « premium fintech » (hero sombre plein écran, cartes produit géantes arrondies, titres courts en deux temps, bandeau de preuve sociale, sections colorées qui s'enchaînent), en gardant strictement notre système de couleurs (paper / ink / mint / ice / volt / solar / alert), notre typo Inter, et notre exigence de sourcer chaque chiffre.

## Ce qu'on reprend de Revolut

1. **Hero sombre pleine hauteur** — fond `ink`, titre très court en 2 mots + accroche d'une phrase, un seul CTA dominant (+ un lien secondaire). On garde la phrase forte actuelle mais raccourcie au format Revolut.
2. **Bandeau de preuve** juste sous le hero — au lieu de « 75M de clients », nos preuves réelles : nombre de fonds analysés, sources de données (MSCI, SFDR, Yahoo Finance), places bêta restantes, « aucun conseil financier ». Ligne de petits badges monospace.
3. **Sections « produit » en cartes géantes** — le pattern Revolut « titre court en 3 mots + une phrase + un lien + visuel produit ». Chaque carte prend un accent unique : simulateur = ice, impact = mint, cours = volt, méthodologie = solar.
4. **Scroll narratif** — les cartes s'enchaînent en plein écran, alternance fond paper / fond ink, coins très arrondis (24–32px), visuels produits réels (composants existants : `HeroPreview`, `KPIFigure`, `EsgQuickCheck`, tour guidé).
5. **Bloc final CTA plein écran** sur fond ink avec le wordmark, un seul bouton.
6. **Micro-motion sobre** — apparition au scroll (fade + translate 12px), hover `scale(1.02)` sur les cartes, rien d'agressif.

## Nouvelle structure de la page

```text
1  NAV sticky (inchangée, léger allègement)
2  HERO ink plein écran — titre court + 1 CTA + aperçu produit flottant
3  BANDEAU PREUVE — badges sources / chiffres réels (mono, sourcés)
4  CARTE 1 · ice   — « Vois où va ton argent » + aperçu simulateur
5  CARTE 2 · mint  — « Ton impact, chiffré » + KPI ESG / WACI réels
6  CARTE 3 · alert — le constat (stats 0% / ∞ / 1), fond ink, chiffres géants
7  CARTE 4 · volt  — cours gratuits (LandingCourses, format carte Revolut)
8  CARTE 5 · ice   — Ethi (garde le mockup chat, recadré en carte)
9  CARTE 6 · solar — méthodologie ouverte + test ESG sans compte (EsgQuickCheck)
10 CTA FINAL ink   — 1 bouton, places bêta, mention « simulation, pas d'investissement »
11 FOOTER (inchangé)
```

Le tour guidé (`LandingTour`) est absorbé dans la carte 1 pour éviter la redondance avec l'aperçu simulateur.

## Détails techniques

- Réécriture de `src/routes/index.tsx` autour d'un composant local `ShowcaseCard` (titre, phrase, lien, slot visuel, accent) réutilisé par les 6 cartes — évite les 400 lignes de JSX dupliqué actuelles.
- Nouveaux utilitaires dans `src/styles.css` : `.rv-hero`, `.rv-card` (radius 28px, padding généreux, bordure `paper-3`), `.rv-card--ink`, `.rv-proof-bar`, `.rv-reveal` (animation d'apparition, désactivée sous `prefers-reduced-motion`). Aucune couleur en dur : uniquement les tokens existants et les variantes `-ink` texte-safe.
- Les composants `LandingTour`, `EsgQuickCheck`, `LandingCourses`, `CoursePreviewDialog`, `HeroPreview` sont conservés et simplement replacés dans les nouvelles cartes (adaptation de leur wrapper, pas de leur logique).
- Toutes les chaînes passent par i18n (`update_locales.ts`) — nouvelles clés sous `landing.rv.*`, anciennes clés inutilisées supprimées.
- Analytics conservés : `landing_viewed` + `landing_cta_clicked` avec un `placement` par carte pour mesurer quelle section convertit.
- Contraste : les nouvelles paires texte/fond passent par la suite de tests `src/lib/a11y/__tests__/contrast.test.ts` existante.
- Rien ne change côté backend, données ou logique métier.
