
## Objectif

Livrer les 3 chantiers prioritaires identifiés, par ordre d'impact ressenti.

---

## 1. Graphique historique du portefeuille

**Quoi** : courbe d'évolution de la valeur du portefeuille avec filtres temporels (1S / 1M / 3M / 1A / Tout).

**Comment** :
- Nouvelle vue SQL `portfolio_history_daily` qui reconstitue la valeur quotidienne du portefeuille à partir de `asset_prices` (closes historiques) + poids du portefeuille + dépôts cumulés à chaque date.
- Server function `getPortfolioHistory({ portfolioId, range })` qui retourne `[{ date, value, invested }]`.
- Composant `PortfolioHistoryChart` (Recharts area chart) avec switch de range, posé en haut de `/portfolio`.
- Ligne pointillée du capital investi en référence pour visualiser le PnL.

**Limite assumée** : les dépôts sont rattachés à la date du dépôt ; pas de reconstitution rétroactive si l'utilisateur a modifié son allocation cible (acceptable v1).

---

## 2. Monitoring du cron prix

**Quoi** : alerte visible quand les prix n'ont pas été rafraîchis depuis plus de 48h (week-end exclu).

**Comment** :
- Helper `getMarketDataFreshness()` dans `usePortfolioValuation` qui expose `staleness: "fresh" | "stale" | "critical"` selon `latestQuoteAt`.
- Bandeau d'avertissement discret dans `/portfolio` et `/reglages` quand `stale` (> 48h) ou `critical` (> 5j ouvrés), avec bouton "Rafraîchir maintenant" déjà branché sur `triggerMarketRefresh`.
- Nouvelle table `cron_run_log` (timestamp, job_name, status, message) + écriture par le hook `/hooks/refresh-market-data` à chaque exécution (succès/échec + nb d'assets traités).
- Bloc "Santé des données" dans `/reglages` (onglet Méthodologie) listant les 5 dernières exécutions du cron.

---

## 3. Landing SEO publique

**Quoi** : remplacer la redirection immédiate `/` → app par une vraie page d'accueil publique optimisée SEO, avec accès rapide à l'app pour les utilisateurs connectés.

**Comment** :
- `src/routes/index.tsx` devient la landing publique (hero, proposition de valeur, 3 piliers : sobriété / impact / transparence, méthodologie résumée, FAQ, CTA "Créer mon portefeuille").
- L'app authentifiée passe sous `/dashboard` (déjà existant) ; auth redirige vers `/dashboard` après login.
- `head()` complet : title `Seedow — Investir simplement, durablement`, meta description, og:image (générée), JSON-LD `Organization` + `FAQPage`.
- Lien interne vers `/methodologie` (déjà existant) pour profondeur SEO.
- Mention discrète "Déjà inscrit ? Accéder à mon espace" en haut de page.

---

## Ordre d'exécution

Je traite dans cet ordre pour limiter les risques : **(2) monitoring** d'abord (petit, sécurise la donnée) → **(1) graphique** (cœur produit) → **(3) landing** (plus gros, isolé du reste).

## Détails techniques

- Stack : TanStack Start + Supabase (Lovable Cloud), Recharts déjà installé.
- Nouvelles tables : `cron_run_log` (RLS lecture authentifiée, écriture service role).
- Nouvelle vue : `portfolio_history_daily` (security invoker, RLS héritée via `portfolios.user_id`).
- Nouveau server fn : `src/lib/portfolio/history.functions.ts`.
- Nouveau composant : `src/components/portfolio/PortfolioHistoryChart.tsx`, `src/components/portfolio/MarketFreshnessBanner.tsx`.
- Refonte route : `src/routes/index.tsx` (landing) — le redirect actuel sera retiré, login redirigera vers `/dashboard`.

Pas de nouvelle dépendance npm. Pas de nouveau secret.
