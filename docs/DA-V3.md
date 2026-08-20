# Seedow — Direction artistique V3

> Référence DA. Remplace `CLAUDE.md` §4 pour la partie visuelle ; la sémantique
> couleur et les règles d'accessibilité restent en vigueur.

---

## 1. Le principe

Les mécaniques d'interface sont celles, éprouvées, du marché premium
(Revolut, Trade Republic). **On n'invente que là où Seedow a réellement
quelque chose à dire : l'état de preuve de chaque chiffre.**

Les V1 et V2 se sont trompées de façon symétrique. La V1 empruntait la palette
système Apple, le bleu Apple, la pill 980 px et Inter en titre : tout était
emprunté, rien n'était reconnaissable. La V2 a sur-corrigé — rayon 2 px, filets
d'encre partout, solde en monospace — en prenant la sobriété pour une absence
de finition. **La sobriété premium est très travaillée ; elle est juste
discrète.** La V3 corrige les deux erreurs.

## 2. Ce qui a été corrigé, mesuré contre les références

| Mécanique | V2 | Marché | V3 |
| --- | --- | --- | --- |
| Rayon des cartes | 2 px | 20 px (28 px conteneurs) | **20 / 28 px** |
| Boutons | 40 px, coins vifs | 48 px, pill 9999 | **48 px, pill** |
| Chiffre héros | monospace | grotesque, tracking −0,02 em | **Manrope 800, −0,035 em** |
| Profondeur | filets 1 px partout | aplats : blanc sur doux, bande sombre | **3 niveaux d'aplat** |
| Respiration | ~40 px | 88–120 px | **80–96 px** |
| Couleur saturée | aplats pleine page | réservée au produit | **accent < 5 % de la surface** |
| Cible tactile | variable | 48 px min, 56 px champs | **48 / 56 px** |

## 3. Surfaces

Trois niveaux suffisent, et ils **remplacent les ombres**. Une carte blanche
posée sur `--paper-2` *est* une élévation ; une bande `--deep` qui percute une
bande claire fait le reste.

| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--paper` | `#FFFFFF` | `#0E0F10` | La carte |
| `--paper-2` | `#F5F4F1` | `#1B1D1F` | Le fond, neutre chaud |
| `--paper-3` | `#DDDAD3` | `#33363A` | Hairline, rare |
| `--deep` | `#0E0F10` | `#000000` | Bande de récit, moments forts |
| `--ink` | `#16181A` | `#F4F4F2` | Texte principal — 16,4:1 |
| `--ink-2` | `#5D6167` | `#A9ADB3` | Texte secondaire — 6,4:1 |
| `--ink-3` | `#6C7075` | `#909499` | Métadonnées — 5,3:1, AA sur les deux papiers |

**Aucune ombre sur le contenu.** Une seule existe, `--shadow-layer`, pour les
calques flottants (dialog, sheet, popover).

## 4. Accent

Un seul, et il occupe **moins de 5 % de la surface** d'un écran. C'est ce qui
l'empêche de crier — la V2 posait des aplats vermillon pleine page, ce qui
frôlait la peur comme moteur (interdit par `CLAUDE.md` §1.7).

| Token | Valeur | Rôle |
| --- | --- | --- |
| `--mint` | `#0E4F45` | Marque, impact prouvé, état vérifié. Un vert-pétrole assez profond pour se lire comme une encre teintée, jamais comme un vert écolo. |
| `--solar` | `#A16207` | Estimé / modélisé |
| `--alert` | `#C2372A` | Négatif réel |
| `--ice` | `#1F5FB8` | Information neutre, lien. Rare. |
| `--volt` | `#5B4B9E` | Pédagogie. Rare. |

Les variantes `--*-ink` restent obligatoires dès qu'un accent porte du texte.
Toutes les paires sont vérifiées par `src/lib/a11y/__tests__/contrast.test.ts`,
en clair **et** en sombre.

## 5. Typographie

**Manrope** pour tout (400 → 800), chiffres tabulaires, tracking serré sur les
grandes valeurs. **IBM Plex Mono** uniquement pour les tickers, les ISIN et les
lignes de source — jamais pour un solde.

| Utilitaire | Taille | Graisse |
| --- | --- | --- |
| `.display-xl` | `clamp(2.5rem, 6.4vw, 4.75rem)` | 800, −0,038 em |
| `.text-figure-hero` | `clamp(2.5rem, 11vw, 3.5rem)` | 800, −0,035 em, tabulaire |
| `h1` | `clamp(1.875rem, 4vw, 2.75rem)` | 800 |
| `.stamp` / `.eyebrow` | 13 px | 600, gris — **plus de capitales mono à tracking large** |

## 6. Formes et composants

- **Rayons** : 8 (chips) · 14 (champs) · 20 (cartes) · 28 (feuilles, chrome) · 999 (boutons).
- **Boutons** : pill, 48 px (38 px en `sm`). État par opacité, jamais par `transform`.
- **Champs** : 56 px, rayon 14, anneau discret au focus.
- **Cartes** : `.paper-card`, blanc sur `--paper-2`, sans bordure ni ombre.
- **Pastilles** : `.chip` + `--verified` / `--modelled` / `--disputed` / `--up` / `--down`.
- **Sélecteur segmenté** : `.segmented` pour les périodes.

## 7. L'état de preuve — ce qui reste propre à Seedow

Chaque chiffre porte son statut : mesuré, estimé, ou contesté. Aucun concurrent
ne peut afficher ça — il faudrait avoir les sources.

Exprimé par **une pastille** (statut, avec libellé écrit et icône distincte) et
**une ligne grise** (source · date · couverture). La V2 dessinait un crochet
« ├ » sous chaque nombre : trop bruyant, et ça lisait « outil interne ».

Le statut n'est **jamais** porté par la seule couleur (`CLAUDE.md` §4).
Discipline : une attestation par **bloc** de données, pas une par ligne.

## 8. Graphiques

Convention Trade Republic : un trait unique de 2,4 px à bouts arrondis, un
remplissage d'aire à 14 % d'opacité maximum, **aucune grille**, axes masqués ou
très discrets, point terminal marqué. La référence (indice, dépôts cumulés) est
un pointillé neutre. Tout graphique porte sa provenance.

## 9. Motion

Une seule courbe : `--ease-out: cubic-bezier(0.2, 0, 0, 1)`. Deux primitives :
le **tracé** (`.trace`, 500 ms) et le **comptage** (`AnimatedFigure`).
Interdits : rebond, `scale` au survol, parallaxe, halo pulsé, cascade différée
sur chaque section. `prefers-reduced-motion` neutralise tout.

## 10. Positionnement

| Marque | Son territoire | Où Seedow se place |
| --- | --- | --- |
| **Trade Republic** | Réduction extrême, méthode opaque | Même sobriété, méthode ouverte — c'est là que se joue l'écart |
| **Revolut** | Bandes, pills, cartes 20 px, gradient multicolore | On emprunte les mécaniques, pas l'énergie : ni gradient, ni logo iridescent |
| **Robinhood** | Vert néon, gamification, urgence | Anti-urgence : aucune couleur d'excitation |
| **N26** | Gradient corail, lifestyle | Aucun dégradé, aucun lifestyle |
| **Ecosia / banques vertes** | Vert, feuille, ONG | Le vert n'est plus la marque, c'est un statut de donnée |

## 11. Ce que la V3 supprime

Palette Apple · pill 980 px · rayon 2 px · le système `.apple-*` (réduit à une
couche d'alias) · halos flous et lift au survol · cinq accents décoratifs de
poids égal · Inter en titre · le monospace pour les soldes · les hachures et
grilles de graphiques · les capitales mono à tracking large partout · le crochet
« ├ » · le grain papier.

---

_À maintenir à jour à chaque décision structurante._
