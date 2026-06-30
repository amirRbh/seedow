# Redesign complet — Editorial Magazine × Data Terminal

Application stricte du design system fourni à toute l'app. Objectif : passer d'une inspiration partielle à une exécution totale et cohérente sur tous les écrans.

## 1. Fondations (`src/styles.css`)

Réécriture des tokens pour coller **exactement** aux valeurs HEX fournies :

- `--paper: #F5F3EC` (dominant), `--paper-2: #E0DCCE` (cards), `--paper-3: #DEDACE` (borders), `--paper-inset: #E0DCCE`
- `--ink: #0A0A0A`, `--ink-2: #6B6B66`, `--ink-3: #6B6B66`
- Accents signal : `--mint: #00C77A` (primaire), `--ice: #0099CC` (secondaire), `--volt: #8B4FE0` (tertiaire)
- `--alert: #E0294F`, `--gold: #D4A300` (highlight uniquement, plus signature)
- **Suppression** des ombres : `--shadow-leaf`, `--shadow-deep`, `--shadow-soil` → `none`
- **Suppression** des gradients restants (`.gold-rule` → trait plein `--paper-3` ou `--ink`)
- Border-radius cards : 12–16px (`--radius: 0.875rem`)

## 2. Typo — règles strictes

- **Bebas Neue** : tous les `h1/h2/h3`, `.display-*`, `.kpi-figure`, titres de cards éditoriales. UPPERCASE, `letter-spacing: 0.01em`, line-height tight.
- **Inter** : body, paragraphes, descriptions, inputs, navigation.
- **JetBrains Mono** : tous les chiffres (montants, %, dates, KPI), labels, eyebrows (10–11px, uppercase, `letter-spacing: 0.15em`), tags, badges, boutons.

Renforcement de `.font-value`, `.eyebrow`, `.kpi-figure` + nouvelles classes `.data-xl`, `.data-lg` pour chiffres bold larges.

## 3. Composants signature

- **Boutons** :
  - `.btn-plant` : pill `#0A0A0A` bg / `#F5F3EC` text, JetBrains Mono uppercase
  - `.btn-harvest` : pill mint `#00C77A` bg / `#0A0A0A` text (filled, plus juste outline)
  - Variante outline ink pour tertiaire
- **Cards** (`.paper-card`) : bg `#E0DCCE`, border `#DEDACE` 1px, radius 14px, **aucune ombre**
- **Section sombre** (`.ink-section`) : nouvelle classe, bg `#0A0A0A`, texte `#F5F3EC`, pour hero + CTA blocks + stats clés
- **Règle 1 accent / section** : on supprime le mix mint+ice+solar dans un même panneau. Chaque section choisit son accent.

## 4. Écrans à refondre

Application du système écran par écran, sans toucher à la logique :

1. **Dashboard** (`routes/dashboard.tsx` + `EthiBriefing`, `NextStepCard`, `ProjectionSimulator`) — hero ink, KPI Bebas+Mono, accent mint
2. **Portfolio** (`routes/portfolio.tsx` + `PortfolioMetricsCard`, `AllocationBreakdown`, `PortfolioHistoryChart`, `HoldingDetailSheet`) — cards paper-2, chiffres mono géants, accent ice
3. **Asset detail** (`AssetDetailSheet`, `AssetRow`, `AssetScreener`, `routes/discover.tsx`) — layout magazine, accent volt
4. **Ethi / AI chat** (`routes/ethi.tsx` + `EthiBubble`, `EthiActions`, `SimulationForm`, `EthiSuggestionChips`) — bubbles paper-2, eyebrow mono, accent mint
5. **Onboarding** (`routes/onboarding.tsx`) — pleine page éditoriale, hero ink, CTA mint filled
6. **Settings** (`routes/reglages.tsx` + `profil.tsx`) — listes mono labels, dividers paper-3
7. **Auth** (`routes/auth.tsx`) — split éditorial ink/paper
8. **Navigation** (`AppHeader`, `BottomNavigation`, `RailNav`, `TopBar`, `AppShell`) — labels mono uppercase, pas d'ombres, point mint pulsant conservé
9. **Cours** (`routes/cours.*`, `CourseCard`, `CourseArticle`) — magazine layout, accent solar/gold (highlight)
10. **Objectifs, Comparatif, Communauté, Certificat, Méthodologie, Waitlist, Admin beta** — passage des cards, badges, KPI au système

## 5. Nettoyage

- Retirer toutes les ombres résiduelles (`shadow-leaf`, `shadow-sm`, etc.) dans les composants
- Retirer les gradients (`bg-gradient-*`, `gold-shimmer` désactivé visuellement)
- Vérifier qu'aucun composant n'utilise `text-white`, `bg-black`, hex en dur — tout passe par tokens
- Conserver `paper-grain` (texture papier) — colle au feel éditorial

## 6. Mémoire

Mise à jour de `mem://index.md` Core : verrouiller HEX exacts, règle « 1 accent par section », interdiction ombres/gradients, CTA mint = filled.

## Détails techniques

- Tokens en HEX direct (plus en OKLCH approximatif) pour fidélité parfaite aux valeurs fournies
- `@theme inline` conservé pour shadcn mapping
- Les composants shadcn (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `tabs.tsx`) gardent leur API mais variants restylés
- Aucun changement de logique métier, hooks, server functions, schéma DB
- Build TS vérifié après chaque batch d'écrans

## Question avant exécution

Le redesign touche ~40 fichiers. Tu veux que :
- **(A)** je fasse tout d'un coup (fondations + tous les écrans), gros patch
- **(B)** je commence par fondations + Dashboard + Portfolio + Ethi (les 3 écrans clés), puis on itère
- **(C)** un écran spécifique en priorité absolue ?
