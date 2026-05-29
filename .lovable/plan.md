# Pivot vers l'audit ESG indépendant

## Principe

Seedow ne promet plus de placer l'argent. L'utilisateur **saisit son portefeuille existant** (lignes ISIN/ticker/nom + montant ou %), on **récupère les données ESG réelles** datées et sourcées, et on rend un **verdict d'audit** clair, transparent sur ses trous de couverture.

Le mode démo actuel (jardin généré, badges, growth comparison) reste accessible sur `/demo` pour la vitrine.

---

## 1. Nettoyage (1.1)

**Code supprimé / neutralisé**
- `src/components/discover/DepositSheet.tsx` → supprimé
- `src/hooks/useDeposits.tsx` → supprimé
- `src/routes/api/public/hooks/refresh-market-data.ts` → conservé (cron prix, utile pour cours actuels)
- Toutes les références à `useDeposits` dans `discover.tsx`, `portfolio.tsx`, `dashboard.tsx` → retirées
- `src/lib/mockGarden.ts` → déplacé/renommé `src/lib/demo/mockGarden.ts`, n'est plus importé que par `/demo`

**Migration DB**
- `DROP TABLE public.deposits` (avec CASCADE sur les FK éventuelles)
- L'enum `deposit_status` et `deposit_method` → DROP
- `portfolios.initial_amount` → renommé `total_value` (ou conservé, sémantique différente : c'est maintenant la valeur saisie par l'utilisateur)

---

## 2. Saisie manuelle du portefeuille (1.2)

**Nouveau composant** : `src/components/audit/HoldingsInput.tsx`
- Liste de lignes éditables : `[champ recherche unique]` + `[montant € | %]` + bouton supprimer
- Champ unique avec autocomplétion sur la table `assets` existante (matching nom + ticker + ISIN, fuzzy)
- Si pas de match → ligne marquée "non auditable" (gardée pour le total mais exclue du verdict, affichée honnêtement)
- Toggle global "Je saisis en € / en %" en haut
- Bouton "Ajouter une ligne" + import CSV simple (optionnel v1, sinon V2)

**Nouvelle route** : `src/routes/audit.tsx` (remplace `discover.tsx` dans la nav)
- Étape 1 : saisie holdings
- Étape 2 : verdict (cf §4)

**Server fn** : `src/lib/audit/holdings.functions.ts`
- `searchAssets({ query })` → autocomplete (top 10, ranking par nom puis ticker puis ISIN)
- `saveAuditPortfolio({ holdings: [{assetId | rawInput, amount, isPercent}] })` → écrit dans `portfolios` + `weights` JSON

---

## 3. Fetcher ESG réel (1.3)

**Nouveau fichier** : `src/lib/market/esg.server.ts`
- Source : MSCI ESG via API publique limitée OU Sustainalytics OU Yahoo `quoteSummary?modules=esgScores` (gratuit, partiel). **Recommandation v1 : Yahoo esgScores** (déjà notre source de prix, gratuit, mais couverture limitée aux grandes caps — c'est OK car ça illustre les trous).
- Fonction : `fetchEsgScores(yahooSymbol)` → `{ esgScore, envScore, socialScore, govScore, source: 'yahoo_esg', fetchedAt }`

**Migration DB** : `assets`
- Ajout `esg_score_fetched_at timestamptz`
- `esg_score_source` existe déjà → utilisé
- Idem pour `env_score_source`, `social_score_source`, `governance_score_source` (nullable)
- Politique de cache : refresh > 30j seulement (ESG bouge lentement)

**Nouvelle server route cron** : `src/routes/api/public/hooks/refresh-esg.ts`
- Itère sur les assets actifs avec `esg_score_fetched_at < now() - 30d`
- Log dans `cron_run_log` (table existante)
- Cron pg_cron mensuel

**Affichage source/date** : nouveau composant `src/components/audit/DataSourceBadge.tsx`
- Petit chip `Yahoo · 12 nov 2026` en pied de chaque donnée affichée

---

## 4. Verdict d'audit (1.4)

**Réutilise** : `src/lib/portfolio/metrics.ts` (computeMetrics existe déjà, prend weights+assets+covariance).

**Adaptations**
- `metrics.ts` doit gérer `esg_score = null` → exclure de la moyenne pondérée, retourner `coverage_pct` (poids couvert par une donnée ESG)
- Idem `carbon_intensity_coverage` déjà géré
- Nouveau champ output : `verdict: "aligné" | "mixte" | "désaligné"` calculé sur (esg_score, env_score, sfdr_article 8/9)

**Nouveau composant** : `src/components/audit/VerdictCard.tsx`
- Gros titre verdict (typo Syne grande, sobre)
- 3 KPIs : Score ESG pondéré / Intensité carbone / % SFDR 8-9
- Pour chaque KPI : valeur, source, couverture (ex: "couverture 78% du portefeuille")
- Liste détaillée par actif : ligne, montant, esg score, source, date — ou pastille "donnée indisponible"
- Bouton "Comment c'est calculé ?" → ouvre `/methodologie`

**Route** : `src/routes/audit.tsx` affiche `<HoldingsInput />` si pas encore saisi, sinon `<VerdictCard />`. La viz jardin/timeline est **gardée mais nourrie par le portefeuille saisi** (réutilisation maximale).

---

## 5. Landing + disclaimers (1.5)

**Refonte** : `src/routes/index.tsx`
- H1 : "Découvre si ton épargne est vraiment alignée"
- Sous-titre : "Audit ESG indépendant. Sans changer de banque."
- 3 piliers : (1) Tu saisis tes lignes, (2) On audite avec données publiques sourcées, (3) Tu repars avec un verdict clair
- Section "Trous de couverture assumés" — argument de transparence
- CTA : "Lancer mon audit" → `/audit` (ou `/auth` si non connecté)
- Mention liste d'attente : "Audit ouvert aux inscrits — [s'inscrire]"
- Disclaimers (méthodologie, non-conseil financier, sources tierces)

**Méthodologie** : `src/routes/methodologie.tsx` existe déjà → ajouter section "Audit" expliquant sources ESG, fréquence refresh, gestion des trous.

---

## Ordre d'exécution (4 batchs)

**Batch A — Nettoyage + migration DB** : suppression DepositSheet/useDeposits, migration DROP deposits + ajout colonne `esg_score_fetched_at`, mode démo isolé. *Risque : casser portfolio.tsx / discover.tsx qui consomment useDeposits — je remplace les usages par 0 / état vide propre.*

**Batch B — Saisie manuelle** : table inchangée (on réutilise `portfolios.weights`), nouvelle route `/audit`, composants `HoldingsInput` + `searchAssets` server fn.

**Batch C — Fetcher ESG + verdict** : `esg.server.ts`, route cron, adaptation `metrics.ts` pour gérer les nulls, `VerdictCard`.

**Batch D — Landing + disclaimers + nav** : refonte `index.tsx`, remplacement `/discover` par `/audit` dans `BottomNavigation`.

---

## Hors périmètre (à confirmer plus tard)

- Phase 2 (analytics, interviews, monétisation) : pas dans ce jet
- Import CSV / OFX : V2
- ESG source premium (MSCI payant) : V2
- Suppression complète du mode démo : on garde sur `/demo` pour l'instant

---

## Question bloquante avant code

**Source ESG v1 : Yahoo `esgScores` (gratuit, partiel) ou tu veux qu'on parte sur un provider gratuit dédié type [Sustainalytics public ratings](https://www.sustainalytics.com/esg-rating) (scraping limité) ou [Refinitiv/LSEG free tier] ?**

Je recommande Yahoo : on a déjà l'intégration, c'est cohérent avec les prix, et les trous de couverture deviennent un argument de transparence (pas un bug). Si OK, je démarre par le Batch A.
