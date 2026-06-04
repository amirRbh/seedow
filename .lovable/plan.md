# Plan — 3 chantiers prioritaires Seedow

Approfondissement des 3 pistes prioritaires. Chaque chantier est livrable indépendamment ; ordre recommandé : **#1 → #2 → #3** (le simulateur prépare le terrain pour les versements programmés).

---

## Chantier 1 — Simulateur « Et si j'ajoute X €/mois ? »

### Objectif utilisateur
Visualiser, en 1 geste, ce que devient le portefeuille si on verse un montant mensuel sur 5/10/20 ans. Transforme le dashboard d'un état figé en outil de décision.

### Où ça vit
- **Dashboard** (`src/routes/dashboard.tsx`) — bloc principal, juste sous les KPIs.
- **Portfolio** (`src/routes/portfolio.tsx`) — version compacte (lien « Simuler un versement »).

### UX
- Bloc éditorial titré « Et si tu ajoutais… » (eyebrow or, h2 Space Grotesk).
- 3 contrôles : **montant mensuel** (slider 0 → 1 000 €, pas 25 €), **horizon** (5 / 10 / 20 ans en pills), **scénario** (prudent / central / optimiste — basé sur `expected_return ± volatility`).
- Sortie : KPIFigure XL du capital final + 2 KPIFigure sm (versements cumulés, plus-value estimée).
- Mini-graph aire (Recharts déjà installé) — comparaison « sans versement » vs « avec versement ».
- Mention obligatoire : « Projection indicative, non contractuelle. Hypothèses : rendement annualisé X %, volatilité Y %. »

### Technique
- **Pur frontend, zéro backend.** Calcul d'intérêts composés avec versements périodiques (formule fermée + série mensuelle pour le graph).
- Nouveau hook `src/hooks/useProjection.ts` — `(initial, monthly, years, annualReturn) => { finalValue, contributed, gain, series[] }`.
- Nouveau composant `src/components/dashboard/ProjectionSimulator.tsx`.
- Reprend `portfolio.metrics.expected_return` et `volatility` du portefeuille actif ; fallback `5%` / `12%` si absent.
- Scénarios : central = `expected_return`, prudent = `expected_return - 0.5·volatility`, optimiste = `+ 0.5·volatility`.

### Hors scope
Pas de persistance, pas d'A/B fiscal, pas de courbe Monte-Carlo (réservé v2).

---

## Chantier 2 — Rapport d'impact mensuel

### Objectif utilisateur
Donner du sens concret au capital investi : « ce mois-ci, ton portefeuille a évité X kg de CO₂ et financé Y MWh d'énergie verte ». Renforce la signature ESG/impact de Seedow.

### Où ça vit
- **Page Profil** (`src/routes/profil.tsx`) — nouvelle section « 04 · Ton impact » avant la progression.
- **Dashboard** — carte teaser compacte « Impact du mois » + lien « Voir le rapport complet ».

### UX
- Eyebrow or « Rapport d'impact · {mois} {année} ».
- 3 KPIFigure : **CO₂ évité** (kg), **Énergie verte financée** (équivalent MWh), **Score d'impact moyen** (/100).
- Equivalences humanisées : « = X trajets Paris-Marseille en voiture » / « = Y foyers alimentés 1 jour » (table de conversion en dur côté front).
- Filet or `.gold-rule` entre sections.
- Bouton « Télécharger le PDF » → **v2** (placeholder désactivé avec tooltip « Bientôt »).

### Technique
- Calcul dérivé des données déjà en base :
  - `assets.carbon_intensity_gco2e_per_eur` × valeur pondérée par holding → CO₂ évité vs benchmark (MSCI World moyenne ≈ 200 gCO₂e/€).
  - `cause_exposure` (jsonb sur `assets`) → MWh estimé pour la cause `climat`/`energie`.
- Nouveau serverFn `src/lib/impact/report.functions.ts` :
  - input : `{ portfolioId, month: 'YYYY-MM' }`
  - middleware : `requireSupabaseAuth`
  - calcul en SQL/JS à partir des holdings + prix de fin de mois (`asset_prices`).
- Nouveau composant `src/components/impact/ImpactReportCard.tsx`.
- Pas de nouvelle table — tout est calculé à la volée et caché via TanStack Query (`['impact', portfolioId, month]`, staleTime 1h).

### Hors scope
PDF export, notifications email mensuelles (chantier ultérieur, nécessite cron + storage).

---

## Chantier 3 — Versements programmés (DCA mensuel)

### Objectif utilisateur
Permettre de planifier un versement récurrent (« 100 € chaque 5 du mois ») et voir le prochain prélèvement à venir. Comportement attendu d'un investisseur sérieux, et boucle bien avec le simulateur (#1).

### Où ça vit
- **Profil** — nouvelle section « Ton plan d'épargne » (entre Portefeuille et Progression).
- **Dashboard** — chip discret « Prochain versement : 100 € le 5 déc. ».
- **Onboarding** — étape optionnelle finale « Veux-tu programmer un versement mensuel ? ».

### UX
- Form : montant, jour du mois (1-28), date de démarrage, statut actif/pause.
- Liste des versements passés (timeline avec `TimelineEvent` existant, type `soil`).
- Action « Mettre en pause » / « Modifier ».
- Pas de prélèvement réel — c'est un **plan déclaratif** (l'app simule l'exécution à la date prévue en ajoutant une ligne d'historique).

### Technique
- **Migration DB** (nouvelle table) :
  ```
  scheduled_contributions
    id, user_id, portfolio_id, amount_eur, day_of_month (1-28),
    starts_on, status (active|paused|cancelled), last_run_on, created_at, updated_at
  ```
  + RLS scoped `auth.uid() = user_id` + GRANT authenticated/service_role.
- **Table d'historique** existante réutilisée — ou nouvelle `contribution_history` si besoin (à arbitrer pendant l'impl).
- ServerFns : `createSchedule`, `pauseSchedule`, `cancelSchedule`, `listSchedules` (tous avec `requireSupabaseAuth`).
- **Cron** (`pg_cron` quotidien à 02:00 UTC) → route publique `/api/public/hooks/run-scheduled-contributions` qui :
  - lit les `scheduled_contributions` actives dont `day_of_month = EXTRACT(day, now())` et `last_run_on < today`.
  - insère une ligne d'historique + met à jour `portfolios.initial_amount` (ou table dédiée selon le modèle actuel).
  - signature : header `apikey` = anon key (pattern standard documenté).
- Hook `useScheduledContributions` (TanStack Query).
- Composant `src/components/contributions/ScheduleEditor.tsx`.

### Hors scope
Intégration bancaire réelle (SEPA, Bridge, Powens), notifications push, ajustement automatique des holdings (tout va en cash virtuel).

---

## Récap dépendances / effort

| Chantier | Backend | Frontend | DB | Effort |
|---|---|---|---|---|
| #1 Simulateur | — | 1 hook + 1 composant | — | **S** |
| #2 Rapport impact | 1 serverFn | 1 composant + intégration 2 pages | — | **M** |
| #3 Versements DCA | 4 serverFns + 1 cron route | 2 composants + 3 intégrations | 1 migration | **L** |

## Question pour toi

Par lequel on commence ? Je recommande **#1 (Simulateur)** — impact visuel immédiat, zéro risque backend, et il prépare le discours pour le #3.
