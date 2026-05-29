# Refonte design system "Emerald Prestige" + landing cinématique

Direction : **éditorial financier premium**, palette **Emerald Prestige** (vert profond #064e3b + or #c9a84c + crème #f5f0e0), typo **Space Grotesk / DM Sans**. Innovation prioritaire : **landing cinématique scroll-driven**.

## 1. Nouveau design system (`src/styles.css`)

Remplacer les tokens actuels :

- **Surfaces** : `--paper` crème (#f5f0e0 → oklch), `--paper-2` ivoire, `--ink` vert profond (#064e3b), `--ink-2/3` déclinaisons
- **Accent or** : `--gold` (#c9a84c) pour CTA, chiffres clés, séparateurs fins
- **Vert signature** : conserve `--moss-*` mais recalibré sur emerald prestige (5 stops du #064e3b au crème)
- **Mode sombre** : ink crème sur fond vert nuit (#0a1f17)
- **Typo** : import Space Grotesk (500/600/700) pour `--font-display` + `--font-value`, DM Sans (300/400/500) pour `--font-sans`. Suppression Syne/Plus Jakarta.
- **Échelle éditoriale** : nouvelle classe `.display-xl` (clamp 56→128px, Space Grotesk 600, tracking -0.04em) pour gros chiffres
- **Filet or** : utility `.gold-rule` (1px #c9a84c) pour séparer sections
- **Easing Apple conservé** : `cubic-bezier(0.32, 0.72, 0, 1)` 400ms (déjà en place)
- **Grain subtil** : overlay SVG noise 2% sur `body` pour texture papier

## 2. Composants refondus

- **`AppHeader`** : wordmark "seedow" en Space Grotesk 600 tracking -0.03em, filet or 1px sous le header, fond crème translucide + backdrop-blur
- **`BottomNavigation`** : barre flottante crème, icônes vert profond, indicateur actif = pastille or
- **`paper-card`** : fond ivoire, bordure 1px vert/10%, hover : bordure or
- **`btn-plant`** → CTA principal vert profond, hover vire à un vert plus sombre + ombre douce
- **`btn-harvest`** → secondaire transparent + bordure or
- **`moss-badge`** : nouveau style éditorial (uppercase, tracking large, filet or à gauche)
- Nouveau **`<KPIFigure value unit label />`** : gros chiffre Space Grotesk + tabular-nums + libellé uppercase tracking large (utilisé partout dans dashboard/verdict)
- Nouveau **`<EditorialSection eyebrow title kicker />`** : pattern unifié de section avec eyebrow uppercase or, titre serif-like, filet or

## 3. Landing cinématique (`src/routes/index.tsx`)

Refonte complète en 6 séquences scroll-driven (Framer Motion `useScroll` + `useTransform`) :

1. **Hero plein écran** : wordmark "seedow" géant qui se contracte au scroll vers le header, sous-titre "L'audit ESG de ton épargne, sans promesse de placement", CTA or "Auditer mon portefeuille"
2. **Manifeste** : phrase éditoriale qui se révèle mot par mot au scroll (split text + opacity stagger)
3. **Démo interactive inline** : input ticker → preview d'un mini-verdict animé (3 KPI qui s'incrémentent : couverture ESG, score moyen, lignes non auditables). Données mockées, sans backend.
4. **3 piliers** : grille éditoriale 3 colonnes avec filets or, chiffres XL, descriptions courtes (Audit / Transparence / Trous de couverture assumés)
5. **Méthodologie teaser** : extrait de la page méthodologie + lien
6. **Waitlist + disclaimers** : form email minimal, disclaimers en filet or fin

Toutes les transitions utilisent l'easing Apple + parallax léger sur titres et fades successifs.

## 4. Écrans secondaires alignés

Pas de refonte fonctionnelle, juste réapplication des nouveaux tokens/composants :
- `dashboard.tsx` : remplace les chiffres par `<KPIFigure>`, sections par `<EditorialSection>`, ImpactRibbon restylé
- `portfolio.tsx`, `discover.tsx`, `methodologie.tsx`, `reglages.tsx`, `auth.tsx`, `onboarding.tsx`, `ethi.tsx` : application automatique via tokens + remplacement ponctuel des classes spécifiques
- `__root.tsx` : transitions de route existantes conservées (déjà en place)

## 5. Mémoire projet

Mettre à jour `mem://index.md` Core :
- Palette : Emerald Prestige (#064e3b / #c9a84c / #f5f0e0)
- Typo : Space Grotesk (display) + DM Sans (body)
- Style : éditorial financier premium, filets or, KPI en Space Grotesk tabulaire

## Détails techniques

- **Pas de nouvelle dépendance** : Framer Motion déjà installé
- **Fonts** : Google Fonts via `@import` dans `styles.css` (remplace l'import Syne/Plus Jakarta existant)
- **Pas de migration DB** : refonte purement frontend
- **Pas de changement de logique métier** : on touche uniquement styles/composants de présentation
- **Lexique** : respect strict de la mémoire (pas de "jardin/graines"), wordmark "seedow" en texte seul, montants `minimumFractionDigits: 2`

## Hors périmètre

- Pas de touch aux server functions, RLS, types Supabase
- Pas de retrait/ajout de routes
- Pas de nouvelle feature (audit ESG batch B/C/D reste à part)
- Pas de mode "audit live home" ni "chat Ethi onboarding" (variantes non retenues)

## Batches

- **A** — Tokens CSS + fonts + composants primitifs (`KPIFigure`, `EditorialSection`, `gold-rule`)
- **B** — Refonte `routes/index.tsx` cinématique scroll-driven
- **C** — Réapplication des nouveaux composants sur dashboard / portfolio / autres écrans
- **D** — Update mémoire projet
