
# Plan d'amélioration — 3 phases

## Phase 1 — Enrichir le simulateur de projection

Objectif : passer d'une courbe lisse à un vrai outil d'aide à la décision.

### 1.1 Inflation & rendement réel
- Ajouter un paramètre `inflation` (défaut 2 %) au hook `useProjection`.
- Calculer en parallèle `finalValueReal = finalValue / (1 + infl)^years`.
- Afficher 2 KPI : capital nominal vs pouvoir d'achat équivalent aujourd'hui.

### 1.2 Fiscalité par enveloppe
- Sélecteur d'enveloppe : **PEA** (17.2 % PS après 5 ans), **Assurance-Vie** (24.7 % puis 7.5 % + PS après 8 ans, abattement 4 600 €/9 200 €), **CTO** (PFU 30 %).
- Calcul du net : appliquer le bon prélèvement sur `gain` selon la durée.
- Nouveau KPI "Net après fiscalité" à côté du brut.

### 1.3 Scénarios stress-test
- 3 boutons : **Krach -30 % en année N**, **Pause des versements 2 ans**, **Inflation choc 5 %**.
- Réutiliser `useProjection` en injectant un événement ponctuel sur la série.
- Afficher la courbe altérée en overlay (couleur ambre) sur le graphique.

### 1.4 Objectif inversé (goal-seeking)
- Nouveau mode du simulateur : "J'ai un objectif" → input `targetCapital` + `targetYear`.
- Résoudre numériquement le `monthly` requis (recherche dichotomique sur `useProjection`).
- CTA : "Pour atteindre 50 000 € en 2032, verse 187 €/mois".

### 1.5 Rendement scénarisé sur le portefeuille réel
- Aujourd'hui on entre `annualReturn` à la main. Permettre de pré-remplir depuis `portfolio.metrics.expected_return` (3 boutons : prudent = -1σ, central, optimiste = +1σ).

---

## Phase 2 — Fiabiliser les alertes & l'historique

Objectif : transformer les heuristiques client en vraies données persistées et auditables.

### 2.1 Table `alerts`
Schéma :
- `id, user_id, portfolio_id, kind, severity, title, body, cta_href, created_at, read_at, dismissed_at, dedup_key (unique partiel)`
- RLS : user voit/MAJ ses propres alertes ; `service_role` insert depuis le cron.

### 2.2 Génération serveur
- Server function `generateAlertsForUser` (appelée en cron quotidien + au refresh portefeuille).
- Reprend la logique de `useAlerts` côté serveur, déduplique sur `dedup_key`.
- `useAlerts` lit la table au lieu de tout recalculer.
- Badge header devient un vrai compteur `unread = count(read_at IS NULL)`.

### 2.3 Table `scheduled_contributions`
- `id, portfolio_id, amount, frequency (monthly/quarterly), day_of_month, started_at, paused_until, last_processed_at`.
- Détection réelle des versements manqués : si `last_processed_at < expected_date`, on crée une alerte `missed_contribution`.
- UI simple : "Programmer un versement" depuis le dashboard.

### 2.4 Table `decision_events`
- `id, user_id, portfolio_id, kind (exclusion_added | exclusion_removed | cause_added | rebalance | contribution | created), payload jsonb, occurred_at`.
- Triggers Postgres sur `portfolios` (UPDATE exclusions/causes) qui insèrent l'événement avec diff.
- `DecisionTimeline` lit cette table au lieu de la dérivation client actuelle.

### 2.5 Comparatif MSCI World sourcé
- Stocker MSCI World (URTH ou IWDA) comme un asset normal dans `assets`.
- La page `/comparatif` lit les vraies métriques (perf 1Y/3Y/5Y depuis `asset_prices`, TER en dur de la fiche, ESG depuis la source actuelle).
- Afficher la date de fraîcheur des données et la source en bas de page.

---

## Phase 3 — Polir l'UX

### 3.1 Glossaire complet
- Audit du contenu de `Glossary.tsx` : couvrir SFDR, TER, Sharpe, ESG, MSCI World, DCA, PEA, AV, CTO, drawdown, tracking error, volatilité, HHI, beta.
- Composant `<Term>SFDR</Term>` réutilisable qui affiche un tooltip + lien vers une page `/glossaire` dédiée.

### 3.2 Coach-mark "Nouveautés"
- Sur première visite après déploiement, overlay 3 étapes : badge alertes → simulateur enrichi → comparatif.
- Flag `profiles.tour_seen_v2 boolean`.

### 3.3 Mobile (< 400 px)
- Audit dédié sur `DecisionTimeline`, `ProjectionSimulator` (sliders accessibles), `/comparatif` (table → cards).
- Tester sur 375 px et 320 px.

### 3.4 Accessibilité
- `aria-live="polite"` sur le badge d'alertes.
- Focus visible (ring or) sur les tooltips Glossary.
- Lecture clavier complète du simulateur.

### 3.5 Export PDF rapport trimestriel (bonus)
- Server route `/api/report/quarterly` qui génère un PDF (perf, impact, mouvements, alignement valeurs).
- Bouton sur dashboard "Télécharger mon rapport Q…".

---

## Détails techniques

**Migrations DB nécessaires (phase 2)** :
- `alerts` (table + RLS + GRANT + index sur `(user_id, read_at)`)
- `scheduled_contributions` (table + RLS + GRANT)
- `decision_events` (table + RLS + GRANT + index sur `(user_id, occurred_at DESC)`)
- Triggers sur `portfolios` pour alimenter `decision_events`
- Insert ETF MSCI World dans `assets` (data migration)

**Server functions à créer** :
- `lib/projection/scenarios.functions.ts` — résolution objectif inversé
- `lib/alerts/generate.functions.ts` — génération serveur des alertes
- `lib/contributions/schedule.functions.ts` — CRUD versements programmés
- `lib/report/quarterly.server.ts` — génération PDF (si bonus retenu)

**Aucun changement de design tokens** : on reste sur Emerald Prestige, `KPIFigure`, `EditorialSection`, montants à 2 décimales.

**Hors scope** :
- Notifications email (peut venir après phase 3).
- Multi-devise (l'app est EUR-only).
- Trading réel / passage d'ordres.

---

## Ordre d'exécution proposé

Je propose d'attaquer **Phase 1 d'abord** (pas de migration DB, gain utilisateur immédiat), puis **Phase 2** (migrations groupées en une seule passe pour limiter les allers-retours d'approbation), puis **Phase 3**.

Tu peux aussi me dire si tu veux retirer une sous-section (ex : pas de PDF, pas de coach-mark) pour aller plus vite.
