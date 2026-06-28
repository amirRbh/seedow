# Repalette ESG — Sage & Stone

On garde la structure éditoriale (Space Grotesk + DM Sans, échelle typo, grain papier, KPIFigure, EditorialSection, filets, eyebrow uppercase). Seuls les **tokens couleur** changent + le filet/accent **or → vert vif**. Intensité 3 : on assume le virage nature sans casser la sobriété institutionnelle.

## Nouvelle palette

**Surfaces** — pierre claire, très légèrement verdie
- `--paper` ivoire pierre `oklch(0.975 0.006 110)` (≈ #f4f2ec)
- `--paper-2` `oklch(0.945 0.008 110)`
- `--paper-3` `oklch(0.885 0.012 115)` (≈ #d8d4c8)
- `--paper-inset` `oklch(0.855 0.014 115)`

**Encre** — vert nuit profond (remplace le quasi-noir neutre)
- `--ink` `oklch(0.26 0.025 150)` (≈ #3d4a3a, vert nuit)
- `--ink-2` `oklch(0.46 0.022 150)`
- `--ink-3` `oklch(0.62 0.018 145)`

**Accent principal** — sauge désaturée (corps) + vert vif (signature)
- `--moss-1` sauge profonde `oklch(0.52 0.055 150)` (≈ #6b8068)
- `--moss-2` sauge `oklch(0.62 0.060 150)`
- `--moss-3` sauge claire `oklch(0.74 0.045 150)`
- `--moss-4` `oklch(0.90 0.020 150)`
- `--moss-5` `oklch(0.96 0.012 150)`

**Signature vive — remplace `--gold`** (filets, eyebrow, outline numbers, pulse logo)
- `--gold` → renommé conceptuellement mais **on garde le nom du token** pour zéro régression. Nouvelle valeur : `oklch(0.62 0.16 145)` — vert vif "pousse" type chlorophylle.
- `--gold-soft` `oklch(0.56 0.14 148)`
- Effet : tous les `.gold-rule`, `.eyebrow`, `.outline-number`, `.gold-pulse`, badges `border-left: 2px solid var(--color-gold)` deviennent verts vifs automatiquement.

**Data accents** ajustés cohérence ESG
- `--rust` `oklch(0.52 0.13 35)` (terracotta très light, signaux négatifs uniquement)
- `--sky` `oklch(0.50 0.07 220)`
- `--bloom` `oklch(0.55 0.09 290)`
- `--peach` conservé

**Dark mode** — vert nuit
- `--paper` `oklch(0.18 0.012 150)`, `--paper-2` `oklch(0.22 0.014 150)`, etc.
- `--ink` `oklch(0.96 0.008 110)` (ivoire pierre)
- moss inversés vers tons clairs.

## Mémoire à mettre à jour

`mem://index.md` — remplacer la ligne "Direction visuelle Institutional White" par :
> Direction visuelle : **Sage & Stone** — éditorial ESG sobre. Surfaces pierre ivoire `oklch(0.975 0.006 110)`, encre vert nuit `oklch(0.26 0.025 150)`, accent sauge `oklch(0.52 0.055 150)`, signature vert vif (token `--gold` réutilisé) `oklch(0.62 0.16 145)` pour filets/eyebrow/outline numbers/pulse logo.

Marquer en constraint : l'ancien or chaud (`oklch(0.65 0.10 80)`) est abandonné — ne pas le réintroduire.

## Fichiers touchés

- `src/styles.css` : section `:root` + `.dark` uniquement (variables CSS). Aucun composant à éditer — tout consomme les tokens.
- `mem://index.md` : ligne palette + une constraint courte.

## Hors scope

- Pas de changement typo, layout, composants, lexique.
- Pas de renommage du token `--gold` (éviterait un grep/replace inutile sur ~20 fichiers).
- Pas de touche terracotta/sable (palette Forest & Sand explicitement annulée dans la mémoire actuelle).
