## Objectif

Rendre l'app **plus intuitive** (où je suis / où je vais / comment j'y arrive vite) et **plus innovante** (5 interactions signature qui te démarquent des comparateurs financiers classiques), **sans rien retirer** de l'existant et en gardant la charte Emerald Prestige + tous les composants signature (`KPIFigure`, `EditorialSection`, `.gold-rule`, header "seedow" texte, 2 décimales partout).

Périmètre : transversal (dashboard, portfolio, comparatif, profil, discover, ethi, méthodologie, réglages). Desktop d'abord, mobile en passe 2.

---

## Acte 1 — Architecture & navigation (la fondation)

### 1.1 Nouveau shell desktop persistant
Aujourd'hui chaque route ré-affiche `AppHeader` + `BottomNavigation`. Sur desktop on bascule sur un **shell à 3 zones** monté une seule fois dans `__root.tsx` :

```text
┌──────────────────────────────────────────────────────┐
│  seedow   Portfolio ▾   ⌘K Rechercher   🔔  Simple/Expert  ⚙
├──────┬───────────────────────────────────────────────┤
│ ░░░░ │                                                │
│ Rail │  Contenu de la route (Outlet)                  │
│ icons│                                                │
│  +   │  ← largeur fluide, max 1280px, marges          │
│ tabs │     éditoriales conservées                     │
└──────┴───────────────────────────────────────────────┘
```

- **Rail gauche** (72 px, collapsible) : icônes des 5 sections + séparateur or + raccourcis (Comparatif, Méthodologie). Reprend les pictos sobres existants de `BottomNavigation`. Tooltip au hover.
- **Topbar** : marque "seedow" + sélecteur de portefeuille amélioré (voir 1.3) + ⌘K + cloche alertes + toggle Simple/Expert + réglages.
- **Mobile** (< 768 px) : on garde **strictement** le rendu actuel (`AppHeader` + `BottomNavigation`). Le shell desktop ne s'active qu'à `md:` et au-dessus.

Les pages perdent leur `AppHeader` redondant et reçoivent à la place un `PageHeader` plus léger (eyebrow + titre + sous-titre, sans bouton réglages/toggle/cloche qui montent dans la topbar).

### 1.2 Command Palette ⌘K (cmdk via `components/ui/command.tsx`)
Une seule entrée pour **tout retrouver en 1 raccourci**, structurée en sections :
- **Aller à** : Dashboard, Portfolio, Comparatif, Profil, Discover, Ethi, Méthodologie, Réglages.
- **Portefeuille actif** : switcher rapide entre tes portefeuilles (avec valorisation à droite).
- **Actions** : "Simuler un objectif", "Lancer un stress-test krach -30 %", "Marquer toutes les alertes lues", "Exporter PDF trimestriel" (si dispo).
- **Glossaire** : recherche dans les termes (PEA, SFDR, Sharpe…) → ouvre la fiche.
- **Aide** : "Comment lire mes KPI ?", "Comprendre la fiscalité PEA/AV/CTO".

Ouverture clavier ⌘K / Ctrl+K, et bouton visible dans la topbar.

### 1.3 Sélecteur de portefeuille enrichi
Le dropdown actuel devient un **mini-panneau** avec, par ligne :
- nom + tag enveloppe (PEA/AV/CTO),
- valorisation en or, delta 30 j,
- mini-sparkline 6 mois (Recharts),
- badge "actif".

Footer du panneau : "+ Nouveau portefeuille" et "Comparer ce portefeuille au MSCI World" (raccourci vers /comparatif).

### 1.4 Fil d'Ariane contextuel
Pour les écrans imbriqués (fiche holding ouverte, comparaison à 2 actifs, simulateur en mode "objectif") on affiche un fil léger sous la topbar — pas de carte, juste typo éditoriale, séparateur or `›`.

### 1.5 États de chargement / vide / erreur unifiés
- **Skeleton KPIFigure** : version grise du composant avec animation shimmer subtile (max 600 ms).
- **Empty state éditorial** : eyebrow + phrase + 1 CTA — exemple Discover sans favoris : « Tu n'as encore rien mis en favori. Explore les fiches pour bâtir ta sélection. »
- **Erreur** : carte crème avec filet or, message clair, bouton "Recharger".

---

## Acte 2 — Moments « waouh » signature

Cinq interactions soignées qui élèvent le produit sans bruit visuel.

### 2.1 Projection Simulator — scrubber interactif sur la courbe
Aujourd'hui le simulateur calcule, on lit le KPI final. Demain : **on glisse le curseur sur la courbe** et 4 KPI (nominal / réel / versé / plus-value) se mettent à jour en temps réel pour l'année survolée. Halo or sur le point actif, ligne pointillée verticale. Sur clavier : ←/→ pour avancer d'un an, Shift+←/→ pour 5 ans.

### 2.2 Comparatif — split view drag-to-compare
Le `/comparatif` actuel est statique. On passe à un **diff-view** :
- Colonne gauche = portefeuille actif, colonne droite = MSCI World (ou autre).
- Chaque ligne (perf 1Y/3Y/5Y, vol, Sharpe, ESG, TER) affiche **les deux valeurs + une barre delta** centrée sur zéro (vert si tu surperformes, neutre sinon).
- Drag-and-drop d'un actif depuis le portefeuille vers la colonne droite pour le comparer ad-hoc.

### 2.3 Decision Timeline — frise verticale animée
La timeline existe mais est plate. On la convertit en **frise verticale** avec :
- ligne or continue à gauche,
- points pulsés sur les décisions récentes (< 7 j),
- groupement par mois avec sticky-header éditorial,
- au hover sur un événement : carte latérale qui pousse depuis la droite (Sheet) avec le détail (avant/après, cause, lien vers la fiche).

### 2.4 Allocation breakdown — treemap interactif
Le `AllocationBreakdown` actuel est une liste. On ajoute un **treemap responsive** au-dessus :
- tuiles dimensionnées par poids, couleur graduée vert profond → or selon ESG,
- au hover : agrandissement subtil + tooltip KPI,
- clic = ouvre `HoldingDetailSheet`.
La liste reste en dessous pour les utilisateurs qui préfèrent lire les chiffres (basculement via toggle Simple/Expert).

### 2.5 Alertes — panneau latéral inbox
La cloche ouvre aujourd'hui un menu déroulant court. On la convertit en **Sheet droit type "inbox" e-mail** :
- onglets : Toutes / Non lues / Critiques,
- chaque alerte avec eyebrow (catégorie) + titre + résumé + CTA contextuel,
- swipe-out / bouton ✕ pour dismiss,
- footer "Tout marquer lu" + lien vers réglages des seuils d'alerte.

### 2.6 Transitions de route éditoriales
Entre deux routes : fade rapide (160 ms) + glissement vertical de 6 px sur le titre — pas plus, pour rester sobre. Utilise `framer-motion` (déjà dispo via shadcn).

---

## Acte 3 — Détails qui font la différence

- **Raccourcis clavier visibles** : g+d (dashboard), g+p (portfolio), g+c (comparatif), ⌘K (palette), ? (cheat sheet).
- **Tooltips éducatifs** sur tous les KPI : icône `ⓘ` discrète à droite du label, contenu = définition courte + lien "En savoir plus" qui ouvre le Glossary.
- **Toasts cohérents** (sonner) : succès en or, erreur en rouge ink, info en vert profond — toujours alignés bas-droite, durée 4 s.
- **Focus rings** harmonisés : un seul style `ring-1 ring-moss-1 ring-offset-1`.
- **Smooth scroll** sur les ancres méthodologie + scroll-restoration TanStack activée globalement.

---

## Détails techniques

**Architecture** :
- Créer `src/components/layout/AppShell.tsx` (shell desktop) monté dans `__root.tsx` derrière un `md:` breakpoint.
- Créer `src/components/layout/RailNav.tsx` (rail gauche) + `src/components/layout/TopBar.tsx`.
- Créer `src/components/layout/PageHeader.tsx` (version allégée de l'`AppHeader` actuel — eyebrow + titre + sous-titre + sectionNumber).
- Migrer les 12 routes : retirer `<AppHeader>` (sauf en mobile via fallback), brancher `<PageHeader>`.
- Conserver `AppHeader` et `BottomNavigation` pour `< md`.

**Command Palette** :
- `src/components/layout/CommandPalette.tsx` utilisant `cmdk` (déjà dans `components/ui/command.tsx`).
- Provider global dans `__root.tsx` avec listener `useEffect` sur `keydown` (e.metaKey/ctrlKey + k).

**Interactions signature** :
- Scrubber : `useState<number>` pour `hoverYear`, `onMouseMove` sur le `<ResponsiveContainer>` Recharts (calcul x → year).
- Treemap : `Treemap` de Recharts (déjà installé).
- Sheet inbox : composant `Sheet` shadcn (déjà dans `components/ui/sheet.tsx`).
- Transitions : `motion.div` avec `initial`/`animate`/`exit`, montés au niveau de l'`Outlet`.

**Garde-fous** :
- Aucune modification de la palette ni des polices.
- Aucune migration BDD.
- `KPIFigure`, `EditorialSection`, `.gold-rule` réutilisés tels quels.
- Le header "seedow" en texte reste identique sur mobile et dans la topbar desktop.
- Toutes les sommes restent à 2 décimales.

**Hors scope** :
- Refonte visuelle des contenus (textes, illustrations).
- Mobile (passe 2, déjà actée).
- Notifications e-mail.
- Mode sombre.

---

## Ordre de livraison

1. **Shell desktop** (rail + topbar + PageHeader + migration des 12 routes) — la fondation, débloque tout le reste.
2. **Command Palette ⌘K** + raccourcis clavier — gain d'usage immédiat.
3. **Sélecteur de portefeuille enrichi** + fil d'Ariane.
4. **Scrubber simulateur** + **treemap allocation** (2 moments waouh à fort impact visuel sur le dashboard).
5. **Comparatif diff-view** + **timeline frise**.
6. **Alertes inbox** + transitions de route + états vides/erreur unifiés.
7. Polissage final : tooltips KPI, focus rings, toasts.

Chaque étape est livrable indépendamment — tu peux valider au fil de l'eau et arrêter quand tu estimes qu'on en a fait assez.