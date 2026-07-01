# Landing "wow" — hero vivant + transitions au scroll

Objectif : donner du souffle à la landing sans casser la ligne Apple. Portée : `src/routes/index.tsx` + ajout d'animations dans `src/styles.css`. Aucune autre partie de l'app n'est touchée.

## 1. Hero — visualisation vivante en fond

Derrière le titre "Votre argent façonne déjà le monde.", on ajoute une couche d'arrière-plan animée qui *montre* le produit sans le dire.

Composition :
- Grille floue de ~40 pastilles/barres colorées (mint, ice, volt, gris Apple) réparties en fond, opacité 0.15–0.25, blur léger.
- Chaque pastille pulse doucement (scale 1 → 1.05, opacity oscillante) avec des délais aléatoires → sensation d'un portefeuille "vivant".
- 3 chiffres flottants discrets (ex. `+2.4%`, `€1,240`, `CO₂ −18kg`) qui apparaissent/disparaissent en fondu tous les 4–6s à des positions fixes.
- Un halo radial mint très dilué au centre, derrière le titre, pour concentrer le regard.
- Titre au-dessus avec un `z-index` clair + fond blanc/70 en radial derrière la typo pour garantir la lisibilité.

Titre lui-même :
- Reveal doux au chargement (fade + rise, séquentiel ligne par ligne, ~120ms de décalage).
- "le monde." reste mint, avec un fin trait mint dessiné en dessous en 0.6s à l'apparition.

Rien de JS lourd : tout en CSS keyframes + quelques `animation-delay` inline.

## 2. Transitions entre sections

Chaque section suivante reçoit :
- `reveal-on-scroll` : fade-in + translateY(24px → 0) déclenché via `IntersectionObserver` (un petit hook local, ~15 lignes).
- Les grands chiffres (`0%`, `∞`, `1` dans la section stats) s'animent à l'apparition : fade-in + scale 0.92 → 1, avec un léger décalage entre les trois.
- Les barres de l'allocation "Ton portefeuille, enfin lisible" grandissent de 0 → hauteur finale sur 800ms à l'entrée dans le viewport.
- Bulles de chat Ethi apparaissent une par une (150ms d'écart) quand la section entre à l'écran.

## 3. Détails de polish

- Curseur au-dessus du bouton "Rejoindre la beta" : léger scale 1.02 + ombre douce mint.
- Séparateurs entre sections : au lieu de couleurs de fond franches, on garde les fonds actuels mais on ajoute un `border-top` 1px `#D2D2D7` très discret pour marquer le rythme.
- Le fond animé du hero se désactive sur `prefers-reduced-motion`.

## Détails techniques

- `src/routes/index.tsx` : ajout d'un composant `<HeroLiveBackground />` local (SVG ou div grid absolute), d'un hook `useReveal()` (IntersectionObserver), et wrap des sections avec `<div ref={...} className="reveal">`.
- `src/styles.css` : ajout des keyframes `pulse-dot`, `float-figure`, `reveal-up`, `grow-bar`, et de la classe `.reveal` (state initial hidden, `.reveal.in-view` visible). Respect de `@media (prefers-reduced-motion: reduce)`.
- Aucun package ajouté. Pas de librairie d'animation.
- Pas de changement dans `styles.css` sur les tokens ; on ajoute uniquement des keyframes/classes en fin de fichier.

## Ce qui ne bouge PAS

- Palette, typographie, wordmark SEEDOW.
- Structure des sections (ordre, contenus, CTA).
- Le reste de l'app (dashboard, cours, portfolio, etc.).
