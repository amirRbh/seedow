# Refonte Landing — Direction Apple

Refonte visuelle de `src/routes/index.tsx` uniquement (le reste de l'app conserve son style éditorial). Ambiance apple.com : sections pleine largeur alternées, très gros titres bold, whitespace généreux, hiérarchie centrée, aucun ornement.

## Principes visuels

- **Palette (nouveaux tokens `--apple-*` dans `src/styles.css`, scopés à la landing)**
  - `#FFFFFF` fond principal
  - `#F5F5F7` fond sections secondaires (le gris signature Apple)
  - `#1D1D1F` texte / sections dark
  - `#86868B` texte secondaire
  - Accents conservés : `--mint #00C77A`, `--ice #0099CC`, `--volt #8B4FE0` — usage parcimonieux, un accent par section
- **Typo** : Inter partout (déjà chargé). Titres en Inter 600/700 très larges (jusqu'à 96px), tracking serré (-0.03em), line-height 1.05. Body Inter 400 17-21px, `#86868B`. Aucun uppercase, aucun Bebas, aucun mono sur la landing.
- **Aucun** : filet or, grain, ticker défilant, pill mono uppercase, badge coloré agressif, gradient, ombre.

## Structure (sections pleine largeur empilées)

```text
[ NAV        ] fond blanc, blur, liens gris → noir au hover, CTA pill noir
[ HERO       ] blanc, titre géant centré, sous-titre, 2 CTA, phrase forte conservée
[ SECTION 1  ] gris #F5F5F7, "Votre argent finance…" — titre géant + 3 stats grands chiffres
[ SECTION 2  ] blanc, "Vois ton impact" — mockup visuel centré (garden preview)
[ SECTION 3  ] noir #1D1D1F, "Ethi, l'IA qui répond" — chat mockup centré, texte blanc
[ SECTION 4  ] gris, "Deux façons de commencer" — 2 cards larges côte à côte
[ CTA FINAL  ] blanc, titre géant + email form minimal
[ FOOTER     ] gris clair, minimal
```

Chaque section : `min-height` généreux (600-800px), padding vertical 120-160px, contenu max-width 980px centré.

## Éléments clés

- **Hero** : garde la phrase forte actuelle « Votre argent façonne déjà **le monde.** » — mint uniquement sur « le monde ». Titre en Inter 700, ~96px desktop. Deux CTA : `Rejoindre la beta` (pill noir plein) + `Voir les cours` (lien texte avec flèche, style Apple `Learn more ›`).
- **Stats problème** : 3 chiffres géants (120px Inter 600) alignés horizontalement, chacun avec une phrase courte en dessous. Pas de card, pas de border — juste des chiffres qui respirent.
- **Section Ethi (dark)** : reproduit le pattern Apple des sections noires — texte blanc, chat mockup simplifié (bulles arrondies 20px, mint pour user, gris `#2D2D2F` pour Ethi).
- **Cards « commencer »** : deux cards larges radius 22px (comme Apple), fond blanc sur gris, titre large, description, CTA texte.
- **CTA final** : titre géant + input email arrondi 40px style Apple search bar.

## Détails techniques

- Fichiers touchés : `src/routes/index.tsx` (refonte complète du composant `Landing`), `src/styles.css` (ajouter section `/* Apple landing tokens */` avec `--apple-bg`, `--apple-surface`, `--apple-text`, `--apple-text-2` + classes utilitaires `.apple-title` (clamp 44-96px, weight 700, tracking -0.03em), `.apple-subtitle`, `.apple-btn-primary` (pill noir), `.apple-btn-link` (lien avec chevron)).
- Aucun changement dans les autres routes, composants, ou logique métier.
- On garde : le composant `HeroForm`, `CtaForm`, `joinWaitlist`, la logique `isAuthed`, tous les liens existants.
- On supprime de la landing : le ticker défilant, les badges pill mono uppercase, les filets or (`gold-rule`), le `paper-card`, les `eyebrow`, l'usage de Bebas/JetBrains Mono.
- Responsive : mobile-first, titres qui scalent avec `clamp()`, sections plein écran restent lisibles sur mobile.

## Ce qui n'est pas touché

Le dashboard, les cours, la méthodologie, l'auth, les composants partagés — tous conservent la DA éditoriale magazine/data terminal existante. Seule la landing publique adopte le style Apple.
