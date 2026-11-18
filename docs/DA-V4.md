# Seedow — Direction artistique V4 « Vivant »

> Référence DA. Remplace `docs/DA-V3.md` pour la partie visuelle. La sémantique
> couleur, les tokens et les règles d'accessibilité de `CLAUDE.md` §4 restent
> en vigueur — la V4 ne change aucune couleur.

---

## 1. Le principe

La V3 avait raison sur la structure (aplats, rayons généreux, cibles de 48 px,
état de preuve de chaque chiffre) et tort sur la température : une interface
exacte mais immobile et grise. Rien ne répondait au geste, rien ne donnait envie
de descendre d'un écran.

La V4 garde l'ossature et lui rend la vie, selon une règle : **le mouvement et
la couleur servent la compréhension, jamais l'urgence** (`CLAUDE.md` §1.5, §1.7).

| Ce qui change                    | Pourquoi                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------- |
| La couleur **situe**             | Chaque espace porte son accent (accueil mint, explorer ice, apprendre volt…) |
| L'interface **répond**           | Reflet sous le curseur, carte qui se soulève, bouton qui s'enfonce           |
| Une **profondeur douce** revient | Ombres très diffuses : l'ombre dit « ça se touche », jamais un contour       |
| Une **voix en titre**            | Bricolage Grotesque pour les titres, ronde et lisible par tous               |
| Un **chrome unique**             | Un seul en-tête et un seul pied de page pour toutes les pages publiques      |

## 2. Typographie

| Rôle                           | Police                          | Où                                                  |
| ------------------------------ | ------------------------------- | --------------------------------------------------- |
| Titres (`h1–h3`, `.display-*`) | **Bricolage Grotesque** 600–800 | Titres, chiffres-signature non tabulaires           |
| Texte, interface, valeurs      | **Manrope** 400–800             | Tout le reste ; `.font-value` = chiffres tabulaires |
| Données brutes                 | **IBM Plex Mono**               | Tickers, ISIN, lignes de source (`.mono-meta`)      |

- La police de titre tient dans **un seul token** : `--font-display` (styles.css).
  Revenir à Manrope partout = changer cette ligne.
- Un `h1/h2/h3` qui porte `.font-value` (classe historique) reste en police de titre.
- Le plancher typographique de `CLAUDE.md` §4 est inchangé (13 px minimum pour
  toute information financière, `--font-scale` respecté).

## 3. Surfaces et profondeur

- `.paper-card` porte maintenant `--shadow-card` (ombre très diffuse). En thème
  sombre, l'ombre s'efface et le filet d'un pixel reprend la séparation.
- `.hero-card` : la carte du chiffre principal d'un écran (« Mon argent »), avec
  un voile d'accent dans le coin.
- `.tile-accent` : tuile teintée par l'accent de la section (encadrés « à
  retenir », appels secondaires).
- `.glass` : le chrome flottant (en-tête public, dock, barre haute, navigation
  mobile, bandeau cookies).
- `body::before` : un halo d'ambiance fixe et très dilué (mint / volt / ice) —
  dosé pour que `--ink-3` reste AA sur le point le plus dense.
- Rayons : 10 (chips) · 16 (champs) · **24** (cartes) · 28 · 32 (chrome) ·
  40 (scènes) · 999 (boutons).

## 4. Accent de section

Une classe `.accent-{mint|ice|volt|solar|alert}` sur un conteneur redéfinit
`--section-accent` / `--section-accent-ink`. Tout ce qui est dessous s'accorde :
`.chip--accent`, `.icon-badge`, `.tile-accent`, `.hero-card`, `.spot`.

| Espace                         | Accent  |
| ------------------------------ | ------- |
| Accueil, portefeuille, profil  | `mint`  |
| Explorer, Observatoire, aide   | `ice`   |
| Apprendre, méthode, communauté | `volt`  |
| Objectifs, Réveil              | `solar` |
| « Ce que je refuse »           | `alert` |

**La couleur situe, elle n'informe pas** : le libellé est toujours écrit, et un
état (coché, refusé, juste, faux) porte toujours une icône distincte.

## 5. Mouvement

Une courbe de marque : `--ease-brand` = `cubic-bezier(0.32, 0.72, 0, 1)`.
Tout dure moins de 600 ms, sauf les décors lents (aurore, bandeau défilant).

| Primitive                | Fichier                                | Usage                                       |
| ------------------------ | -------------------------------------- | ------------------------------------------- |
| `Reveal` / `RevealGroup` | `components/motion/Reveal.tsx`         | Apparition au défilement, cascade ≤ 8 rangs |
| `SplitWords`             | `components/motion/SplitWords.tsx`     | Titre qui monte mot par mot (CSS pur, SSR)  |
| `CountUp`                | `components/motion/CountUp.tsx`        | Chiffre qui compte (SSR = valeur finale)    |
| `Magnetic`               | `components/motion/Magnetic.tsx`       | CTA principal d'une scène uniquement        |
| `Tilt`                   | `components/motion/Tilt.tsx`           | Une pièce maîtresse par écran, 4° max       |
| `Aurora`                 | `components/motion/Aurora.tsx`         | Fond d'ambiance des scènes                  |
| `Marquee`                | `components/motion/Marquee.tsx`        | Bandeau de preuves (pause au survol/focus)  |
| `ScrollProgress`         | `components/motion/ScrollProgress.tsx` | Pages longues                               |
| `.spot`                  | `useSpotlight` (monté à la racine)     | Reflet sous le curseur, un écouteur global  |
| `.lift`                  | styles.css                             | Carte qui se soulève au survol              |

Règles :

- **`prefers-reduced-motion` neutralise tout** : chaque primitive ci-dessus a
  son repli statique, vérifié.
- Un chiffre n'est **jamais** lu faux à cause d'une animation : le rendu serveur
  et le mouvement réduit affichent la valeur finale.
- Les démonstrations de la landing montrent des **formes**, jamais des valeurs
  inventées (`CLAUDE.md` §1.3).
- Interdits maintenus : rebond exagéré, urgence fabriquée, clignotement d'alerte.

## 6. Chrome

| Contexte        | Composant                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Pages publiques | `PublicPage` + `PageHero` (`components/layout/PublicPage.tsx`) — `SiteHeader` flottant, `SiteFooter` sombre avec la signature de marque |
| Pages légales   | `LegalPage` (`components/layout/LegalPage.tsx`) — un document se lit : pas d'animation de titre                                         |
| App, desktop    | Dock de verre (`RailNav`, icône + libellé, pastille active qui glisse) + barre flottante (`TopBar`)                                     |
| App, mobile     | `AppHeader` + navigation flottante (`BottomNavigation`) + bouton Ethi                                                                   |
| Pages de l'app  | `.page` (760 px), `.page--wide` (1120 px), `.page--narrow` (620 px)                                                                     |
| États vides     | `EmptyState` (`components/common/EmptyState.tsx`)                                                                                       |
| Marque          | `Wordmark` / `SeedMark` (`components/brand/Wordmark.tsx`) — une seule définition                                                        |

## 7. Pièges corrigés pendant la refonte

- **`cn()` et l'échelle typographique** : tailwind-merge confondait `text-tag`,
  `text-label`… avec les couleurs `text-*` et en effaçait une. L'échelle est
  maintenant déclarée dans `lib/utils.ts` (test : `lib/__tests__/utils.test.ts`).
- **`.btn-on-ink`** valait `#fff` : en thème sombre, `--ink` devient clair et le
  CTA principal était blanc sur blanc. Il vaut maintenant `var(--paper)`.
- **`text-paper` dans une bande sombre** : `.on-deep` / `.ink-section`
  remappent `--paper` sur le fond sombre. Dans ces zones, utiliser
  `text-on-deep`, `text-ink-2`, `text-ink-3` — jamais `text-paper`.

---

_À maintenir à jour à chaque décision structurante._
