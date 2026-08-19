# Méthodologie Seedow V2 — audit du cœur & feuille de route

> Document méthodologique propriétaire, versionné et auditable. Il couvre **uniquement** les 3 briques du cœur intellectuel de Seedow : construction de portefeuille, méthodologie ESG, univers d'investissement. Il prime sur l'improvisation : en cas de doute méthodologique, on revient ici.
>
> Statut : **audit initial + cible V2 + roadmap d'exécution.** À maintenir à jour à chaque décision structurante.

---

## 0. Résumé exécutif

**Le paradoxe Seedow : l'ingénierie est en avance sur les données.** Le pipeline algorithmique (moteur de portefeuille, modèle de risque shrinké, moteur carbone PCAF, score ESG SFDR-indépendant) est de qualité production — déterministe, versionné, testé. Mais il tourne sur des **intrants majoritairement estimés maison ou déclaratifs**, présentés au même rang que des données mesurées. Le chantier prioritaire n'est **pas** algorithmique, il est **data + traçabilité**.

| Brique                    | Note actuelle | Cible V2 |
| ------------------------- | ------------- | -------- |
| Méthodologie portefeuille | 6/10          | 8/10     |
| Méthodologie ESG          | 4/10          | 8/10     |
| Univers d'investissement  | 4/10          | 8/10     |
| Robustesse globale        | 5/10          | 8/10     |

---

## 1. Reconstruction du pipeline actuel

### 1.1 Onboarding → paramètres moteur (`src/lib/onboarding/params.ts`)

- 4 questions : `values` (causes), `exclusions`, `objective`, `amount`.
- `objective` → **4 couples (risque, horizon) figés** : retraite `0.13/25`, maison `0.10/8`, court `0.06/2`, épargne `0.09/10`.
- Toutes les causes reçoivent la **même intensité `0.7`** (aucun classement relatif).
- Le risque est déduit **du but, jamais de la tolérance/capacité au risque déclarée**.

### 1.2 Moteur (`src/lib/portfolio/engine.ts`)

1. **Exclusions** (dur).
2. **Best-in-class ESG** : retire le quart ESG le plus bas par classe (≤5 titres : gardé).
3. **Best-in-class carbone** : retire le tiers WACI le plus sale par classe parmi les mesurés (≤3 mesurés : gardé).
4. **Data quality** : classe (`full`≥252 obs / `partial`≥40 / `insufficient`) puis **ancre** le μ des non-`full` sur la médiane des pairs `full` de classe.
5. **Tilts μ** : conviction (±1,5 %) puis carbone (±1,5 %).
6. **QP Markowitz** : `max μᵀw − (λ/2)wᵀΣw`, `λ=max(2, 0.6/risk_target)`, s.c. `Σw=1, 0≤wᵢ≤0.25`, bornes de classe, plancher **ESG≥70** (relâché si infaisable).
7. **Replis** : dust → equal-weight de classe si <3 lignes → `capAndRedistribute` (25 % water-filling).
8. **Metrics** : rendement reporté = μ **ancré non-tilté** ; ESG composite pilier-pondéré ; carbone/WACI sur part couverte ; **diversification = 1−HHI sur poids de fonds**.

### 1.3 Modèle de risque (`src/lib/market/risk-model.ts`)

- Rendements log quotidiens, base 252 j, Bessel.
- **James-Stein** (shrinkage des μ par classe, cap 0,8) + **Ledoit-Wolf** (corrélation constante) — état de l'art. Point fort réel.
- **Contrainte dure : ~2 ans d'historique Yahoo max** → μ structurellement bruité malgré le shrinkage.

### 1.4 Provenance des données (le point critique)

| Donnée                            | Source réelle                                                | Verdict                                                   |
| --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| `esg_score`                       | `seedow-internal-v1` — **estimation par catégorie de fonds** | Non traçable jusqu'à une donnée source                    |
| `env/social/governance_score`     | **NULL sur la quasi-totalité**                               | Composite retombe partout sur `esg_score`                 |
| `cause_exposure`                  | **saisi à la main au seed**                                  | Subjectif, non sourcé                                     |
| `expected_return/volatility` seed | placeholders par classe                                      | OK si risk-model a tourné                                 |
| WACI / ITR / MSCI                 | réels sur **~50 actifs / ~120**                              | Partiel                                                   |
| `fund_holdings`                   | **AUCUNE migration ne la peuple**                            | Moteur carbone PCAF **non alimenté** ; overlap impossible |

**Verdict CIO :** l'algorithme est reproductible ; **les intrants ne sont pas défendables**. Dès qu'on demande « pourquoi ce fonds a 78 en ESG ? », la réponse est « estimation interne par catégorie » — non auditable.

---

## 2. Les 15 faiblesses (par gravité)

1. **`esg_score` non traçable** (estimation maison présentée comme mesure) — viole §1.2 CLAUDE.md. _Bloquant._
2. **Pas de look-through / overlap** — diversification affichée fausse si fonds redondants.
3. **Moteur carbone non alimenté** (`fund_holdings` vide) — carbone honnête sur ~40 % de l'univers seulement.
4. **Piliers E/S/G vides** — pondération par cause cosmétique.
5. **Double/triple comptage ESG & carbone** (filtre + contrainte QP + tilt μ).
6. **Personnalisation quasi nulle** — intensité uniforme 0,7 + tilt ±1,5 % arbitrable → portefeuilles peu différenciés.
7. **Risque de change ignoré** (actifs USD/JPY non couverts, jamais mesuré).
8. **Risque = f(but)**, pas de la tolérance/capacité au risque.
9. **MVO fragile sur ~2 ans** — μ trop bruité, sur-paramétrage.
10. **Validation empirique absente** — OOS ~1 an, aucune preuve vs 1/N ni vs ETF ESG.
11. **Seuils non calibrés** (70, 25 %, ¼, ⅓, 1,5 %) — pas d'analyse de sensibilité.
12. **`cause_exposure` manuel** — non auditable.
13. **Comparabilité inter-classes** du score ESG et plancher unique ≥70.
14. **Univers non qualifié** — pas d'encours/liquidité/dispo UE/ISIN vérifié/dédup share-classes.
15. **Carbone imposé à tous**, non exposé comme préférence explicite.

---

## 3. Architecture cible V2

```
UNIVERS → DATA QUALITY → ELIGIBILITY → ESG ANALYSIS → USER PREFERENCES
   → RISK PROFILE → OPTIMIZATION (robuste) → LOOK-THROUGH CHECK → FINAL → EXPLANATION
```

Principe directeur : **4 statuts de données strictement séparés** (réglementaire / déclaratif / propriétaire / estimé), agrégation intra-famille uniquement, **dégrader la confiance plutôt qu'inventer**. Chaque étape émet un `data_confidence`.

### 3.1 Méthodologie ESG finale (séparation stricte)

Trois dimensions **jamais fondues** :

1. **Risque ESG subi** (financier) → score tiers réel, source datée.
2. **Qualité ESG des entreprises financées** → piliers E/S/G réels + exclusions.
3. **Impact réel / alignement** → carbone financé (PCAF, scopes séparés), ITR, part fossile.

Le **Score Seedow** (versionné, SFDR-indépendant — _à conserver, c'est le moat_) agrège **uniquement 2+3**, avec traçabilité obligatoire. SFDR = signal **corroborant, jamais déterminant**.

### 3.2 Formules

Score ESG par fonds (renormalisé sur piliers présents) :

```
S_esg = Σ wₖ·pₖ / Σ wₖ ,  k∈{E,S,G} présents ; défaut 0.4/0.4/0.2
```

Sous-score carbone : `100·clamp(1 − (WACI/WACIref)/2, 0, 1)`
Sous-score température : `100·(4 − ITR)/(4 − 1.5)` borné [0,100]
Score composite Seedow : `0.4·ESG + 0.4·climat + 0.2·exclusions`, renormalisé sur piliers exploitables.

Allocation V2 (**risk-parity sous contraintes, sans estimer μ**) :

```
min Σᵢ (RCᵢ − 1/N)² ,  RCᵢ = wᵢ·(Σw)ᵢ / (wᵀΣw)
s.c. Σw=1 ; class_minₖ ≤ Σ_{i∈k} wᵢ ≤ class_maxₖ ; 0≤wᵢ≤0.25 ;
     Σ esgᵢ·wᵢ ≥ 70 ; overlap_look-through ≤ seuil
```

Puis **un seul** tilt ESG/carbone traçable en post-optimisation (pas 3 fois).

Overlap look-through :

```
Overlap(a,b) = Σ_titres min(hₐ(t), h_b(t))
Overlap_ptf   = Σ_{a<b} wₐ·w_b·Overlap(a,b)
Diversif_vraie = 1 − HHI(exposition agrégée par titre sous-jacent)
```

---

## 4. FEUILLE DE ROUTE — exécution step by step

> Convention : chaque étape = **objectif → fichiers → critère de done**. Ordre = ordre d'exécution. On ne passe à NEXT qu'une fois NOW vert.

### ▶ NOW (débloque la crédibilité, sans refonte de moteur)

**État d'avancement** — N1 ✅ · N3 ✅ · N4 ✅ · N5 ✅ (implémentés ; validation CI à confirmer, le registre npm privé étant bloqué dans l'environnement d'audit). **N2 ⏳ bloqué sur donnée** : peupler `fund_holdings` exige un flux de compositions réel — inventer des holdings violerait §1.3. La table et le chemin d'ingestion existent déjà (`fund_holdings`, `carbon-estimate.server.ts`) ; seul le raccordement à une source réelle manque.

**N1 — Étiqueter `esg_score` estimé vs mesuré partout** ✅ _(couche lib)_

- Fait : `isEsgSourced()` (`types.ts`) + `metrics.esg_sourced_share` (part du poids dont l'ESG vient d'un fournisseur externe réel vs `seedow-internal*`). Reste : brancher l'affichage dans l'UI `discover/`, `portfolio/`, `impact/`.
- (spéc initiale ci-dessous)
  **N1 (spéc) — Étiqueter `esg_score` estimé vs mesuré partout**
- Fichiers : `src/lib/portfolio/types.ts` (exposer `esg_score_source` dans les métriques), composants `discover/`, `portfolio/`, `impact/` + `methodologie.tsx`.
- Done : toute UI affichant un score ESG affiche sa provenance (`mesuré MSCI` / `estimé Seedow v1`), aucune donnée estimée présentée comme mesurée. Test snapshot i18n.

**N2 — Peupler `fund_holdings` sur les top fonds**

- Fichiers : nouvelle migration `supabase/migrations/*_seed_fund_holdings.sql` + `src/lib/esg/ingest.functions.ts` (import compositions).
- Cible : les ~30 fonds les plus pondérés de l'univers (couvre l'essentiel des portefeuilles générés).
- Done : `estimateFundCarbonFromHoldings` retourne `coverage > 0` sur ces fonds ; couverture carbone bottom-up mesurée, pas simulée.

**N3 — Activer l'overlap look-through**

- Fichiers : nouveau `src/lib/portfolio/overlap.ts` (formules §3.2) + branchement dans `metrics.ts` (nouvelle métrique `true_diversification` / `overlap`).
- Done : `diversification` réelle calculée sur l'exposition agrégée par titre ; test sur 2 ETF World redondants → overlap élevé détecté.

**N4 — Nettoyer & qualifier l'univers**

- Fichiers : migration d'enrichissement `assets` (colonnes `aum`, `liquidity`, `available_eu`, `share_class_of`) + audit dédup share-classes ; marquer `INCONNU` tout champ non vérifié.
- Done : chaque actif actif porte ISIN vérifié OU `NULL` assumé, un flag `available_eu`, et aucun doublon de share-class non signalé.

**N5 — Fusionner les 3 comptages carbone en un seul, exposé**

- Fichiers : `engine.ts` (retirer soit le best-in-class carbone étage 3, soit le tilt étage 5 — garder **un** levier), documenter le levier restant.
- Done : le carbone agit une seule fois dans l'allocation ; commentaire méthodo mis à jour ; tests `engine-scenarios` verts.

### ▶ NEXT (robustesse méthodologique)

**X1 — Optimiseur risk-parity sous contraintes** (retire la dépendance à μ)

- Fichiers : nouveau `src/lib/portfolio/riskparity.ts` + bascule dans `engine.ts` (garder Markowitz derrière un flag pour A/B).
- Done : allocation ne dépend plus de l'estimation de μ ; poids stables sur re-run ; tests de contraintes (classe/ESG/overlap) verts.

**X2 — Onboarding : appétence risque dédiée + intensité de cause relative**

- Fichiers : `src/lib/onboarding/params.ts` (question risque séparée du but ; `cause_intensity` dérivée d'un classement, plus uniforme), `routes/onboarding.tsx`.
- Done : deux utilisateurs de mêmes buts mais tolérances différentes → risk_target différents ; causes classées → tilts différenciés (test).

**X3 — Risque de change**

- Fichiers : `metrics.ts` (exposition par devise), `risk-model.ts` (composante change dans Σ ou pénalité), UI portefeuille.
- Done : exposition devise affichée ; risque non-EUR mesuré et exposé.

**X4 — Piliers E/S/G réels sourcés**

- Fichiers : migrations MSCI/Sustainalytics (renseigner `env/social/governance_score` + `esg_score_source`), `sustainability-classification.ts`.
- Done : composite ESG calculé sur piliers réels sur ≥ 60 % du poids typique d'un portefeuille ; fallback tracé.

### ▶ LATER (preuve & industrialisation)

**L1 — Backtest 5 ans publié vs 4 benchmarks**

- Fichiers : `src/lib/portfolio/backtest.ts` (déjà OOS walk-forward) + script d'éval + page `methodologie.tsx`.
- Prérequis : historique ≥ 5 ans ingéré.
- Done : Sharpe, Sortino, max drawdown, tracking error, turnover, stabilité publiés pour naïf 1/N, ETF ESG, MSCI World, Seedow V2 ; critère de succès = **meilleur profil ESG/carbone à risque/coût comparable**, sans détruire le Sharpe. Hold-out conservé (jamais calibrer sur le passé).

**L2 — Calibration empirique des seuils + sensibilité**

- Fichiers : `types.ts` (seuils), rapport de sensibilité.
- Done : chaque seuil (70, 25 %, ¼, ⅓, 1,5 %) justifié par une analyse, pas par un chiffre rond.

**L3 — Score anti-greenwashing automatisé**

- Fichiers : `src/lib/esg/esg-alert.ts`, `sustainability-classification.ts`.
- Done : flag automatique quand `score élevé` mais (`couverture < seuil` OU `WACI > benchmark` OU `SFDR contredit les signaux bruts`).

---

## 5. Data requirements (cible)

Par fonds : ISIN vérifié, AUM, liquidité (volume/spread), domicile, réplication, dispo particulier UE (PEA/CTO/AV), TER, benchmark, SFDR, date création ; **piliers E/S/G réels** (source+date) ; **WACI, ITR, scopes 1/2/3 séparés** ; **holdings complets (`fund_holdings`)**. Par titre sous-jacent : émissions + EVIC/CA (déjà modélisé). **Historique prix ≥ 5 ans.** Chaque champ porte son `status ∈ {réglementaire, déclaratif, propriétaire, estimé}`.

## 6. Univers cible

Rester **ETF/fonds UCITS** (bonne classe pour un particulier UE), mais **qualifié et propre** : ~150-250 fonds, ISIN vérifié, dédupliqués par share-class, filtrés sur encours minimum et dispo UE réelle. Trous à combler : obligataire agrégé EUR couvert du change, monétaire, quelques thématiques transition crédibles. **Ne pas** ajouter actions directes ni exotiques. Tout champ non vérifié = `INCONNU`, jamais inventé.

---

_Version 2.0 — audit initial. Cœur propriétaire de Seedow : documentable, reproductible, auditable. À réviser à chaque étape franchie de la feuille de route._
