# Harmonisation Seedow — moins de bruit, plus de clarté

L'app empile aujourd'hui beaucoup de blocs (dashboard = 7 sections, portfolio = 9, 7 entrées de nav rail + 5 en bottom) et les mêmes infos reviennent à plusieurs endroits (valeur totale, gain, CO₂, boutons Investir). On harmonise sur 4 axes, sans toucher au lexique ni aux tokens visuels.

---

## 1. Dashboard allégé — « une seule histoire »

Cible : un écran qu'on lit en 5 secondes.

Sections gardées (dans l'ordre) :
1. **AppHeader** (greeting + portefeuille actif)
2. **Bloc valeur** — `KPIFigure` total + delta jour + bouton *Investir*
3. **Aperçu portefeuille** — `GardenVisualization` compacte (5 lignes max)
4. **Prochaine étape** — 1 seule carte contextuelle (Ethi signal le + important OU objectif le + proche OU CTA premier dépôt)
5. **Lien « Voir le détail »** vers `/portfolio`

Sections retirées du dashboard (déplacées, pas supprimées) :
- `JourneySteps` → masqué après onboarding (n'apparaît que si le user n'a fait que 1/3 des étapes)
- `EthiBriefing` complet → ne garder que le **1er signal** en carte « Prochaine étape ». Le briefing complet vit dans `/ethi`.
- `ImpactRibbon` (CO₂ / arbres / énergie / ESG) → déplacé dans `/portfolio` onglet Impact (déjà présent ailleurs sous forme de certificat)
- `ProjectionSimulator` → vit déjà dans `/objectifs` via `GoalSimulator`. On retire du dashboard.

Gain : 7 sections → 4. Plus aucun doublon avec `/portfolio`.

---

## 2. Navigation unifiée — 5 entrées au lieu de 9

Aujourd'hui : RailNav = 7 primaires + 2 secondaires ; BottomNav = 5 (différentes du rail). Trop de portes d'entrée pour des contenus proches.

**Nouvelle structure (rail desktop ET bottom mobile identiques) :**

| Entrée | Regroupe | Route |
|---|---|---|
| Accueil | Dashboard | `/dashboard` |
| Portefeuille | Analyse + Allocation + Historique + Impact + Comparatif | `/portfolio` (onglets) |
| Objectifs | Objectifs + projections | `/objectifs` |
| Explorer | Discover + Communauté (onglets) | `/discover` |
| Ethi | Assistant | `/ethi` |

Reléguées en secondaire (rail bas + palette ⌘K uniquement, hors bottom-nav) :
- Profil investisseur, Méthodologie, Réglages

Conséquences : `/comparatif` devient un onglet de `/portfolio` ; `/communaute` devient un onglet de `/discover`. Les routes existantes restent valides (pas de cassure de lien) mais ne sont plus mises en avant dans les nav.

---

## 3. Portefeuille en onglets

`/portfolio` aujourd'hui = 9 sections empilées sur ~3000 px de scroll. On condense en **4 onglets** (composant `Tabs` shadcn déjà dispo) :

- **Performance** — `PortfolioHistoryChart` + `GrowthComparison` + actions Investir / Verser mensuel
- **Allocation** — `AllocationBreakdown` + `BadgesCard`
- **Impact** — `ImpactRibbon` + `PortfolioMetricsCard` (ESG/CO₂) + `ImpactCertificate`
- **Comparatif** — contenu actuel de `/comparatif` (vs benchmarks)

Persistants en tête (tous onglets) : `AppHeader` + `MarketFreshnessBanner`.
En pied (tous onglets) : `ShareToggle` (mini ligne discrète, plus une grosse section).

`MarketFreshnessBanner` n'apparaît qu'**une seule fois** par session (cookie), pas à chaque visite.

---

## 4. Mode Simple par défaut + progressive disclosure

Aujourd'hui le `ViewMode` existe (`useViewMode`) mais l'app reste verbeuse même en Simple. On durcit :

- **Default = Simple** (déjà le cas) + toggle Expert plus visible dans `TopBar` (chip à droite, au lieu d'être caché).
- En Simple : on ne montre que `expected_return`, `esg_score`, `co2_avoided_tons`. Volatilité et Sharpe (`expertOnly`) **vraiment** masqués (aujourd'hui ils sont juste grisés).
- **ExplainerCard** : aujourd'hui répétés sur 4 pages. Règle nouvelle : un seul `ExplainerCard` par page, et seulement si l'utilisateur n'a pas dismissé (état localStorage `seedow:explainers-dismissed:<key>`).
- **MetricLabel `?`** : déjà bon, on garde — c'est la forme de progressive disclosure correcte.
- **Glossaire** déjà dans ⌘K — on ajoute un lien discret « Glossaire » dans le footer de chaque page expert.

---

## Détails techniques

**Fichiers modifiés :**
- `src/routes/dashboard.tsx` — retirer `EthiBriefing` complet, `ImpactRibbon`, `ProjectionSimulator` ; ajouter `<NextStepCard />` (nouveau, 1 signal max)
- `src/routes/portfolio.tsx` — refonte en `Tabs` (4 onglets), intégrer le contenu de `/comparatif`
- `src/routes/discover.tsx` — ajouter `Tabs` (Explorer / Communauté), monter le contenu de `/communaute`
- `src/components/layout/RailNav.tsx` — 5 entrées primaires + secondaire (Profil, Méthodologie, Réglages)
- `src/components/navigation/BottomNavigation.tsx` — aligner sur les 5 entrées du rail
- `src/components/layout/CommandPalette.tsx` — garder toutes les routes (palette reste exhaustive)
- `src/components/portfolio/PortfolioMetricsCard.tsx` — masquage strict des `expertOnly` en Simple
- `src/components/portfolio/MarketFreshnessBanner.tsx` — auto-dismiss par session
- `src/components/ui/ExplainerCard.tsx` — accepter prop `dismissKey` (localStorage)
- `src/components/layout/TopBar.tsx` — toggle Simple/Expert visible

**Fichiers créés :**
- `src/components/dashboard/NextStepCard.tsx` — 1 carte contextuelle qui choisit entre : 1er dépôt / objectif proche / signal Ethi prioritaire

**Routes conservées (pas supprimées) :**
`/comparatif`, `/communaute` restent accessibles via palette ⌘K et liens directs. Aucune cassure de lien.

**Hors scope :**
- Pas de refonte visuelle (palette, typo, tokens restent identiques)
- Pas de changement de lexique
- Pas de nouvelles features
- Pas de migration BDD

---

## Résultat attendu

- Dashboard : 4 sections, lecture en 5s, plus de doublon avec `/portfolio`.
- Navigation : 5 entrées partout, mêmes labels rail/bottom, plus de confusion entre 7 portes proches.
- Portfolio : 1 page à onglets au lieu de 9 sections empilées + 1 page séparée pour Comparatif.
- Néophyte : Simple par défaut masque vraiment les métriques expertes, ExplainerCard non répétés, aide via tooltips `?` et palette.
