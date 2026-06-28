# Adoucir l'encre principale

L'encre vert nuit actuelle (`oklch(0.26 0.025 150)`) est trop dense. On éclaircit toute l'échelle d'encre pour une lecture plus aérée, ambiance éditoriale magazine.

## Changements (src/styles.css)

**`:root`**
- `--ink` : `0.26` → `0.40` (vert ardoise médium)
- `--ink-2` : `0.46` → `0.55` (gris-vert moyen)
- `--ink-3` : `0.62` → `0.68` (texte tertiaire plus doux)

**Shadows** — recalibrés sur la nouvelle encre pour rester cohérents
- `--shadow-leaf`, `--shadow-deep`, `--shadow-soil` : opacités légèrement augmentées (+0.01–0.02) pour compenser la baisse de densité de l'encre source.

**`.dark`** — symétrique : on garde `--ink` à `0.96` (déjà clair sur fond sombre), pas de changement.

## Hors scope

- Pas de modification de `--gold` (vert vif signature), `--moss-*` (sauge), surfaces, ni accents data.
- Pas de touche aux composants.

## Fichiers

- `src/styles.css` uniquement (bloc `:root`, lignes encre + shadows).
