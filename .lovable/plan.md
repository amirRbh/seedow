## Direction retenue

- **Palette** : Vert sombre & Sable
  - `--ink: #1e2a1f` (vert nuit, fond sombre & texte principal)
  - `--ink-2: #2d4a2f` (vert forêt, secondaire)
  - `--paper: #e8e0d0` (sable clair, fond principal)
  - `--paper-2: #f0e9da` (sable lumière, alt fond)
  - `--gold: #d4a574` (terracotta sable, accent)
  - `--gold-soft: #c89868` (variante hover)
- **Typo** : on conserve Space Grotesk + DM Sans (verrouillé en mémoire)
- **Registre** : éditorial cinéma — grandes typos, scroll-driven, révélations lentes, filets fins, grain papier subtil
- **Motion** : niveau 3/5 — élégant, jamais agressif. Respect de `prefers-reduced-motion`.
- **Périmètre** : landing en priorité + passe de cohérence sur header, transitions, nav, KPI, séparateurs partout

## Ce qui change

### 1. Tokens couleurs (`src/styles.css`)
Remplacement des variables `--ink`, `--ink-2`, `--paper`, `--paper-2`, `--gold`, `--gold-soft` par les nouveaux hex. Tous les composants existants (boutons, eyebrows, KPI, gold-rule) suivent automatiquement.

### 2. Matière papier (nouveau)
- Ajout d'une utility `.paper-grain` : overlay SVG de grain très subtil (opacité 0.04) appliqué au body, pour donner une vraie texture de page imprimée.
- Vignette douce sur les sections sombres (radial-gradient discret aux coins).

### 3. Landing (`src/routes/index.tsx`) — passe wow
- **Hero** : le "seedow." passe en `display-2xl` (clamp jusqu'à ~14rem), tracking resserré, point or animé (pulse lent). L'effet de scale-down au scroll est conservé mais affiné.
- **Eyebrow numéroté** : tous les eyebrows reçoivent un compteur "N° 01 / 06" tabulaire à côté du label, façon revue éditoriale.
- **Manifesto** : passage du fade word-by-word à un reveal par ligne avec un filet or qui suit le scroll à gauche du paragraphe.
- **Démo audit** : transformation en "fiche éditoriale" — fond papier, numéro de série en haut, KPI alignés sur baseline, mini graphe sparkline horizontal sous le score ESG.
- **Piliers** : grande numérotation `01 / 02 / 03` en outline (font 6xl, stroke 1px or), titre en dessous, filet vertical fin séparateur entre colonnes.
- **Section méthode** (fond sombre) : ajout d'un grain plus marqué + vignette + un large filet or animé (`GoldRuleReveal` étendu).
- **CTA final** : remplacement des blurs gold/moss par un dégradé radial sable→vert sombre + grain. Bouton or avec micro-shimmer au hover.

### 4. Header sticky (`StickyHeader`)
- Backdrop blur passe de `xl` à `2xl` + filet or animé sous le header au scroll (apparaît à partir de 200px).
- Logo "seedow." reçoit un point or qui pulse très lentement.

### 5. RailNav (`src/components/layout/RailNav.tsx`)
- Indicateur actif : remplace le fond plein par un filet or vertical à gauche de l'icône + icône en `text-gold`.
- Hover : transition douce 250ms avec léger scale.
- Tooltip de label sur hover (déjà présent) restylé en chip papier avec ombre fine.

### 6. KPIFigure (`src/components/ui/KPIFigure.tsx`)
- Animation de count-up au reveal (IntersectionObserver, 600ms, easing cubic-out).
- Suffixe (`€`, `%`, `/100`) plus petit, baseline alignée.
- Ligne de baseline or fine sous la valeur.

### 7. EditorialSection (`src/components/ui/EditorialSection.tsx`)
- Ajout d'un numéro de section optionnel (prop `index`) affiché en outline géant en arrière-plan (opacité 0.06), façon presse magazine.

### 8. Transitions de page
- Fade + translate-y léger (motion) entre routes, 400ms, easing `[0.22, 1, 0.36, 1]`. Géré dans `__root.tsx` via `AnimatePresence`.

### 9. Footer
- Réorganisation 3 colonnes : marque + tagline / liens / mention légale. Filet or en haut.

## Hors scope

- Aucun changement de copy / lexique
- Aucun changement de typo (Space Grotesk + DM Sans conservés)
- Aucun changement de logique métier, données, routes, auth
- Pas de Three.js, WebGL, ou lib lourde — Framer Motion suffit
- Le hero garde son architecture, on l'affine ; pas de refonte structurelle

## Diagramme de la nouvelle landing

```text
┌──────────────────────────────────────────────┐
│ [header sticky + filet or au scroll]         │
├──────────────────────────────────────────────┤
│  N° 01 — ÉDITION 2026                        │
│                                              │
│  SEEDOW·                       (scale-down)  │
│                                              │
│  Épargner proprement.                        │
│  [CTA primaire]  [CTA secondaire]            │
│  [beta counter]                              │
│                                              │
│  ── sans banque ── méthode ── sources ── ↓   │
├──────────────────────────────────────────────┤
│  N° 02 — MANIFESTO                           │
│  │ Le manifesto se révèle ligne par ligne    │
│  │ avec un filet or qui descend à gauche.    │
├──────────────────────────────────────────────┤
│  N° 03 — DÉMO  [fiche papier + sparkline]    │
├──────────────────────────────────────────────┤
│  N° 04 — PILIERS                             │
│   01 │  02 │  03   (grands chiffres outline) │
├──────────────────────────────────────────────┤
│  N° 05 — MÉTHODE  [fond sombre + grain]      │
├──────────────────────────────────────────────┤
│  N° 06 — FAQ                                 │
├──────────────────────────────────────────────┤
│  CTA final [radial sable→vert + grain]       │
├──────────────────────────────────────────────┤
│  Footer 3 colonnes                           │
└──────────────────────────────────────────────┘
```

## Détails techniques

- Grain : SVG inline base64 en background-image, taille 200×200, répété, `mix-blend-mode: multiply` sur fond clair / `screen` sur fond sombre.
- Count-up KPI : hook custom `useCountUp(target, { duration: 600 })` avec `requestAnimationFrame`, déclenché par IntersectionObserver (once).
- Transitions de route : `AnimatePresence mode="wait"` autour de `<Outlet />` dans `__root.tsx`. Clé = `location.pathname`.
- Tous les nouveaux composants respectent `prefers-reduced-motion: reduce` (skip animations, état final immédiat).
- Mise à jour de `mem://index.md` : palette Emerald Prestige → "Forest & Sand", nouveaux hex.

## Fichiers touchés (estimation)

- `src/styles.css` — tokens + utilities grain/vignette
- `src/routes/index.tsx` — refonte sections landing
- `src/routes/__root.tsx` — transitions de page + grain global
- `src/components/layout/RailNav.tsx` — indicateur actif
- `src/components/ui/KPIFigure.tsx` — count-up
- `src/components/ui/EditorialSection.tsx` — numéro outline
- `src/components/ui/GoldRuleReveal.tsx` — variante longue
- `mem://index.md` + `mem://design/palette` (nouveau) — mise à jour mémoire
