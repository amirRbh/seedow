# Seedow — Personal Investment Universe

## Audit, gap analysis et plan d'exécution de la nouvelle architecture produit

> **Statut : document de décision. Aucune ligne de code produit n'a été modifiée.**
> Conformément à la consigne : on valide _what Seedow is_ avant _how Seedow looks_, et
> avant _how Seedow is coded_.
>
> Convention : **FACT** = vérifié dans le repo à la date du document. **HYPOTHÈSE** = à valider.
> **DÉCISION** = arbitrage à trancher par l'équipe.
>
> North star de référence pendant toute l'analyse :
> _Seedow doesn't tell you what to buy. Seedow helps you understand what you could own,
> what your money would do, and which choices best match what matters to you._

---

## 1. Executive conclusion

**Oui, je recommande cette architecture — mais pas pour les raisons avancées dans le brief, et pas sans corriger une erreur de raisonnement qui, laissée en l'état, ferait échouer la V1.**

### 1.1 Ce que le pivot règle réellement

Le brief justifie le pivot par l'évitement de la complexité (allocation, pondérations, moyenne-variance, rebalancement, responsabilité). **Cet argument est en grande partie faux dans le cas de Seedow**, et il faut le dire tout de suite : cette complexité est **déjà construite, testée et payée**. `src/lib/portfolio/` contient un QP Markowitz sous contraintes, un optimiseur risk-parity, un modèle de risque avec shrinkage James-Stein + Ledoit-Wolf, un backtest walk-forward, et 17 fichiers de tests. Ce n'est pas un coût futur à éviter, c'est un actif déjà au bilan. Pivoter « pour ne pas avoir à le faire » reviendrait à jeter la seule partie du produit qui est objectivement de qualité production.

Le vrai argument en faveur du pivot est ailleurs, et il est bien plus fort. Il est écrit noir sur blanc dans votre propre audit méthodologique (`docs/methodologie-v2.md`) :

> « **Le paradoxe Seedow : l'ingénierie est en avance sur les données.** […] Le chantier prioritaire n'est **pas** algorithmique, il est **data + traçabilité**. »

Et surtout, faiblesse n°6 de ce même audit : **« Personnalisation quasi nulle — intensité uniforme 0,7 + tilt ±1,5 % → portefeuilles peu différenciés. »**

Voilà le vrai diagnostic. Le modèle portfolio-first **dissout la personnalisation** : les convictions de l'utilisateur entrent dans l'optimiseur comme un tilt de ±1,5 % sur μ et un plancher ESG ≥ 70, puis ressortent sous forme de six lignes d'ETF que deux utilisateurs aux valeurs opposées obtiennent quasi identiques. L'utilisateur ne _voit_ jamais son alignement — il voit une allocation. La promesse de marque (« structure un portefeuille selon **tes** convictions ») n'est pas tenue par le moteur, non par manque d'algorithme, mais parce que **l'optimiseur est un mauvais canal d'expression de préférences** : il écrase l'intention dans un scalaire.

Le Personal Investment Universe corrige exactement ça. Il fait de la préférence utilisateur non plus un paramètre marginal d'une fonction objectif, mais **l'axe de tri de tout le produit**. C'est le bon pivot, pour la bonne raison.

### 1.2 L'erreur de raisonnement à corriger — le point le plus important du document

**Le brief suppose que la nouvelle architecture est _moins_ exigeante en données. C'est l'inverse : elle est nettement _plus_ exigeante, et sur précisément la donnée qui vous manque aujourd'hui.**

Relisez les promesses du §8 et du §11 du brief :

- « Cet ETF contient X entreprises »
- « Ton exposition indirecte aux fossiles est de X% »
- « Voici les principales entreprises responsables de cette exposition »
- « ⚠️ Company X represents 2.1% »

Ces quatre phrases sont **toutes** du look-through. Elles exigent `fund_holdings` peuplé, réconcilié en `securities`, et croisé avec des données d'activité par émetteur.

**FACT — `fund_holdings` est vide.** La table existe (`20260812130000_data_engine_foundation.sql`), le parser iShares existe, le contrôle qualité existe (`holdings-quality.ts`), l'orchestrateur existe (`holdings-ingest.ts`), le hook cron existe, le moteur carbone PCAF qui la consomme existe (`carbon-engine.ts`) — **et aucune donnée réelle n'y est entrée**. Le dernier commit du repo (`3ecb32e`, 21/08) conclut l'enquête : la voie HTTP simple vers iShares est **épuisée** (endpoint piloté par une config runtime SPA), et la recommandation actée est de **basculer sur un flux EET/SFDR licencié**.

Conséquence directe et non négociable :

> **Le chemin critique de la nouvelle vision n'est pas du code produit. C'est une décision d'acquisition de données (EET licencié, ou posture ToS navigateur sans tête). Tant qu'elle n'est pas tranchée, l'Asset Detail Page du §11 ne peut pas exister honnêtement — et la construire quand même avec des chiffres estimés violerait §1.2 et §1.3 de CLAUDE.md.**

Le portfolio-first, lui, pouvait tourner sur des scores fonds agrégés. Le pivot **déplace le goulot d'étranglement de l'algorithme vers la donnée**, au moment précis où la donnée est bloquée. Ce n'est pas une raison de ne pas pivoter. C'est une raison de **séquencer le pivot autour de cette contrainte** plutôt que de faire comme si elle n'existait pas (voir §16-17).

### 1.3 Le second correctif : le Match Score ne doit pas être un score de Seedow

Un « 94% match » calculé avec des pondérations choisies par Seedow est trois choses à la fois, toutes mauvaises :

1. **Méthodologiquement indéfendable.** Agréger ESG + risque + coût + diversification dans un scalaire reproduit exactement le défaut documenté des notations ESG (divergence des agrégats : Berg, Kölbel & Rigobon, 2022). Vous auriez recréé, sous un autre nom, le problème que votre `sustainability-classification.ts` a justement été écrit pour éviter.
2. **Réglementairement dangereux.** Un score personnalisé, affiché sur un instrument financier nommé, présenté à un particulier — c'est la forme même de la **recommandation personnalisée** au sens MiFID II (voir §14). Le pivot est censé _réduire_ le risque réglementaire ; mal fait, il l'augmente.
3. **Contraire à votre propre north star.** « Seedow doesn't tell you what to buy » — mais un score propriétaire qui classe les actifs _est_ un avis sur ce qu'il faut acheter, simplement déguisé en pourcentage.

**Recommandation structurante (elle règle les trois problèmes d'un coup) : les pondérations du Match Score appartiennent à l'utilisateur, pas à Seedow.** Seedow fournit des dimensions mesurées, sourcées et séparées ; l'utilisateur fixe (explicitement ou via l'onboarding, avec valeurs par défaut modifiables et visibles) leur importance relative. Le score devient alors _« le résultat de **ton** filtre appliqué à des données que nous sourçons »_, et non _« notre jugement sur cet actif »_.

C'est simultanément :

- le correctif méthodologique (pas d'agrégation arbitraire imposée),
- le bouclier réglementaire (Seedow exécute le filtre de l'utilisateur — outil, pas conseil),
- et **le différenciateur produit** : c'est précisément ce qu'aucun screener existant (justETF, Curvo, screeners brokers) ne fait.

### 1.4 Verdict

| Question                                               | Réponse                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faut-il pivoter vers le Personal Investment Universe ? | **Oui.** Il tient enfin la promesse de personnalisation que l'optimiseur ne tient pas.                                                                                                  |
| Faut-il le faire pour « éviter la complexité » ?       | **Non.** Cette complexité est déjà construite. Ce serait détruire de la valeur.                                                                                                         |
| Le portefeuille doit-il rester ?                       | **Oui**, en aval, comme le brief le dit lui-même (§15). Le moteur devient une feature « Improve », pas le cœur.                                                                         |
| Est-ce défendable comme entreprise ?                   | **Conditionnellement.** Le screener est commoditisé. Le look-through + la provenance + l'historique ne le sont pas. Le moat est **entièrement** du côté de la donnée bloquée. Voir §15. |
| Quel est le vrai P0 ?                                  | **Débloquer les holdings (décision EET).** Pas l'UI, pas le score.                                                                                                                      |

---

## 2. Current architecture — ce que Seedow fait aujourd'hui

### 2.1 Vue d'ensemble (FACT)

```
Onboarding (4 questions)
   values · exclusions · objective · amount [· risk appetite]
        ↓  answersToParams()          src/lib/onboarding/params.ts
   PortfolioParams { causes, cause_intensity, exclusions, risk_target, horizon, amount }
        ↓  buildPortfolio()            src/lib/portfolio/engine.ts  (v1.4)
   1. Exclusions dures
   2. Best-in-class ESG   (retire le quart bas par classe)
   3. Best-in-class carbone (retire le tiers WACI le plus intensif parmi les mesurés)
   4. Data quality tiering + ancrage des μ non fiables
   5. Tilts μ : conviction (±1,5 %) puis carbone (±1,5 %)
   6. QP Markowitz : max μᵀw − (λ/2)wᵀΣw, s.c. Σw=1, wᵢ≤0.25, bornes de classe, ESG≥70
   7. Replis : equal-weight de classe → capAndRedistribute (water-filling 25 %)
   8. computeMetrics() + buildExplanation()
        ↓
   portfolios + portfolio_holdings  →  Dashboard · Portfolio · Comparatif · Certificat · Objectifs
```

En parallèle, **Discover** (`routes/discover.tsx` + `hooks/useAssetUniverse.tsx`) expose l'univers brut avec des filtres (recherche, thème, classe, région, risque max, TER max, ESG min, tri) et 4 « intent presets ». **Aucun classement personnalisé** : le tri par défaut est global, identique pour tous les utilisateurs.

### 2.2 Inventaire des briques (FACT, code lu)

| Domaine                       | Ce qui existe                                                                                                                                                                        | État réel                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Moteur de portefeuille**    | `engine.ts`, `markowitz.ts`, `riskparity.ts`, `metrics.ts`, `backtest.ts`, `allocation.ts`, `explanation.ts`, `rationale.ts`, `consequences.ts`, `tradeoffs.functions.ts`            | ✅ Production, versionné (v1.4), 17 fichiers de tests               |
| **Modèle de risque**          | `lib/market/` — log-returns 252 j, James-Stein + Ledoit-Wolf, cron `recompute-risk-model`                                                                                            | ✅ État de l'art. Limite : ~2 ans d'historique Yahoo                |
| **Look-through / overlap**    | `lib/portfolio/overlap.ts` (N3 ✅)                                                                                                                                                   | ⚠️ **Construit, non alimenté** (dépend de `fund_holdings`)          |
| **Moteur carbone PCAF**       | `lib/esg/carbon-engine.ts` — 6 paliers de qualité, scopes séparés, attribution EVIC                                                                                                  | ⚠️ **Construit, non alimenté**                                      |
| **Classification durabilité** | `sustainability-classification.ts` — tiers SFDR-**indépendants** dérivés des signaux bruts + drivers + confiance                                                                     | ✅ Excellent. Pièce maîtresse du moat                               |
| **Greenwashing**              | `esg/transparency.ts` — heuristique motivée, `DataCoverage`, `GreenwashingRisk` + raisons                                                                                            | ✅ Fonctionnel, exposé en Discover et via `/api/public/esg-preview` |
| **Data Engine**               | `lib/data-engine/` — registry de sources (priorité 1-4, ToS/robots/attribution), connecteurs iShares/Amundi/Vanguard/AMF-GECO/MSCI, qualité, complétude, ISIN Luhn, dédup, promotion | ✅ Architecture solide                                              |
| **Provenance**                | `data_observations` (valeur atomique + source + date + confiance + méthode + statut de validation), `data_sources`, `ingestion_jobs`, `ingestion_errors`                             | ✅ **Rare et précieux.** Peu de concurrents ont ce ledger           |
| **Catalogue mondial**         | `catalog_instruments` (Adanos, ~61k listings, MIT) + `catalog_imports`                                                                                                               | ✅ Couche identité séparée d'`assets`, correctement isolée          |
| **Pipeline SFDR**             | `esg/sfdr-pipeline/` — resolver GECO, extracteur de documents, parser                                                                                                                | ✅ Construit                                                        |
| **Univers curé**              | `assets` — ~58 tickers ajoutés par les vagues d'élargissement (+ seed initial)                                                                                                       | ⚠️ Étroit, et surtout **mal sourcé** (cf. 2.3)                      |
| **Holdings**                  | `fund_holdings`, `securities`, `fund_documents`, parser CSV iShares, QC, orchestrateur, hook cron                                                                                    | ❌ **VIDES.** Voir 2.4                                              |
| **Proto-collection**          | `watchlists (user_id, asset_id)` + `useWatchlist`                                                                                                                                    | ⚠️ Existe, sans poids ni analyse                                    |
| **Rétention**                 | `alerts`, `asset_score_history`, `esg-alert.ts`, `notification_delivery`, `le-fil.tsx`, `reveil.tsx`                                                                                 | ✅ Boucle « ton argent a changé » déjà amorcée                      |
| **Ethi**                      | `api.ethi.ts`, `lib/ethi/` (prompts + contexte), rate limiting                                                                                                                       | ✅ Fonctionnel                                                      |
| **UI**                        | 40 routes, ~10 600 lignes, composants par domaine, shadcn, tokens DA                                                                                                                 | ⚠️ IA sprawlante (cf. §11)                                          |
| **Tests**                     | 82 fichiers de tests                                                                                                                                                                 | ✅ Culture de test réelle                                           |

### 2.3 Le problème de provenance de l'ESG (FACT, cité de `docs/methodologie-v2.md`)

| Donnée                        | Source réelle                                                | Verdict de votre propre audit                    |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `esg_score`                   | `seedow-internal-v1` — **estimation par catégorie de fonds** | Non traçable jusqu'à une donnée source           |
| `env/social/governance_score` | **NULL sur la quasi-totalité**                               | Le composite retombe partout sur `esg_score`     |
| `cause_exposure`              | **saisi à la main au seed**                                  | Subjectif, non auditable                         |
| WACI / ITR / MSCI             | réels sur **~50 actifs sur ~120**                            | Partiel                                          |
| `fund_holdings`               | **aucune migration ne la peuple**                            | Moteur carbone non alimenté ; overlap impossible |

> « Dès qu'on demande "pourquoi ce fonds a 78 en ESG ?", la réponse est "estimation interne par catégorie" — non auditable. »

**Ceci est le fait le plus important de tout l'audit.** Le Match Score du §5 du brief consommerait ces intrants. Un « 94% match » construit sur un `cause_exposure` saisi à la main et un `esg_score` estimé par catégorie serait **une fausse précision bâtie sur une estimation** — la violation la plus directe possible de CLAUDE.md §1.2 et §1.3.

### 2.4 Le blocage holdings (FACT, `docs/esg-sources.md` + commit `3ecb32e`)

Pipeline complet et prêt : `resolveUrl → httpDownload → parse CSV → QC dure → persist fund_holdings`, avec un « gate souverain » qui n'expose aucune donnée non validée. Ce qui manque est **la source**, pas le code :

- iShares `product-data.jsn` : vivant, mais paramétré par un `localConfig` assemblé au runtime par la SPA → HTTP simple renvoie une coquille vide. **Voie épuisée** (runs #1-#5).
- Options restantes actées : **(A)** navigateur sans tête (posture ToS plus lourde, à acter explicitement) — **(B)** repli **EET/SFDR licencié**, recommandé pour une couverture de production.
- Amundi / Vanguard : connecteurs déclarés, parsers de formats non écrits.

### 2.5 Ce que le produit ne fait pas aujourd'hui

- ❌ Aucun **classement personnalisé** de l'univers. Discover est le même pour tout le monde.
- ❌ Aucune notion de **match / alignement** dans le code (grep : 1 seule occurrence, dans un contenu de cours).
- ❌ Aucune **page actif** riche (`fonds.$isin.tsx` = 262 lignes, pas la « unité de compréhension » du §11).
- ❌ Aucune **collection pondérée** hors portefeuille optimisé (`watchlists` n'a pas de poids).
- ❌ Aucun **what-if** (`tradeoffs.functions.ts` existe mais sert l'explication du portefeuille généré, pas la comparaison d'alternatives).
- ❌ Les **préférences utilisateur ne sont pas un objet de première classe** : elles sont figées dans la ligne `portfolios` (causes, exclusions, risk_target). Pas de table `user_preferences` réutilisable hors portefeuille.

---

## 3. Target architecture — ce que Seedow doit devenir

```
                         ┌──────────────────────────────────────────┐
      FINANCIAL DATA ────▶│                                          │
      (identité, classe,  │        ASSET INTELLIGENCE LAYER          │
       frais, holdings,   │  par classe d'actifs (§7), chaque champ  │
       géo, secteur)      │  porté par data_observations :            │
                          │  { valeur, source, date, confiance,       │
      ESG / IMPACT DATA ─▶│    méthode, statut de validation }        │
      (climat, E/S/G,     │                                          │
       controverses,      │   ── quatre dimensions JAMAIS fondues ── │
       SFDR, fossile,     │   1. ESG Risk (risque subi)              │
       activité durable)  │   2. Impact / Exposure (ce que ça finance)│
                          │   3. Financial (risque, coût, liquidité)  │
                          │   4. Disclosure (SFDR, labels, docs)      │
                          └────────────────┬─────────────────────────┘
                                           │
      USER DATA ───────────────────────────┤
      (valeurs pondérées, exclusions,      │
       contraintes, tolérance, objectifs)  │
                                           ▼
                          ┌──────────────────────────────────────────┐
                          │      PERSONAL INVESTMENT UNIVERSE        │
                          │  éligibilité (dur) → satisfaction par    │
                          │  dimension → agrégation aux POIDS DE      │
                          │  L'UTILISATEUR → rang + explication       │
                          └────────────────┬─────────────────────────┘
                                           ▼
             EXPLORE ──▶ UNDERSTAND ──▶ SELECT ──▶ [ COLLECTION ]
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    ▼                   ▼                   ▼
                             IMPACT ENGINE       WHAT-IF ENGINE      CHANGE FEED
                          (agrégation look-      (substitution,      (« your money
                           through pondérée)      trade-offs)          changed »)
                                    │
                                    ▼
                          [ OPTIONAL OPTIMIZATION ]  ← engine.ts existant, devient une feature
                                    ▼
                              [ PORTFOLIO ] ──▶ INVEST (partenaire, plus tard)
```

**Trois principes d'architecture qui n'existent pas aujourd'hui et qui sont non négociables :**

1. **Séparation stricte des dimensions** (§6 du brief). ESG Risk ≠ Impact ≠ User Alignment ≠ SFDR ≠ Match. Elles sont stockées séparément, affichées séparément, et ne fusionnent **qu'au moment de l'agrégation par les poids de l'utilisateur** — jamais en amont, jamais en base.
2. **Le Match Score est une fonction de l'utilisateur.** Seedow fournit `satisfaction[dimension] ∈ [0,1]` + confiance. L'utilisateur fournit `w[dimension]`. Le score est `Σ w·s / Σ w` sur les dimensions **couvertes**, renormalisé — et il est toujours affiché décomposé.
3. **La confiance voyage avec la valeur.** Toute dimension a une couverture ; une couverture faible **abaisse la confiance affichée et n'est jamais comblée par une estimation silencieuse**. Un actif sans holdings ne reçoit pas un « faux 0 % fossile » : il reçoit « exposition fossile : non mesurée ».

---

## 4. Product Gap Analysis

Priorité : **P0** = bloquant pour la V1 · **P1** = nécessaire pour la promesse complète · **P2** = après validation.

| #   | Area                        | Current                                                      | Target                                                                  | Gap                                                                                    | Effort              | Priorité                    |
| --- | --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------- | --------------------------- |
| 1   | **Holdings / look-through** | `fund_holdings` vide, voie iShares épuisée                   | Compositions datées sur l'univers cœur                                  | **Décision d'acquisition (EET licencié vs navigateur sans tête)** — pas un gap de code | Décision + M        | **P0 — chemin critique**    |
| 2   | **Provenance de l'ESG**     | `esg_score` = estimation interne par catégorie, piliers NULL | Piliers réels sourcés + `esg_score_source` affiché partout              | Ingestion MSCI/EET élargie ; UI de provenance                                          | L                   | **P0**                      |
| 3   | **Préférences utilisateur** | Figées dans `portfolios`, non pondérées                      | Objet de 1re classe, pondéré, versionné, réutilisable                   | Table `user_preferences` + historique + UI                                             | S-M                 | **P0**                      |
| 4   | **Match Score**             | ❌ Inexistant                                                | Décomposable, poids utilisateur, confiance, explication                 | `lib/matching/` neuf + méthodologie publiée                                            | M                   | **P0**                      |
| 5   | **Collection**              | `watchlists` (asset_id seul)                                 | Collection pondérée, nommée, analysable, versionnée                     | Tables `collections`/`collection_items` + UI                                           | M                   | **P0**                      |
| 6   | **Asset Detail Page**       | `fonds.$isin.tsx`, 262 l., pauvre                            | Unité de compréhension complète (§11)                                   | Refonte ; **dépend du gap 1** pour « what it owns »                                    | M-L                 | **P0 partiel / P1 complet** |
| 7   | **Collection Impact**       | `portfolioImpact.ts` sur portefeuille optimisé               | Agrégation look-through sur collection libre                            | Réutilisation forte de l'existant                                                      | M                   | **P1**                      |
| 8   | **What-if**                 | ❌ (les `tradeoffs` servent l'explication du portefeuille)   | Substitution 1↔1 + comparaison multi-dimensions                         | `lib/whatif/` neuf                                                                     | M                   | **P1**                      |
| 9   | **Overlap / concentration** | `overlap.ts` construit, non alimenté                         | Alerte « tes 3 ETF sont à 78 % les mêmes entreprises »                  | **Dépend du gap 1.** Killer feature en mode collection                                 | S (une fois 1 levé) | **P1**                      |
| 10  | **Change feed**             | `alerts`, `asset_score_history`, `le-fil`                    | Diff daté sur la collection (§16)                                       | Snapshots de collection + moteur de diff                                               | M                   | **P1**                      |
| 11  | **Classes d'actifs**        | ETF-centré ; enum couvre bonds/reit/commodity                | Méthodologie **par classe** (actions, corporate, green, SLB, souverain) | Modèles + données distincts par classe                                                 | L                   | **P2** (sauf actions, P1)   |
| 12  | **IA / navigation**         | 40 routes, IA sprawlante                                     | 5-6 destinations, une par étape du parcours                             | Refonte IA + redirections                                                              | M                   | **P1**                      |
| 13  | **Portfolio**               | Cœur du produit                                              | Aval de la collection, optimisation optionnelle                         | Ré-encadrement, **pas suppression**                                                    | S                   | **P1**                      |
| 14  | **Business model**          | `tarifs.tsx` existe                                          | Free / Premium / Invest / B2B (§13)                                     | Gating + facturation                                                                   | M                   | **P2**                      |
| 15  | **B2B API**                 | Serveur MCP existant (!)                                     | Impact Intelligence API                                                 | Le MCP est une amorce sérieuse                                                         | M-L                 | **P2**                      |
| 16  | **Cadre réglementaire**     | Disclaimers + `disclaimer.functions.ts`                      | Validation juridique du Match Score                                     | **Avis juridique requis** (§14)                                                        | Externe             | **P0 (juridique)**          |

---

## 5. Personal Investment Universe — définition

### 5.1 Définition

> Le Personal Investment Universe est le **sous-ensemble ordonné et explicable** de l'univers investissable de Seedow, obtenu en appliquant les **contraintes dures** de l'utilisateur (éligibilité) puis en **classant** le reste selon **ses propres pondérations** de dimensions mesurées et sourcées.

Trois propriétés définitionnelles :

1. **Il est personnel** — deux utilisateurs aux préférences différentes obtiennent des univers différents en composition **et** en ordre. (C'est exactement ce que le portfolio-first ne produit pas.)
2. **Il est explicable ligne à ligne** — pour tout actif présent, on sait dire pourquoi il est là et à quel rang ; pour tout actif absent, on sait dire quelle contrainte l'a exclu.
3. **Il est honnête sur ses trous** — un actif dont la donnée manque n'est pas silencieusement rétrogradé ni silencieusement promu ; il est marqué `couverture insuffisante` et l'utilisateur choisit de l'inclure ou non.

### 5.2 Les deux étages

**Étage 1 — Éligibilité (booléen, non négociable).** Filtre binaire. Un actif est éligible ou ne l'est pas. Aucune pondération.

| Critère                | Règle                                                                    | Source aujourd'hui                                   |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| Exclusions utilisateur | `excluded_sectors ∩ user.exclusions = ∅`                                 | `assets.excluded_sectors` (déclaratif, à sourcer)    |
| Investissabilité       | `available_eu IS TRUE`                                                   | `assets.available_eu` (colonne N4, **NULL partout**) |
| Déduplication          | `share_class_of IS NULL` (canonique)                                     | colonne N4, à peupler                                |
| Actif                  | `is_active`                                                              | ✅                                                   |
| Plancher de couverture | couverture données ≥ seuil, sinon zone « données insuffisantes » séparée | `computeDataCoverage()` ✅                           |

> ⚠️ **`available_eu` et `share_class_of` sont NULL partout.** Un univers personnel qui propose un fonds indisponible en France, ou trois share-classes du même fonds comme trois choix distincts, détruit la confiance en une session. **Peupler ces deux colonnes est un P0 sous-estimé.**

**Étage 2 — Classement (continu, pondéré par l'utilisateur).** Voir §6.

### 5.3 Ce que le PIU n'est pas

- ❌ Une liste de « bons » actifs. Le classement dépend de l'utilisateur ; il n'y a pas de vérité.
- ❌ Une recommandation. Le vocabulaire produit doit être **« correspond à ce que tu as dit »**, jamais « recommandé », « meilleur », « top », « à privilégier ». (Enjeu réglementaire, §14.)
- ❌ Un univers figé. Il se recalcule quand les préférences **ou** les données changent — et ce recalcul est le carburant de la rétention (§16 du brief).

### 5.4 « 143 investissements correspondent à tes préférences »

**Attention à ce chiffre du §21 du brief.** Avec ~58-120 lignes dans `assets` dont la moitié sans ESG réel, ce nombre serait aujourd'hui **inférieur à 40** — et l'afficher gonflé serait de la sur-promesse (CLAUDE.md §1.3). Deux conséquences :

- **Ne jamais afficher un compte sans afficher le dénominateur** : « 37 sur 58 analysés ».
- **La largeur d'univers devient un objectif produit chiffré**, pas un détail d'ingestion. C'est le KPI n°1 de la V1 (le Moat Blueprint vise déjà 150+, ticket B1).

---

## 6. Asset Matching Engine — méthodologie

> Le brief demande explicitement : « Ne hardcode pas arbitrairement 40 % ESG + 20 % risk. Propose une méthodologie robuste. » Voici la proposition.

### 6.1 Principe : séparer _mesurer_ et _pondérer_

| Rôle                                                                       | Qui décide                                         | Nature                            |
| -------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| **Mesurer** — « quelle est l'exposition fossile de cet ETF ? »             | **Seedow**                                         | Fait sourcé, daté, avec confiance |
| **Traduire en satisfaction** — « 3,2 % de fossile, est-ce satisfaisant ? » | **Seedow, via une fonction publiée et versionnée** | Méthodologie auditable            |
| **Pondérer** — « le fossile compte-t-il plus que les frais ? »             | **L'UTILISATEUR**                                  | Préférence, jamais un fait        |

**Toute la robustesse méthodologique tient dans cette séparation.** L'agrégation arbitraire dénoncée dans la littérature sur les notations ESG naît de la confusion entre les trois. Seedow ne doit jamais franchir la troisième ligne.

### 6.2 Les dimensions (indépendantes par construction)

Chaque dimension `d` produit un triplet : `{ satisfaction s ∈ [0,1], coverage c ∈ [0,1], evidence[] }`.

| Dimension          | Question utilisateur                  | Mesure                                         | Disponible aujourd'hui                                                 |
| ------------------ | ------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `values_alignment` | « finance ce qui compte pour moi »    | exposition d'activité par thème (look-through) | ❌ **dépend des holdings** ; proxy dégradé : `cause_exposure` (manuel) |
| `harm_avoidance`   | « ne finance pas ce que je refuse »   | exposition résiduelle aux secteurs exclus      | ❌ **dépend des holdings** ; proxy : `excluded_sectors` (déclaratif)   |
| `climate`          | « bas carbone, trajectoire crédible » | WACI vs référence, ITR                         | ⚠️ ~50 actifs (MSCI réel)                                              |
| `esg_quality`      | « entreprises bien gérées »           | piliers E/S/G réels                            | ⚠️ piliers NULL → retombe sur l'agrégat                                |
| `controversy`      | « pas de scandale en cours »          | controverses par émetteur                      | ❌ à ingérer                                                           |
| `cost`             | « frais raisonnables »                | TER (+ coûts KID plus tard)                    | ✅ `assets.ter`                                                        |
| `risk_fit`         | « compatible avec ma tolérance »      | volatilité → SRRI approximé                    | ✅ (approximation, à dire)                                             |
| `diversification`  | « pas tous mes œufs »                 | nb de lignes, HHI, overlap intra-collection    | ⚠️ `overlap.ts` prêt, non alimenté                                     |
| `disclosure`       | « transparent et vérifiable »         | complétude documentaire, fraîcheur             | ✅ `completeness.ts`, `quality.ts`                                     |

> **`disclosure` n'est pas un critère cosmétique.** C'est le seul de la liste que **Seedow** contrôle et améliore par son propre travail d'ingestion. C'est la dimension-moat.

### 6.3 Fonctions de satisfaction — quatre formes, jamais improvisées

Chaque dimension déclare **explicitement** sa forme, ses seuils, leur origine et leur version.

1. **Monotone décroissante bornée** (fossile, WACI, TER) : `s = clamp((x_max − x)/(x_max − x_min), 0, 1)`. Bornes issues **de la distribution observée de l'univers** (ex. p10/p90), pas de chiffres ronds inventés. → **calibration empirique, ré-auditable à chaque élargissement d'univers.**
2. **Monotone croissante bornée** (exposition à l'activité durable, score pilier).
3. **Cible avec tolérance** (`risk_fit`) : `s = exp(−((σ − σ*)/τ)²)`. Un actif _trop peu_ risqué pour un profil dynamique n'est pas parfait non plus — le monotone serait faux ici.
4. **Ordinale** (controverses : none/low/moderate/severe) : mapping documenté vers `{1, 0.7, 0.35, 0}`. **Aucune fausse continuité** sur une donnée catégorielle.

### 6.4 Agrégation

```
sat(a)      = Σ_d  w_d · c_d · s_d(a)     ─────────────  ∈ [0,1]
              ─────────────────────────
              Σ_d  w_d · c_d

coverage(a) = Σ_d w_d · c_d / Σ_d w_d      ∈ [0,1]
```

Trois garde-fous :

- **La couverture pondère, elle ne pénalise pas.** Une dimension non mesurée sort du numérateur **et** du dénominateur : elle ne baisse pas le score. Elle baisse la **confiance**, affichée séparément.
- **Refus de scorer sous seuil.** Si `coverage(a) < 0.5`, on n'affiche **aucun** score : `« Données insuffisantes pour évaluer cet actif selon tes critères »` + la liste des dimensions manquantes. C'est CLAUDE.md §1.3 appliqué littéralement.
- **Précision honnête.** **Ne pas afficher « 94 % ».** Sur des intrants dont certains sont estimés, deux chiffres significatifs sont une fausse précision. Afficher des **bandes** (`Correspondance forte / bonne / partielle / faible`) + le détail par dimension. `94 %` implique une exactitude que la donnée sous-jacente ne porte pas — et le brief lui-même l'exige : _« NE JAMAIS inventer une précision qui n'existe pas. »_

> **DÉCISION à trancher :** bandes ordinales (recommandé, honnête, mais moins « premium » visuellement) vs pourcentage (plus vendeur, méthodologiquement fragile). Compromis possible : bande **dominante** + pourcentage en second rang uniquement quand `coverage ≥ 0.8`.

### 6.5 D'où viennent les poids `w_d` ?

| Étape       | Mécanisme                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding  | L'ordre de sélection des valeurs donne un profil de poids initial. **La brique existe déjà** : `rankedCauseIntensity()` (X2) fait exactement ça et est testée.                     |
| Défauts     | Un profil par défaut **publié et modifiable**, jamais caché.                                                                                                                       |
| Réglage     | Écran « ce qui compte pour toi » avec sliders. **Chaque changement reclasse l'univers en direct** — c'est le moment produit le plus fort de Seedow, et le plus difficile à copier. |
| Traçabilité | Chaque version de poids est horodatée (`preference_events` existe déjà) → on sait toujours quel filtre a produit quel classement.                                                  |

### 6.6 Le « Why? » n'est pas un habillage

Pour chaque actif, l'explication liste les dimensions **triées par contribution marginale** `w_d · c_d · s_d / sat`, avec la valeur mesurée, sa source et sa date. Y compris **les contributions négatives** : un actif bien classé dont une dimension est faible doit l'afficher (« frais élevés : 0,58 % — au-dessus du 3ᵉ quartile de l'univers »). Un « Why? » qui ne liste que le positif est un argumentaire de vente — interdit par la promesse de marque.

---

## 7. Asset Intelligence — méthodologie par classe d'actifs

**Règle transversale :** l'objet analysé n'est pas le même selon la classe. Confondre l'analyse d'un ETF et celle d'une entreprise est l'erreur n°1 du secteur (et le brief a raison de l'écrire en majuscules).

### 7.1 ETF / Fonds — le fonds n'est pas une entité, c'est un panier

```
ETF → holdings (datés) → résolution en securities → attributs par émetteur
    → agrégation pondérée → profil d'exposition → satisfaction par dimension
```

- **Rien n'est analysé au niveau du fonds** sauf ce qui est intrinsèque au véhicule : frais (TER), domicile, réplication, encours, liquidité, documents.
- Tout le reste est **dérivé des sous-jacents** : exposition sectorielle, fossile, activité durable, controverses.
- **Couverture obligatoirement affichée** : « calculé sur 92,4 % du fonds au 31/07/2026 ». Une exposition fossile calculée sur 60 % du fonds n'est **pas** une exposition fossile — c'est un minorant.
- 🔴 **Bloqué sur `fund_holdings`.** C'est ici que le chemin critique mord.

### 7.2 Actions — l'entreprise est l'entité

```
Company → activités (répartition du CA) → climat / env / social / gouvernance
        → controverses → trajectoire de transition → alignement
```

- L'unité pertinente est **l'exposition du chiffre d'affaires par activité**, pas un score global. « 18 % du CA en énergies renouvelables » est un fait ; « score environnement 79 » est un jugement de tiers.
- La **transition** (trajectoire, pas photo) est ce qui distingue Seedow d'un screener statique. Elle exige de l'historique → naturellement Premium (§13).
- **Attention :** ouvrir les actions individuelles à des débutants (persona Léa) est un choix produit lourd — concentration, biais de sélection, fiscalité. **DÉCISION :** ouvrir les actions en _exploration/compréhension_ d'abord (« quelles entreprises ton ETF finance »), en _sélection_ seulement ensuite. Cela sert la pédagogie sans pousser au stock-picking.

### 7.3 Obligations — quatre méthodologies, pas une

| Type                           | Objet analysé                         | Ce qui compte                                                                               | Piège à éviter                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Corporate bond**             | Émetteur + instrument                 | Profil de l'émetteur, séniorité, maturité, coupon                                           | Traiter l'obligation comme l'action : ce n'est **pas** le même droit économique                                                                                                                                                                 |
| **Green bond**                 | **L'usage des fonds**, pas l'émetteur | Framework, projets éligibles, second-party opinion, reporting d'impact, allocation          | **Une green bond d'un émetteur très carboné reste une green bond.** Ne pas noter le projet avec le score de l'émetteur — mais **afficher les deux séparément**                                                                                  |
| **Sustainability-linked bond** | **La crédibilité du KPI**             | KPI, SPT, ambition vs trajectoire passée, mécanique de coupon (step-up), date d'observation | Un SLB avec un step-up dérisoire ou une cible déjà atteinte est **structurellement du greenwashing**. Seedow doit savoir le dire — c'est un contenu d'autorité à forte valeur                                                                   |
| **Souverain**                  | L'État                                | Trajectoire d'émissions, politique climatique, **gouvernance/droits humains**               | **Ne jamais appliquer un modèle d'entreprise à un État.** Pas de scope 1/2/3, pas d'EVIC. Les données pertinentes sont publiques (CCNUCC, Banque mondiale, V-Dem) et libres — **excellent rapport valeur/coût, et pas d'accès licencié requis** |

> 💡 **Opportunité tactique :** les souverains et les green bonds s'appuient sur des **données ouvertes**, non bloquées par le verrou d'accès qui pèse sur les holdings d'ETF. Elles peuvent avancer **en parallèle** du déblocage EET, au lieu d'attendre derrière.

### 7.4 Le contrat de provenance (transversal)

Chaque champ affiché porte : **valeur · source · date · méthode · confiance**. Le ledger existe déjà (`data_observations`). Ce qu'il manque n'est pas la table, c'est **le composant UI unique** qui rend ce quintuplet partout, pour que la traçabilité soit un réflexe et pas un effort à chaque écran.

---

## 8. Collection — fonctionnement

### 8.1 Modèle

Une **Collection** est une liste nommée, pondérée et versionnée d'actifs, appartenant à un utilisateur.

- **Poids libres**, saisis par l'utilisateur. Aucune optimisation. Somme ≠ 100 % tolérée à la saisie, signalée, jamais corrigée en silence.
- **Modes de poids** : `equal` (défaut à l'ajout — le plus honnête), `manual`, `amount` (montants → poids dérivés).
- **Versionnée** : chaque modification produit un snapshot. C'est ce qui rend possible « ton argent a changé » (§10) **et** l'historique Premium.
- **Plusieurs collections** par utilisateur (« Mon plan », « À étudier », « Version agressive ») → l'exploration devient sans risque, ce que le portefeuille unique interdit.

### 8.2 Rapport à l'existant

| Existant             | Devenir                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `watchlists`         | **Ancêtre de la collection.** Migration : une watchlist devient une collection en mode `equal`. Ne pas maintenir deux concepts concurrents                                                                                                                                                                                   |
| `portfolios`         | **Conservé intégralement.** Une collection peut être promue en portefeuille (avec montants, valorisation, P&L, objectifs)                                                                                                                                                                                                    |
| `portfolio_holdings` | Structure très proche de `collection_items` — **DÉCISION** : table séparée (plus propre, plus de sécurité) vs `portfolios.is_collection` (moins de code, plus de couplage). **Recommandation : table séparée** — les cycles de vie divergent (une collection est exploratoire et jetable, un portefeuille est un engagement) |

### 8.3 Le vrai risque produit : la page blanche

**C'est le risque n°1 du modèle collection-first, et le brief ne l'adresse pas.** Le portfolio-first avait un avantage énorme : il produisait un résultat complet sans que l'utilisateur ait à savoir quoi que ce soit. Une collection vide face à Léa (27 ans, débutante) est un mur.

Trois mitigations, toutes P0 :

1. **Starter collections** — collections de départ **curées et assumées comme éditoriales** (« Climat, large, frais bas »), explicitement _pas_ optimisées, modifiables dès le premier écran. Un point de départ n'est pas un conseil s'il n'est pas personnalisé et s'il est présenté comme un exemple.
2. **Le PIU pré-trie déjà** — l'utilisateur ne part jamais de 61 000 instruments, mais de sa liste ordonnée.
3. **Feedback immédiat à l'ajout** — dès le 2ᵉ actif : overlap, concentration, exposition agrégée. La collection doit _réagir_, sinon elle n'est qu'une wishlist.

### 8.4 Overlap : la feature la plus sous-estimée de tout le pivot

En mode collection libre, la première erreur d'un débutant est mécanique : ajouter trois ETF World et croire être diversifié. `overlap.ts` **existe déjà** (N3 ✅) et calcule exactement cela :

```
Overlap(a,b)   = Σ_titres min(hₐ(t), h_b(t))
Diversif_vraie = 1 − HHI(exposition agrégée par titre sous-jacent)
```

« Tes 3 ETF sont à 78 % les mêmes entreprises. Ton exposition réelle repose sur 41 sociétés, dont 12 % sur une seule. » — Cette phrase est impossible à produire pour un screener, immédiatement compréhensible, non moralisatrice, et **justifie à elle seule le look-through**. C'est probablement la meilleure démo produit disponible.

⚠️ Elle est, comme le reste, **bloquée sur les holdings**.

---

## 9. Impact Engine — fonctionnement

### 9.1 Chaîne de calcul

```
Collection {(actif, poids)}
   → pour chaque actif : profil d'exposition look-through (§7.1)
   → agrégation pondérée par titre sous-jacent (pas par fonds : la déduplication est le cœur)
   → exposition agrégée { secteur, thème, fossile, activité durable, géographie }
   → métriques de collection + couverture + confiance
```

**Point technique non négociable :** l'agrégation se fait **au niveau du titre sous-jacent**, pas du fonds. Deux ETF détenant tous deux TotalEnergies doivent produire **une** ligne d'exposition consolidée. Agréger au niveau fonds donnerait une fausse diversification — l'erreur exacte que `metrics.ts` commet aujourd'hui (`diversification = 1 − HHI sur poids de fonds`, faiblesse n°2 de votre audit).

### 9.2 Ce qui est publiable, et ce qui ne l'est pas

| Métrique                              | Publiable ? | Condition                                                                                                     |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Exposition sectorielle / géographique | ✅          | Couverture affichée                                                                                           |
| Exposition fossile                    | ✅          | Définition explicite (SIC ? part du CA ? liste d'exclusion ?) + couverture                                    |
| Exposition activité durable           | ⚠️          | Seulement si la donnée de CA existe. **Sinon : ne pas afficher.** C'est le champ le plus greenwashé du marché |
| Concentration / overlap               | ✅          | Le calcul est robuste dès que les holdings existent                                                           |
| Carbone financé (WACI, PCAF)          | ✅          | `carbon-engine.ts` gère déjà les 6 paliers de qualité et sépare les scopes                                    |
| Controverses                          | ✅          | Liste factuelle + source + date, **jamais un score agrégé de controverse**                                    |
| **« Impact profile: 82 »**            | ❌ **NON**  | Voir ci-dessous                                                                                               |

### 9.3 Rejet motivé de l'« Impact profile : 82 »

Le §13 du brief propose un score d'impact de collection. **Je recommande de ne pas le construire**, pour trois raisons cumulées :

1. Il refond en un scalaire des dimensions que le §6 du brief exige de garder séparées. Le brief se contredit lui-même entre son §6 et son §13.
2. Il n'est **pas défendable** : quelle pondération justifie 82 plutôt que 76 ? Aucune, et un investisseur en due diligence le verra en une question (cf. `15_INVESTOR_DUE_DILIGENCE.md`).
3. Il produit exactement le « score sans explication » que le §20 du brief interdit.

**Alternative recommandée :** un **profil**, pas une note — 4 à 6 métriques factuelles côte à côte, chacune avec sa couverture et sa source. C'est plus honnête, plus visuel, plus différenciant, et cela survit à une contestation par un émetteur (CLAUDE.md §1.2). L'`user_alignment`, lui, **peut** être affiché en agrégat : ce n'est pas un jugement de Seedow, c'est le résultat du filtre de l'utilisateur.

> Note : `lib/impact/` (equivalences, narrative, translator, themeBreakdown, portfolioImpact) est déjà écrit et testé. Il change d'**entrée** (collection au lieu de portefeuille optimisé), pas de nature. Réutilisation forte.

---

## 10. What-if Engine — fonctionnement

### 10.1 Question posée

> « Si je remplaçais A par B dans ma collection, qu'est-ce qui change ? »

Pas : « quel est le meilleur actif ? » — cette question n'a pas de réponse et Seedow ne doit jamais faire semblant d'en avoir une.

### 10.2 Fonctionnement

1. **Génération des candidats** — même classe d'actifs, même rôle dans la collection (une substitution doit être _comparable_, sinon la comparaison est un sophisme), éligibles selon les contraintes dures.
2. **Recalcul complet de la collection** avec la substitution.
3. **Diff multi-dimensions** — chaque dimension change de manière indépendante, y compris **dans le mauvais sens**.
4. **Formulation des trade-offs** : ce qui s'améliore **et** ce qui se dégrade, systématiquement, dans la même phrase.

### 10.3 Règle de langage (contractuelle)

| ❌ Interdit                         | ✅ Obligatoire                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| « ETF B est meilleur »              | « ETF B correspond mieux à ce que tu as dit sur le climat (exposition fossile 3,4 % → 1,7 %), et coûte 0,12 pt de frais de plus par an » |
| « Nous recommandons »               | « Voici ce qui change »                                                                                                                  |
| Une seule alternative mise en avant | Plusieurs candidats, tri **par la dimension que l'utilisateur choisit**                                                                  |

**Cette règle n'est pas cosmétique — c'est la frontière réglementaire (§14).** Le moment où le what-if présente **une** alternative comme supérieure est le moment où Seedow bascule dans la recommandation personnalisée.

⚠️ **Conséquence de design :** afficher **au moins deux** alternatives, avec des trade-offs de signes opposés. Une alternative unique = une recommandation, quel que soit le verbe employé.

### 10.4 Réutilisation

`lib/portfolio/tradeoffs.functions.ts`, `consequences.ts`, `plain-language.ts` et `explanation.ts` traitent déjà la formulation de trade-offs en langage clair, avec tests. **La logique de langage est écrite ; c'est le moteur de substitution qui est neuf.**

---

## 11. UX / Information Architecture

### 11.1 Diagnostic de l'IA actuelle

**FACT : 40 routes.** dashboard, discover, portfolio, comparatif, certificat, objectifs, ethi, comprendre, methodologie, cours, communaute, le-fil, observatoire, reveil, vote, wrapped, construire, fonds/$isin, tarifs, aide, profil, reglages… La navigation principale n'expose que 4 destinations (`/le-fil`, `/ethi`, `/profil`, `/reglages`) : **la majorité du produit est inatteignable depuis la navigation**. Il y a plus de surface construite que de surface trouvable — symptôme classique d'un produit dont le centre de gravité n'a jamais été tranché. Le pivot est l'occasion de le trancher.

### 11.2 Challenge de l'IA proposée dans le brief

Le brief propose : HOME · EXPLORE · COLLECTION · IMPACT · IMPROVE · PROFILE · INVEST — et demande explicitement de la challenger. **Trois objections :**

1. **IMPACT ne doit pas être une destination.** L'impact n'est pas un lieu, c'est une **vue de la collection**. Séparer « ma collection » et « son impact » en deux onglets force l'utilisateur à faire le lien lui-même — alors que le lien _est_ le produit. → **Fusionner : COLLECTION contient l'onglet Impact.**
2. **IMPROVE ne doit pas être une destination.** Le what-if est **contextuel** : il naît d'une ligne précise de la collection ou d'une page actif. Un onglet « Improve » global ouvre sur une page vide et cadre Seedow comme optimiseur — le positionnement qu'on quitte. → **Action contextuelle, pas onglet.**
3. **HOME et COLLECTION font doublon en V1.** Tant qu'il n'y a qu'une collection, « Your money » _est_ la collection. → **Fusionner en V1, séparer plus tard si le multi-collections le justifie.**

### 11.3 IA recommandée — 4 destinations

| Destination  | Rôle                                | Contient                                                                                                            |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **EXPLORE**  | Le Personal Investment Universe     | Univers classé, filtres, pages actif, ajout à la collection                                                         |
| **MY MONEY** | La collection et ce qu'elle finance | Composition · Impact · Exposition · Concentration · Controverses · Changements · What-if contextuel                 |
| **PROFILE**  | Ce qui compte pour toi              | Valeurs pondérées (sliders reclassant l'univers en direct), exclusions, contraintes, **historique des préférences** |
| **ETHI**     | Comprendre                          | Assistant, présent partout (`EthiFab` existe déjà)                                                                  |

Contenus (cours, méthodologie, observatoire, communauté, vote) → **hors navigation principale** : accessibles depuis les contextes qui les appellent + SEO public. Cela sert le moat « Autorité » du Moat Blueprint sans encombrer le produit.

`INVEST` n'apparaît **pas** tant que l'infrastructure réglementaire n'existe pas. Un onglet INVEST inactif est une promesse non tenue à chaque session — et, selon sa formulation, un risque de démarchage.

### 11.4 Principes UX (dérivés de vos personas et de la DA existante)

| Principe                                               | Traduction concrète                                                                                                       | Persona servi      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Un chiffre = une source visible                        | Composant unique valeur+source+date, jamais en note de bas de page                                                        | Thomas (sceptique) |
| Un trou = un trou affiché                              | « Non mesuré » en clair, jamais 0, jamais masqué                                                                          | Thomas, Karim      |
| Pas de jargon non défini                               | `useLexicon` existe déjà — l'étendre à toute donnée ESG                                                                   | Léa (débutante)    |
| Pas de « vert = bien »                                 | La DA impose déjà `mint` = positif / `alert` = négatif **réel** : ne pas colorer un actif en vert parce qu'il est « ESG » | Thomas             |
| Pas de mur de tableaux                                 | Une décision par écran ; le détail est déplié, pas imposé                                                                 | Inès (pressée)     |
| Toute complexité a un « ça veut dire quoi pour moi ? » | Pattern obligatoire sur chaque métrique                                                                                   | Léa, Inès          |
| Aucune information par la couleur seule                | Déjà exigé par CLAUDE.md §4 — vaut pour les bandes de match                                                               | Accessibilité      |

### 11.5 Typographie et Match Score

La DA réserve **IBM Plex Mono** aux « données brutes ». Le Match Score n'est **pas** une donnée brute — c'est un dérivé du filtre de l'utilisateur. Le composer en Inter, et réserver le mono aux mesures sourcées (3,2 % fossile, TER 0,20 %, as-of). Ce détail typographique **encode visuellement la distinction fait/jugement** que toute la méthodologie défend. C'est le genre de cohérence qui se remarque sans se voir.

---

## 12. Data architecture

### 12.1 Nouvelles tables (toutes avec RLS — CLAUDE.md §1.4)

| Table                  | Rôle                                                                                     | Clés                                                         | RLS                    |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `user_preferences`     | Préférences versionnées : poids par dimension, exclusions, contraintes, tolérance        | `(user_id, version)`, une active                             | `auth.uid() = user_id` |
| `collections`          | Collection nommée                                                                        | `(id, user_id, name, weight_mode, created_at)`               | `auth.uid() = user_id` |
| `collection_items`     | Ligne pondérée                                                                           | `(collection_id, asset_id, weight_pct, added_at, note)`      | via `collection_id`    |
| `collection_snapshots` | Photo datée pour le diff §16                                                             | `(collection_id, as_of, metrics jsonb, exposures jsonb)`     | via `collection_id`    |
| `match_runs`           | Trace : quel classement, avec quels poids, quelle version de méthodo, quelle date        | `(user_id, prefs_version, methodology_version, computed_at)` | `auth.uid() = user_id` |
| `security_attributes`  | Attributs par titre sous-jacent (activité, CA par activité, controverses, émissions)     | `(security_id, field, as_of)`                                | lecture authentifiée   |
| `asset_exposures`      | Exposition look-through **précalculée** par actif (fossile, thème, secteur) + couverture | `(asset_id, dimension, as_of)`                               | lecture authentifiée   |

> **`match_runs` mérite une attention particulière.** Elle est _la_ pièce défensive du dispositif : elle permet de prouver, a posteriori et pour un utilisateur donné, quel filtre a produit quel classement à quelle date, avec quelle version de méthodologie. C'est un actif juridique (§14), un actif de confiance (§15) et un prérequis du B2B (traçabilité auditable exigée par tout client institutionnel).

### 12.2 Tables existantes — évolution

| Table                               | Action                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `assets`                            | **Peupler `available_eu` et `share_class_of`** (NULL partout, P0 §5.2). Aucune restructuration             |
| `fund_holdings`                     | **La peupler.** Chemin critique. Schéma déjà correct (historisé, sourcé, avec confiance)                   |
| `securities`                        | Se remplit avec les holdings ; devient le pivot de l'agrégation §9.1                                       |
| `data_observations`                 | ✅ Inchangée. **Le ledger de provenance est déjà le bon design** — il faut l'utiliser plus, pas le changer |
| `watchlists`                        | Migrer vers `collections` puis déprécier. Ne pas laisser deux concepts                                     |
| `portfolios` / `portfolio_holdings` | **Conservés.** Ajouter `source_collection_id` pour tracer collection → portefeuille                        |
| `preference_events`                 | ✅ Déjà là — brancher sur le réglage des poids                                                             |
| `asset_score_history`, `alerts`     | ✅ Déjà là — étendre au diff de collection                                                                 |
| `catalog_instruments`               | ✅ Bien isolée. Reste la couche identité ; la promotion vers `assets` reste curée                          |

### 12.3 Précalcul vs calcul à la volée

**DÉCISION importante.** Classer N actifs sur D dimensions pour chaque utilisateur, à chaque changement de poids, en direct, sur Cloudflare Workers (limites de taille et de CPU au bord — CLAUDE.md §8).

Recommandation :

- **Précalculer** `s_d(a)` et `c_d(a)` **par actif** — ils ne dépendent **pas** de l'utilisateur (table `asset_exposures` + vue de satisfaction). Recalcul à l'ingestion, pas à la requête.
- **Calculer à la volée** l'agrégation `Σ w·c·s` — c'est un produit scalaire sur quelques dizaines de lignes : trivial, y compris côté client, ce qui rend le slider **instantané**.

Cette découpe est ce qui rend possible le « je bouge le curseur et l'univers se reclasse sous mes yeux » — le moment produit décrit en §6.5. Elle est aussi ce qui garde le bundle Edge léger.

---

## 13. Business model

| Palier      | Contenu                                                                                                                                                            | Défendabilité                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **FREE**    | Explore, page actif avec sources, PIU classé, 1 collection, impact de base, alertes de base                                                                        | Acquisition + SEO + autorité. C'est le carburant du moat, pas une perte                                                                |
| **PREMIUM** | What-if, **historique** (« ton exposition sur 12 mois »), collections multiples, alertes avancées, personnalisation fine des poids, exports/rapports, comparaisons | ⚠️ Le seul vrai différenciateur payant est **l'historique** : il ne se copie pas, il s'accumule. Une V1 sans historique a peu à vendre |
| **INVEST**  | Exécution via partenaire                                                                                                                                           | ❌ Hors périmètre tant que le cadre réglementaire n'est pas posé (§14). **Ne pas afficher**                                            |
| **B2B**     | Seedow Impact Intelligence API                                                                                                                                     | 🎯 **Le serveur MCP existe déjà** (`lib/mcp/`, `routes/mcp.ts`). C'est une amorce d'API produit sérieuse et sous-exploitée             |

**Trois avertissements :**

1. **Le paywall ne doit jamais tomber sur la transparence.** Cacher une source, une date ou une couverture derrière Premium détruirait la promesse (CLAUDE.md §1.2). Le paywall tombe sur la **profondeur temporelle** et l'**outillage**, jamais sur l'honnêteté.
2. **Aucun dark pattern** (§1.5) : pas de pré-cases, pas d'urgence fabriquée, désabonnement au moins aussi simple que l'abonnement. Cela vise directement Inès.
3. **Le B2B est plus cohérent avec ce pivot que le B2C payant.** Un « intelligence layer » explicable, traçable et versionné (`match_runs`, `data_observations`) est exactement ce qu'un wealth manager doit produire pour ses obligations de préférences de durabilité (MiFID II). **HYPOTHÈSE forte à tester tôt** : le B2B pourrait être le vrai revenu, le B2C la vitrine d'autorité — ce qui est cohérent avec la thèse « Socle + Autorité » de votre Moat Blueprint.

---

## 14. Regulatory considerations

> ⚠️ **Cette section signale des risques. Elle ne remplace pas un avis juridique — qui est un prérequis P0, pas une formalité de fin de parcours.**

### 14.1 Le risque central : la recommandation personnalisée (MiFID II)

Le pivot est présenté comme réduisant l'exposition réglementaire. **Sur un point précis, il l'augmente.**

Sous MiFID II, une **recommandation personnalisée** est une recommandation portant sur **un instrument financier déterminé**, adressée à une personne **en sa qualité d'investisseur**, et **présentée comme adaptée à cette personne**. Un score de correspondance personnalisé, affiché sur un ISIN nommé, dérivé du profil de l'utilisateur, **coche les trois critères**. Un portefeuille diversifié généré automatiquement — paradoxalement — en cochait certains moins nettement.

**Facteurs qui éloignent du conseil (à construire délibérément dans le produit) :**

| Facteur                                 | Mise en œuvre                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **L'utilisateur fixe les critères**     | Poids réglables et visibles (§6.5). Seedow exécute **son** filtre → posture d'**outil**, pas d'avis                                   |
| **Aucune notion de « adapté à toi »**   | Bannir « recommandé », « meilleur », « adapté », « tu devrais ». Le vocabulaire est un contrôle de conformité, pas un choix éditorial |
| **Résultats multiples, jamais un seul** | Une liste classée, ≥ 2 alternatives en what-if (§10.3)                                                                                |
| **Aucune évaluation d'adéquation**      | Ne jamais dire qu'un actif convient au profil de l'utilisateur                                                                        |
| **Transparence de la méthode**          | Méthodologie publiée et versionnée — position de screener, pas de conseiller                                                          |
| **Traçabilité**                         | `match_runs` prouve que le classement dérive des critères déclarés par l'utilisateur                                                  |

> **Le §11 du brief affiche « Match with you — 94% ».** La formulation « **with you** » est précisément celle qui suggère l'adéquation personnelle. **Préférer un cadrage sur les critères** : _« Correspond à 5 de tes 6 critères »_ ou _« Répond à : climat · hors fossiles · frais bas »_. Le fond est identique, l'exposition juridique ne l'est pas. **À faire valider mot à mot par un juriste** — c'est probablement la question juridique la plus rentable à poser.

### 14.2 Autres points à valider

| Sujet                                                             | Risque                                                                                                                                                                                                                                                                                    | Priorité                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Statut réglementaire** (FR : CIF / RTO ; agrément si exécution) | Détermine ce que le produit peut dire et faire                                                                                                                                                                                                                                            | **P0, avant l'écriture des textes d'UI**               |
| **SFDR & greenwashing**                                           | Publier des métriques d'impact expose à la contestation. Le brief exige déjà le droit de réponse (CLAUDE.md §1.2) — **le formaliser en processus**, pas seulement en principe                                                                                                             | P0                                                     |
| **Dénomination des fonds (guidelines ESMA)**                      | Ne pas nommer une collection d'une manière qui suggère un label ou un caractère durable non démontré                                                                                                                                                                                      | P1                                                     |
| **Licences de données**                                           | 🔴 **Critique.** MSCI, EET, et tout flux licencié encadrent strictement la **redistribution**. Afficher une donnée licenciée à un utilisateur final, et _a fortiori_ l'exposer via une API B2B, exige une licence adaptée. **Le business model B2B (§13) dépend entièrement de ce point** | **P0 — à instruire en même temps que la décision EET** |
| **ToS / robots**                                                  | La voie « navigateur sans tête » sur la SPA d'un tiers est une posture ToS lourde, à acter explicitement. Le registry code déjà `robots_allowed` et `terms_url` — le respecter                                                                                                            | P0                                                     |
| **Données personnelles (RGPD)**                                   | Les préférences de valeurs peuvent révéler des **convictions politiques, religieuses ou philosophiques** → potentiellement des données sensibles (art. 9). Base légale, minimisation, durée                                                                                               | **P0 — souvent oublié, sérieux**                       |
| **Démarchage**                                                    | Un bouton INVEST vers un partenaire peut relever du démarchage/apport d'affaires                                                                                                                                                                                                          | P1                                                     |
| **Publicité / communication à caractère promotionnel**            | Le Match Score affiché dans un contexte marketing change de qualification                                                                                                                                                                                                                 | P1                                                     |

### 14.3 Recommandation de séquencement juridique

**Ne pas écrire les textes d'interface du Match Score avant l'avis juridique.** Le vocabulaire _est_ la surface de risque. Réécrire du copy après coup est peu coûteux ; réécrire une architecture de produit qui a été conçue autour du mauvais vocabulaire l'est beaucoup plus.

---

## 15. Moat — ce qui peut réellement devenir défendable

### 15.1 Ce qui n'est pas un moat

| Prétendant                         | Verdict                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Un screener ESG avec filtres       | ❌ **Commoditisé.** justETF, Curvo, screeners de brokers, comparateurs. Un week-end de travail pour un concurrent |
| L'accès à une API ESG              | ❌ Le brief le dit lui-même. Tout le monde peut acheter la même                                                   |
| Le Match Score en tant que formule | ❌ **Copiable en une lecture.** Pire : le publier (ce que l'honnêteté exige) le rend trivialement copiable        |
| L'UI                               | ❌ Copiable en un sprint                                                                                          |
| Le moteur d'optimisation           | ❌ Bien construit, mais c'est de la littérature académique publique                                               |

### 15.2 Ce qui est un moat

| Actif                                   | Pourquoi il compose                                                                                                                                                                                     | État                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Le look-through réconcilié**          | Ingérer, parser, normaliser et **réconcilier** les compositions de centaines de fonds vers des identités de titres est un travail long, ingrat, sans raccourci — et qui recommence à chaque publication | ❌ **Bloqué**                             |
| **L'historique**                        | Le seul actif qui ne se rattrape pas : un concurrent lancé dans 18 mois n'aura pas 18 mois d'historique. `asset_score_history` existe déjà                                                              | ⚠️ Amorcé                                 |
| **Le ledger de provenance**             | `data_observations` (valeur + source + date + confiance + méthode + validation) au champ. **Très peu de concurrents ont ça** — et il est impossible à reconstituer rétroactivement                      | ✅ **Construit, sous-exploité**           |
| **La classification SFDR-indépendante** | `sustainability-classification.ts` survit au changement de régime SFDR — pendant que les acteurs indexés sur l'article SFDR devront tout refaire. **Pari déjà pris, et il est bon**                     | ✅ Construit                              |
| **L'autorité**                          | Un acteur qui vend des produits ne peut pas être le tiers neutre. Terrain structurellement inaccessible aux incumbents                                                                                  | ⚠️ Amorcé (`observatoire`, `esg-preview`) |
| **La boucle de demande**                | `fund_requests` → priorisation d'ingestion : les utilisateurs disent où creuser                                                                                                                         | ✅ Table présente, boucle non fermée      |

### 15.3 Le verdict honnête

> **Le pivot vers le Personal Investment Universe ne crée pas de moat par lui-même. Il crée un produit qui _rend le moat visible et utile_ — à condition que la donnée de look-through existe.**

Sans les holdings, le PIU est un screener ESG mieux dessiné que les autres : un bon produit, **non défendable**, sur un marché où le coût d'acquisition est élevé et le prix tend vers zéro. C'est le scénario d'échec le plus probable, et il n'est pas causé par de mauvaises décisions produit — il est causé par le fait de construire l'UI avant de débloquer la donnée.

Avec les holdings, chaque affirmation devient impossible à copier sans refaire le même travail : _« ton argent finance 412 entreprises, dont 3,2 % dans les fossiles, et voici lesquelles — au 31/07/2026, source X, sur 92,4 % du fonds »_.

**La question stratégique n'est donc pas « faut-il pivoter ? ». C'est « sommes-nous prêts à payer pour la donnée qui rend ce pivot défendable ? ».** Si la réponse est non, il faut le savoir avant d'écrire l'UI — parce qu'alors le produit à construire n'est pas celui du brief.

### 15.4 Réponse directe à la question du §22 : « Est-ce que cette approche peut créer une entreprise défendable ? »

**Conditionnellement oui**, avec trois « non » francs sur des points précis :

- ❌ **Non**, si le Match Score est le produit. Il est copiable, et l'honnêteté oblige à le publier.
- ❌ **Non**, si le look-through reste bloqué. Sans lui, c'est un screener de plus.
- ❌ **Non**, si l'univers reste à ~58 lignes. Un univers « personnel » qui ne contient jamais le fonds que l'utilisateur possède déjà n'a aucune crédibilité — et c'est le premier geste de tout utilisateur qui teste le produit.
- ✅ **Oui**, si Seedow devient l'endroit où l'on peut vérifier, sourcer et suivre dans le temps ce que chaque euro finance — et si cette capacité est ensuite vendue en B2B à ceux qui en ont l'obligation réglementaire.

---

## 16. Roadmap

> Règle : **on ne construit pas l'UI d'une promesse dont la donnée est bloquée.** Le P0 contient donc une décision d'acquisition avant tout écran.

### P0 — Rendre le pivot possible et honnête

| #      | Chantier                                                                                                                                | Pourquoi maintenant                                                                                                              | Bloqué par                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **0**  | 🔴 **Trancher l'acquisition des holdings** (EET licencié vs navigateur sans tête vs autre)                                              | **Chemin critique de toute la vision.** Tout le §7-§10 en dépend                                                                 | Décision + budget + juridique |
| **0b** | 🔴 **Avis juridique** sur le Match Score, le statut réglementaire, la licence de redistribution, le RGPD art. 9                         | Le vocabulaire d'UI en dépend                                                                                                    | Externe                       |
| 1      | **Préférences de 1re classe** : `user_preferences` pondérées + versionnées                                                              | Rien n'est personnel sans elles. **Non bloqué**                                                                                  | —                             |
| 2      | **Qualifier l'univers** : peupler `available_eu`, `share_class_of`, dédupliquer                                                         | Un univers avec des fonds indisponibles ou triplés tue la confiance en une session. **Non bloqué**                               | —                             |
| 3      | **Provenance ESG visible** : `esg_score_source` affiché partout, « estimé » ≠ « mesuré »                                                | CLAUDE.md §1.2. Prérequis d'honnêteté du Match Score. Ticket N1 déjà à moitié fait                                               | —                             |
| 4      | **Matching engine** (`lib/matching/`) : dimensions séparées, satisfaction, couverture, agrégation, explication. **Pur, testé, sans UI** | Peut être écrit **et testé** avant les holdings, sur les dimensions déjà couvertes (cost, risk_fit, climate partiel, disclosure) | —                             |
| 5      | **Collections** : tables + UI d'ajout + poids + feedback immédiat                                                                       | Cœur du nouveau parcours. Migration `watchlists`                                                                                 | —                             |
| 6      | **Explore = PIU** : Discover reclassé par le score, avec « pourquoi » décomposé                                                         | Premier écran où la nouvelle promesse devient tangible                                                                           | 1, 4                          |

### P1 — Tenir la promesse complète

| #   | Chantier                                                                                    | Bloqué par |
| --- | ------------------------------------------------------------------------------------------- | ---------- |
| 7   | **Look-through** : `securities` réconciliés, `asset_exposures` précalculées                 | **P0-0**   |
| 8   | **Asset Detail Page** complète : « what it owns », « what your money finances »             | 7          |
| 9   | **Collection Impact** : agrégation par titre sous-jacent + couverture                       | 7          |
| 10  | **Overlap / concentration** : `overlap.ts` branché — _la_ démo                              | 7          |
| 11  | **What-if** : substitution + trade-offs bidirectionnels                                     | 4, 9       |
| 12  | **Change feed** : `collection_snapshots` + diff + « ton argent a changé »                   | 5, 9       |
| 13  | **Refonte IA** : 4 destinations, redirections propres                                       | 5, 6       |
| 14  | **Portefeuille en aval** : `source_collection_id`, optimisation présentée comme optionnelle | 5          |
| 15  | **Élargir l'univers** vers 150+ lignes réellement sourcées (ticket B1 du Moat Blueprint)    | P0-0       |

### P2 — Étendre et monétiser

| #   | Chantier                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------- |
| 16  | **Classes d'actifs** : souverains et green bonds d'abord (**données ouvertes, non bloquées**), puis actions, puis corporate/SLB |
| 17  | **Premium** : historique, collections multiples, what-if avancé, rapports                                                       |
| 18  | **B2B** : Impact Intelligence API sur la base du serveur MCP existant — **sous réserve de licence de redistribution**           |
| 19  | **Invest** : uniquement une fois le cadre réglementaire posé                                                                    |
| 20  | **Optimisation optionnelle** : `engine.ts` / `riskparity.ts` reviennent comme feature avancée                                   |

---

## 17. Exact implementation plan

> Ordre d'exécution. Chaque étape a un critère de « done ». **On ne passe pas à la suivante sans lui.**
> Aucune étape ne construit l'UI d'une promesse dont la donnée n'est pas là.

### Étape 0 — Décisions (aucun code)

|                      |                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Faire**            | Trancher l'acquisition des holdings. Lancer l'avis juridique (§14). Décider bandes vs pourcentage (§6.4). Décider table `collections` séparée vs flag sur `portfolios` (§8.2). |
| **Done**             | Les quatre décisions sont écrites, datées, et consignées dans `CLAUDE.md`.                                                                                                     |
| **Pourquoi d'abord** | Les étapes 4 à 9 changent de forme selon ces réponses. Les prendre après, c'est refaire.                                                                                       |

### Étape 1 — Aligner la mémoire projet

|                  |                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Faire**        | Mettre à jour `CLAUDE.md` : nouvelle vision, arborescence réelle (40 routes, pas celle documentée), §7 Roadmap rempli. Verser ce document dans `docs/`.                                                                        |
| **Done**         | `CLAUDE.md` décrit le produit qu'on construit, pas celui qu'on construisait.                                                                                                                                                   |
| **Pourquoi ici** | `CLAUDE.md` prime sur l'improvisation (son propre §0). Le laisser décrire l'ancien modèle garantit que chaque contributeur — humain ou IA — repart dans la mauvaise direction. **Coût : une heure. Bénéfice : tout le reste.** |

### Étape 2 — `user_preferences` (non bloqué)

|           |                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Faire** | Migration (RLS §1.4) + `lib/preferences/` (lecture, écriture, versionnage, défauts publiés) + `usePreferences`. Brancher `preference_events`.    |
| **Done**  | Un utilisateur a des poids de dimensions persistés, versionnés, modifiables ; l'ancienne dérivation depuis `portfolios` continue de fonctionner. |
| **Tests** | Défauts, bornes, versionnage, RLS.                                                                                                               |

### Étape 3 — Qualifier l'univers (non bloqué)

|                  |                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire**        | Peupler `available_eu`, `share_class_of` sur les lignes existantes, à partir de sources vérifiables. Marquer `NULL` (= inconnu) ce qui n'est pas vérifié — **jamais deviné**. |
| **Done**         | Toute ligne d'`assets` a une disponibilité vérifiée ou explicitement inconnue ; aucune share-class dupliquée non signalée.                                                    |
| **Pourquoi ici** | Ça conditionne l'éligibilité (§5.2), donc le contenu de tous les écrans suivants.                                                                                             |

### Étape 4 — Matching engine, pur et testé (non bloqué)

|                  |                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire**        | `lib/matching/` : `dimensions.ts` (registre : id, forme, seuils, **origine et version des seuils**), `satisfaction.ts`, `coverage.ts`, `aggregate.ts`, `explain.ts`. **Fonctions pures. Zéro I/O. Zéro UI.** Calibrer les bornes sur la distribution réelle de l'univers, pas sur des chiffres ronds. |
| **Done**         | Couverture de tests complète (CLAUDE.md §8 exige un test pour toute logique métier). Un actif à `coverage < 0.5` ne renvoie **pas** de score mais un motif. Aucun nombre magique non documenté.                                                                                                       |
| **Pourquoi ici** | C'est le cœur intellectuel du pivot, il est écrivable **aujourd'hui**, sur les dimensions déjà couvertes, et il ne dépend d'aucune UI.                                                                                                                                                                |

### Étape 5 — Provenance visible

|                                  |                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire**                        | Un composant unique `<SourcedValue value source asOf confidence coverage />`. Le déployer dans `discover/`, `portfolio/`, `impact/`, `fonds.$isin`. Terminer le ticket N1. |
| **Done**                         | Aucun score affiché sans sa provenance. Un `esg_score` `seedow-internal-v1` est visiblement estimé.                                                                        |
| **Pourquoi avant l'UI de match** | Afficher un match construit sur des estimations non signalées violerait §1.2/§1.3 dès le premier écran.                                                                    |

### Étape 6 — Collections

|           |                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | Migrations `collections` / `collection_items` (RLS). `lib/collections/`. UI : ajouter, pondérer, renommer. Migration `watchlists` → collection `equal`. Starter collections éditoriales (§8.3). |
| **Done**  | Un utilisateur construit une collection pondérée sans passer par l'optimiseur ; sa watchlist est reprise ; il n'affronte jamais une page blanche.                                               |

### Étape 7 — Explore devient le PIU

|           |                                                                                                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | Brancher matching + préférences dans `useAssetUniverse`. Tri par correspondance. Carte d'actif avec bande de match + « pourquoi » décomposé. Sliders de préférences qui reclassent **en direct**. Précalcul `s_d`/`c_d` côté serveur, agrégation côté client (§12.3). |
| **Done**  | Deux utilisateurs aux préférences opposées voient deux univers différents en composition **et** en ordre. Chaque rang est explicable, contributions négatives comprises. Le compteur affiche toujours son dénominateur.                                               |
| **Note**  | 🎯 **C'est le premier moment où le pivot est visible par un utilisateur.** C'est aussi la démo à montrer avant d'aller plus loin.                                                                                                                                     |

### Étape 8 — 🔴 Point de contrôle : les holdings

|                 |                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire**       | Exécuter la décision de l'Étape 0. Alimenter `fund_holdings`, réconcilier `securities`, précalculer `asset_exposures`.                                                                                                    |
| **Done**        | Le look-through existe sur l'univers cœur, daté, sourcé, avec une couverture affichée par fonds.                                                                                                                          |
| **Si non fait** | **Arrêter le plan ici et le dire.** Les étapes 9 à 12 produiraient des écrans qui promettent des chiffres que la donnée ne porte pas. Mieux vaut un produit qui s'arrête à l'étape 7 et le dit qu'un produit qui invente. |

### Étape 9 — Asset Intelligence (ETF)

|           |                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | Refonte de la page actif : « what it owns », « what your money finances », top contributeurs d'exposition, couverture, sources.                               |
| **Done**  | « Cet ETF contient N entreprises, ton exposition indirecte aux fossiles est de X %, calculée sur Y % du fonds au JJ/MM/AAAA, source Z » — vrai, sourcé, daté. |

### Étape 10 — Collection Impact + Overlap

|           |                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | Agrégation look-through par titre sous-jacent (§9.1). Brancher `overlap.ts`. Remplacer `diversification = 1 − HHI(poids de fonds)` par le HHI sur exposition agrégée (corrige la faiblesse n°2 de votre audit). |
| **Done**  | « Tes 3 ETF sont à 78 % les mêmes entreprises » s'affiche, avec le détail. **Profil d'impact, pas note d'impact** (§9.3).                                                                                       |

### Étape 11 — What-if

|           |                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | `lib/whatif/` : candidats comparables, recalcul, diff multi-dimensions, formulation bidirectionnelle. Réutiliser `plain-language.ts` / `consequences.ts`. |
| **Done**  | Aucune sortie ne contient « meilleur ». Toute comparaison affiche au moins un gain **et** un coût. Minimum deux alternatives (§10.3).                     |

### Étape 12 — Change feed

|           |                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Faire** | `collection_snapshots` + moteur de diff + intégration `le-fil` / `alerts` / notifications.                                          |
| **Done**  | « Ton exposition fossile 3,4 % → 3,0 % » avec **la cause** (holdings mis à jour au JJ/MM, source), jamais un diff sans explication. |

### Étape 13 — Refonte IA

|           |                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| **Faire** | 4 destinations (§11.3). Redirections des anciennes routes. Contenus hors nav principale, gardés pour le SEO/autorité. |
| **Done**  | Aucune route orpheline, aucun lien mort, l'ancien parcours reste accessible pendant la transition.                    |

### Étape 14 — Le portefeuille en aval

|           |                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| **Faire** | `portfolios.source_collection_id`. Repositionner l'optimisation comme action optionnelle depuis une collection.    |
| **Done**  | **Aucune capacité existante n'est perdue** (§15 du brief) ; le parcours par défaut ne passe plus par l'optimiseur. |

---

### Ce que ce plan ne fait jamais

1. **Il ne supprime rien** du moteur de portefeuille (brief §15).
2. **Il ne réécrit pas le Data Engine** (brief §23) — il l'utilise davantage.
3. **Il ne construit aucun écran** promettant une donnée absente (CLAUDE.md §1.3).
4. **Il ne fusionne jamais** ESG risk / impact / alignment / SFDR (brief §6).
5. **Il n'affiche jamais** un score sans sa provenance et sa couverture (CLAUDE.md §1.2).

---

## Annexe A — Ce qu'on gagne, ce qu'on perd

|                                  | Portfolio-first (actuel)                | Universe-first (cible)                                                                                         |
| -------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Personnalisation ressentie**   | ❌ Quasi nulle (audit, faiblesse n°6)   | ✅ Centrale et visible                                                                                         |
| **Time-to-value**                | ✅ Un portefeuille en 4 questions       | ⚠️ Plus lent — **risque produit réel** (Inès décroche)                                                         |
| **Agentivité utilisateur**       | ❌ Le système décide                    | ✅ L'utilisateur décide                                                                                        |
| **Charge cognitive**             | ✅ Faible                               | ⚠️ Plus élevée — mitigée par PIU + starters                                                                    |
| **Exposition « conseil » MiFID** | ⚠️ Construction automatique             | ⚠️ **Déplacée, pas supprimée** : le score personnalisé sur un ISIN nommé est une autre forme de risque (§14.1) |
| **Exigence en données**          | ⚠️ Scores fonds agrégés                 | 🔴 **Nettement supérieure** : look-through obligatoire                                                         |
| **Défendabilité**                | ⚠️ Algorithme (public)                  | ✅ Donnée + provenance + historique — **si débloqués**                                                         |
| **Rétention**                    | ⚠️ Valorisation P&L (marchandisée)      | ✅ « Ton argent a changé » (propriétaire)                                                                      |
| **Cohérence des choix**          | ✅ Garantie par l'optimiseur            | ❌ **Pas garantie** — d'où l'importance de l'overlap (§8.4)                                                    |
| **Chemin vers le revenu**        | ⚠️ AUM, lointain                        | ✅ Premium + B2B, plus proche                                                                                  |
| **Marché adressable**            | ⚠️ Ceux qui veulent investir maintenant | ✅ + ceux qui veulent **comprendre** (bien plus nombreux)                                                      |

**Ce qu'on perd vraiment, et qu'il faut assumer :** la garantie de cohérence du résultat. Un optimiseur ne produit jamais une allocation absurde ; un utilisateur libre, si. Seedow doit donc devenir excellent à **signaler** l'incohérence (overlap, concentration, absence de diversification) sans jamais **corriger** à la place de l'utilisateur. C'est plus dur à faire qu'un optimiseur — et c'est aussi ce qui rend le produit intéressant.

---

## Annexe B — Les cinq risques majeurs

| #   | Risque                                                              | Type            | Gravité         | Mitigation                                                                                                     |
| --- | ------------------------------------------------------------------- | --------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | **Le look-through ne se débloque pas** → PIU = screener commoditisé | Business / Data | 🔴 **Critique** | Trancher la décision EET **avant** l'UI. Étape 8 est un point de contrôle explicite : on s'arrête et on le dit |
| 2   | **Le Match Score est requalifié en conseil**                        | Réglementaire   | 🔴 **Critique** | Poids utilisateur, vocabulaire validé juridiquement, ≥2 alternatives, `match_runs` traçables                   |
| 3   | **La page blanche** : l'utilisateur ne sait pas quoi choisir        | UX              | 🟠 Élevée       | Starters éditoriaux, PIU pré-trié, feedback dès le 2ᵉ actif                                                    |
| 4   | **Fausse précision** : « 94 % » sur des intrants estimés            | Méthodologique  | 🟠 Élevée       | Bandes plutôt que pourcentages, refus de scorer sous couverture 50 %, provenance partout                       |
| 5   | **Univers trop étroit** : le fonds de l'utilisateur n'y est jamais  | Produit         | 🟠 Élevée       | Objectif 150+ chiffré ; `fund_requests` boucle la demande sur l'ingestion                                      |

---

_Document produit à partir de l'inspection du repo `amirRbh/seedow` (branche `claude/seedow-product-architecture-lk306f`, HEAD `3ecb32e`) : 78 migrations Supabase, `src/lib/` (portfolio, esg, data-engine, discover, impact, market, ethi, mcp), 40 routes, 82 fichiers de tests, et les documents `docs/methodologie-v2.md`, `docs/esg-sources.md`, `docs/n2-holdings-ingestion.md`, `docs/seedow-company-dossier/MOAT_BLUEPRINT.md`._

_Aucun code produit n'a été modifié (consigne §25)._
