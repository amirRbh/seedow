## Objectif
Transformer l'ambiance visuelle de "finance institutionnelle" vers "startup climat / clean tech" tout en gardant le fond clair et la structure éditoriale existante.

## 1. Palette — `src/styles.css`
- **Fond principal** : conserver l'ivoire pierre, mais légèrement plus lumineux et moins gris (`oklch(0.98 0.005 110)` au lieu de `0.975`).
- **Encre principale** (`--ink`) : passer à un vert-nuit très doux (`oklch(0.45 0.02 160)`). Moins chaud que l'actuel 0.40, plus végétal et frais.
- **Encre secondaire** (`--ink-2`, `--ink-3`) : réaligner en décalant vers des teintes légèrement plus froides pour éviter l'aspect "terreux".
- **Accent principal** (`--gold`) : **conserver** le vert vif "pousse" (`oklch(0.62 0.16 145)`). C'est l'identité forte de la marque.
- **Nouveau second accent** (`--glacier`) : bleu glacier frais (`oklch(0.78 0.08 210)`). Utilisé pour les états actifs, les liens secondaires, les badges d'impact, les graphiques en duo avec le vert.
- **Surfaces** (`--stone`, `--stone-2`, `--clay`) : adoucir légèrement, réduire la charge de gris-brun pour un rendu plus aéré et lumineux.
- **Ombres** : passer d'un brun-vert à un vert-bleu très dilué, plus léger et moins lourd.

## 2. Tokens supplémentaires
- Ajouter `--color-glacier` dans `@theme inline` de `src/styles.css` pour générer `text-glacier`, `bg-glacier`, `border-glacier`.
- Mettre à jour les utilitaires `.gold-pulse`, `.gold-rule`, `.outline-number` : ils restent sur `--gold` (vert vif), pas de remplacement.

## 3. Composants & UI
- **Header** : inchangé ("seedow" texte + point vert vif pulsant).
- **Liens & boutons secondaires** : passer les états actifs/sélectionnés au bleu glacier (`--glacier`) au lieu de déclinaisons du vert, pour créer un dialogue bicolore vert/bleu.
- **Graphiques / data viz** : introduire le bleu glacier comme couleur de série secondaire (à côté du vert vif).
- **Badges & tags d'impact** : vert vif pour "positif", bleu glacier pour "en cours / en transition".

## 4. Typographie
- Aucun changement : **Space Grotesk** (display, 600) + **DM Sans** (body, 400/500).

## 5. Lexique & comportements
- Aucun changement de wording ou de logique métier.
- Montants financiers : toujours `minimumFractionDigits: 2, maximumFractionDigits: 2`.

## Fichiers concernés
- `src/styles.css` uniquement (tokens + utilitaires).
- Vérification visuelle rapide sur les composants utilisant `text-ink-2` / `bg-stone` pour s'assurer que les nouvelles valeurs rendent bien.