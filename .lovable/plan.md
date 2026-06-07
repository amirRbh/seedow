## Deux axes ajoutés à seedow

### 1. Objectifs & projections

Permettre à chaque utilisateur de définir un ou plusieurs objectifs financiers (retraite, achat immobilier, études, fonds de précaution) et de suivre sa progression vs cible.

**Nouvelle entité**
- Table `financial_goals` (par utilisateur, liée optionnellement à un portefeuille)
  - nom de l'objectif, type (retraite / achat / études / précaution / autre)
  - montant cible, date cible
  - apport mensuel prévu, capital de départ
  - portefeuille rattaché (optionnel)

**Écran `/objectifs`**
- Liste éditoriale des objectifs avec `KPIFigure` : montant cible, % atteint, écart projection.
- Pour chaque objectif : barre de progression or sur fond crème, échéance, statut (en avance / dans les temps / en retard).
- Action « Nouvel objectif » → formulaire (nom, type, cible, échéance, apport mensuel, portefeuille).

**Simulateur de projection**
- Réutilise `useProjection` existant + apport mensuel de l'objectif.
- Sliders : apport mensuel, horizon, rendement attendu (issu du portefeuille).
- Graphe projection vs cible (3 scénarios : pessimiste / médian / optimiste, basés sur volatilité du portefeuille).
- Calcul du « manque » : combien faut-il ajouter par mois pour atteindre la cible à temps.

**Intégration dashboard**
- Bloc « Objectifs » sur `/dashboard` : top 2 objectifs avec progression et CTA vers `/objectifs`.

---

### 2. Social & comparaison

Couche communautaire anonyme pour benchmarker stratégie et impact.

**Nouvelles entités**
- Table `portfolio_shares` : snapshot anonyme partagé volontairement par un utilisateur
  - allocation (poids par classe d'actifs), causes, exclusions, métriques publiques (rendement attendu, volatilité, score ESG, intensité carbone)
  - pseudo public (depuis profil), opt-in obligatoire
- Colonne `public_handle` sur `profiles` (pseudo unique optionnel).

**Écran `/communaute`**
- Onglet « Stratégies partagées » : grille de cartes portefeuilles anonymes (pseudo, causes principales, score ESG, rendement attendu, volatilité). Filtres par cause et niveau de risque.
- Onglet « Classement d'impact » : top 50 portefeuilles par intensité carbone évitée et score ESG (pseudo + métriques, pas de montants).
- Comparateur : sélection 1–3 portefeuilles partagés vs son propre portefeuille → tableau côte à côte (allocation, ESG, carbone, rendement, volatilité).

**Action depuis `/portfolio`**
- Toggle « Partager ce portefeuille » dans les réglages du portefeuille → crée/met à jour le snapshot anonyme. Aucun montant utilisateur n'est exposé.

**Intégration dashboard**
- Encart « Comment vous vous situez » : votre score ESG vs médiane communauté, intensité carbone vs médiane.

---

### Détails techniques

- **Base de données** : 2 migrations
  - `financial_goals` (RLS scoped `auth.uid()`, GRANT authenticated + service_role)
  - `portfolio_shares` (RLS : lecture authenticated globale, write/update/delete `auth.uid() = user_id`) + ajout `public_handle` sur `profiles` (unique, nullable)
- **Server functions** sous `src/lib/goals/` et `src/lib/community/` (`requireSupabaseAuth`)
  - `listGoals`, `upsertGoal`, `deleteGoal`, `getGoalProjection`
  - `togglePortfolioShare`, `listCommunityShares` (avec filtres), `getImpactLeaderboard`, `compareShares`
- **Routes TanStack**
  - `src/routes/objectifs.tsx` (liste + dialog d'édition)
  - `src/routes/objectifs.$goalId.tsx` (détail + simulateur)
  - `src/routes/communaute.tsx` (layout + onglets via search params)
- **Composants**
  - `src/components/goals/GoalCard.tsx`, `GoalProgressBar.tsx`, `GoalSimulator.tsx`, `GoalDialog.tsx`
  - `src/components/community/SharedPortfolioCard.tsx`, `ImpactLeaderboard.tsx`, `PortfolioComparator.tsx`, `ShareToggle.tsx`
  - Réutilise `KPIFigure`, `EditorialSection`, `.gold-rule`, mêmes règles typo/lexique sobre.
- **Navigation** : ajout des entrées « Objectifs » et « Communauté » dans `RailNav` / `BottomNavigation` / `CommandPalette`.
- **Sécurité** : `portfolio_shares` ne contient jamais de montants ni d'identifiant utilisateur affichable — uniquement `public_handle`. Validation Zod côté serveur sur tout upsert.

---

### Hors scope

- Pas de messagerie directe entre utilisateurs (à proposer plus tard).
- Pas de copy-trading (juridiquement sensible).
- Pas de notifications push (les alertes existantes suffisent pour le rappel d'objectif).
