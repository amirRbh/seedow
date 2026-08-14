# 11 — ESG / Méthodologie (revue approfondie du code)

> Source de vérité : `src/lib/portfolio/{engine,markowitz,metrics,types}.ts` et `src/lib/esg/{benchmark,transparency,carbon}.ts`. Objectif de la revue : _« Seedow peut-il défendre méthodologiquement chacun de ses choix ? »_

## Pipeline de construction (FACT — `engine.ts`, méthodo v1.2)

1. **Exclusions dures** : retire tout actif portant un secteur exclu (`fossiles, armes, tabac, jeux, animaux, fast-fashion`).
2. **Best-in-class ESG** : garde le **top 50 %** (split médian) par classe d'actif ; classes ≤ 3 actifs conservées entières (évite d'assécher une classe fine).
3. **Best-in-class carbone (v1.2)** : écarte le **tiers le plus intensif (WACI)** _parmi les actifs mesurés seulement_ — un actif sans donnée n'est jamais jugé (pas de chiffre inventé).
4. **Ajustement de conviction sur μ** : les causes inclinent les rendements attendus (`applyConvictionAdjustment`), puis **préférence carbone** (`applyCarbonPreference` vs ACWI 115).
5. **Optimisation Markowitz (QP, `quadprog`)** : max μᵀw − (λ/2)wᵀΣw sous contraintes : Σw=1, w≥0, **w ≤ 25 %** (`MAX_SINGLE_WEIGHT`), bornes par classe selon le risque, **ESG portefeuille ≥ 70** (`MIN_PORTFOLIO_ESG`, contrainte _souple_ : relâchée si infaisable, avec drapeau).
6. **Métriques** : ESG composite pondéré par piliers (E/S/G, défaut 40/40/20, inclinés par causes), WACI pondéré + **couverture**, diversification (1−HHI), Sharpe.

**Filets de sécurité** (FACT) : filtre anti-poussière (<0,1 %), garantie ≥ 3 positions (sinon repli equal-weight par classe), fallback covariance = volatilité² si sous-matrice absente. → Robustesse d'ingénierie sérieuse.

## Transparence (FACT — `transparency.ts`)

- **DataCoverage** : `complete / partial / estimated` (piliers absents ⇒ scores E/S/G dérivés du global ⇒ « estimated »).
- **Greenwashing** : heuristique `low/medium/high` avec **raisons nommées** (art9_low_esg, sfdr_no_exclusions, green_theme_low_climate, claims_on_estimated_data…). Bande de tolérance autour des seuils (pas d'effet de falaise), bornage [0..10], neutralisation des SFDR hors {6,8,9}. **Ce n'est pas un verdict — un drapeau « à vérifier ».**

## Benchmarks carbone (FACT — `benchmark.ts`)

- ACWI **WACI = 115 tCO₂e/M$** (MSCI ACWI Climate Indexes Report, as of 2026-06-30) — **vérifié, sourcé, daté**. ESG World 85 ; Paris-Aligned 55.
- **Faiblesse assumée** : bond benchmark 130 = _« estimation indicative »_ (pas de source primaire) — honnêtement signalé dans le code.

## Forces méthodologiques

- **Transparence radicale** codée en dur (coverage, floor relâché, pas de CO₂ inventé — #98/#99). Rare et défendable.
- **Séparation propre** logique/UI, **testée** (`__tests__/markowitz, engine, metrics, plain-language`).
- **Comparaison homogène** (benchmark composite aligné sur la compo réelle du portefeuille — actions vs ACWI, obligations vs Global Aggregate).

## Faiblesses / biais / risques (l'analyse honnête)

1. **`expected_return` et `volatility` sont des _seeds_** portés par les actifs, pas ré-estimés en continu depuis les prix live. → Le Markowitz optimise sur des μ potentiellement statiques/arbitraires. **C'est la faiblesse méthodologique n°1** : un portefeuille « optimisé » sur des μ à la main n'est pas défendable devant un analyste exigeant. _(FACT — `engine.ts` lit `a.expected_return`.)_
2. **Univers étroit (~58 actifs)** → best-in-class « top 50 % » sur des classes fines a peu de pouvoir discriminant ; risque de portefeuilles quasi identiques entre utilisateurs.
3. **Dépendance à SFDR (articles 6/8/9)** : l'heuristique greenwashing s'y indexe — or **SFDR 2.0 (COM 2025/841) pivote vers des labels** → refonte nécessaire (`19`).
4. **Données ESG mono-source / hétérogènes** : `esg_score_source` variable (MSCI, Sustainalytics, Yahoo, manual). Mélanger des échelles de fournisseurs différents sans réconciliation = biais silencieux.
5. **Couverture carbone partielle** : WACI seulement sur les actifs mesurés → un portefeuille peut afficher « moins intensif » avec une couverture faible. Le code expose `waci_coverage` (bien), mais l'UX doit l'imposer.
6. **Best-in-class ≠ impact réel** : sélectionner de « bons élèves » cotés ne finance pas de nouveaux projets verts (biais classique de l'ISR). Seedow l'atténue (#98 suppression du « CO₂ évité ») — à tenir.

## Méthodologie cible plus robuste (recommandée)

1. **Estimer μ/Σ à partir des prix ingérés** (déjà en base : `asset_prices`, `asset_covariance`) plutôt que des seeds — ou assumer explicitement une allocation _règle-based_ (pas « optimisée ») pour ne pas sur-promettre.
2. **Multi-fournisseurs réconciliés** avec provenance et date par champ (le data-engine le permet).
3. **Découpler la classification durable de SFDR** : critères propres (exclusions + intensité carbone + trajectoire température) robustes au changement réglementaire.
4. **Imposer la couverture** : ne pas afficher une métrique carbone sous un seuil de couverture, ou l'afficher grisée + « données partielles ».

**Verdict** : la _transparence_ est excellente et sincère ; la _rigueur d'optimisation_ (μ statiques, univers étroit, mono-source) est le maillon faible. Seedow peut défendre sa **posture** ; il doit muscler ses **estimations** pour défendre chaque **allocation**.
