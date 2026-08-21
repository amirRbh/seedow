# Seedow — Repositionnement stratégique

> **Statut** : document de décision. Phase 1 (audit) + Phase 2 (gap analysis) sont
> factuelles, ancrées sur le code réel. Phases 3–5 sont des propositions à valider.
> **Aucun code n'a été modifié.**
>
> Convention de lecture, reprise du reste du dossier :
> **FACT** = vérifié dans le repo · **HYP** = hypothèse à valider · **DÉCISION** = à trancher par l'équipe.
>
> _Rédigé le 2026-08-21, sur `main` @ `057616a`._

---

## 0. Verdict en une page — ce qui compte avant tout le reste

Le brief demande de repositionner Seedow de « app ESG » vers
**« Seedow tells you what your money does — and shows you how to make it do better »**.

**La vision est bonne. Mais elle bute sur cinq murs que le brief ne voit pas.**
Les voici en clair, du plus grave au moins grave.

### Mur n°1 — Seedow ne sait pas ce que l'utilisateur possède. (bloquant absolu)

> _« Where does MY money actually go? »_ — aujourd'hui, la réponse honnête est : **Seedow ne le sait pas.**

**FACT.** Un `portfolio` dans la base n'est pas un portefeuille détenu : c'est le
**résultat d'un optimiseur** (`lib/portfolio/engine.ts` → Markowitz sous contraintes),
généré à partir de 4 questions d'onboarding (`values`, `exclusions`, `objective`,
`amount`). Le montant est déclaratif (`portfolios.initial_amount`). La table `deposits`
existe mais n'alimente qu'une valorisation simulée (`portfolio_holdings_valued`).
`real_investment_intents` est un **formulaire de lead**, pas une position.
**FACT.** Aucune fonction d'import : `grep` sur `csv import | broker | open banking |
Trade Republic | DEGIRO | Boursorama | Powens | Plaid` ne remonte **rien** dans `src/`.

Conséquence : toute la chaîne UNDERSTAND → MEASURE s'applique à un portefeuille que
**Seedow a lui-même fabriqué**. C'est circulaire. « Voici ce que ton argent finance »
sur une allocation que l'app a inventée, ce n'est pas de l'intelligence, c'est une
démo. Et c'est très exactement ce que le §1.3 du CLAUDE.md interdit : la sur-promesse.

**Le P0 du repositionnement n'est ni l'Impact Engine ni le What-if. C'est
l'ingestion d'un portefeuille réel.** Tant qu'il n'existe pas, tout le reste est
un simulateur mieux habillé.

### Mur n°2 — La donnée ESG par instrument n'est toujours pas sourcée. (bloquant produit, déjà documenté)

**FACT** (`docs/esg-sources.md`, `docs/roadmap.md` §3) : le repo a **démontré** qu'aucune
source ESG/SFDR par ISIN n'est aujourd'hui branchée. Yahoo : probe 0/80. KID émetteurs :
mécanisme ISIN → URL non résolu (iShares : endpoint vivant mais paramétré côté JS).
extraETF : bloqué par les ToS. Conclusion écrite du repo : **il faut un flux licencié.**

Le brief §6 demande un Impact Profile à 8 dimensions (Climate, Environment, Social,
Governance, Controversies, Sustainable activity exposure, User alignment, Transition).
**Sur ces 8, 3 sont calculables aujourd'hui, 2 exigent le flux licencié, 3 exigent
une donnée que Seedow n'a jamais eue et ne peut pas dériver** (détail en §G).

Afficher les 8 quand même = inventer 3 chiffres = violation frontale du non-négociable
§1.2/§1.3. **Il faut donc soit trancher la décision d'achat de données, soit livrer un
Impact Profile à 4 dimensions assumées.** Pas de troisième voie honnête.

### Mur n°3 — « IMPROVE » est une activité réglementée si on le conçoit comme demandé.

Le brief §1/§8 demande : _« proposer des alternatives »_, _« Ton portefeuille obtient X,
voici ce qui pourrait être amélioré »_. Présenter à **cet utilisateur**, au vu de **son**
portefeuille, un instrument financier nommé et présenté comme _meilleur pour lui_, c'est
la définition de la **recommandation personnalisée** — donc du conseil en investissement
(MiFID II art. 4(1)(4) ; en France statut CIF, contrôle AMF/ORIAS). Cela contredit
directement le non-négociable §1.1 du CLAUDE.md et la règle Ethi §5.2.

Ce n'est **pas** une raison d'abandonner IMPROVE. C'est une raison de le concevoir
autrement dès le départ (§H) : **comparateur symétrique piloté par l'utilisateur**, pas
moteur de suggestion poussée. La nuance est fine mais elle décide du statut réglementaire
de toute l'entreprise. Se tromper ici est le risque le plus cher du document.

### Mur n°4 — Le brief se contredit sur le score global.

§6 dit : « Nous ne voulons plus réduire Seedow à un simple ESG Score 0–100 »… puis
propose « **Overall profile : 81** ». C'est le même objet. Un composite de 8 dimensions
hétérogènes (dont un % d'exposition et un niveau qualitatif) en un entier sur 100
n'a pas de sens méthodologique et c'est précisément ce qui rend les scores ESG
critiquables. **Recommandation : supprimer l'Overall profile.** Garder un seul chiffre
en tête d'écran, mais que ce soit **User Alignment** — le seul dont la définition tienne
(« à quel point ceci correspond à ce que TU as demandé », §F) et le seul qu'un
concurrent ne puisse pas copier.

### Mur n°5 — La surface produit est déjà trop large pour l'équipe.

**FACT.** 40 entrées dans `src/routes` (52 fichiers), dont `vote`, `wrapped`, `communaute`, `certificat`, `cours`,
`le-fil`, `reveil`, `observatoire`, `comparatif`, `objectifs`, `construire`, `discover`.
~10 600 lignes de routes. Un repositionnement qui **ajoute** Impact Engine + What-if +
Monthly Loop + import de portefeuille sans **retirer** produira une app incohérente et
un backlog ingérable. §P liste ce qui doit sauter.

### Ce qui est excellent et qu'il ne faut surtout pas toucher

Le brief §15 craint qu'on casse le travail existant. La crainte est justifiée, mais
l'audit montre mieux que ça : **la moitié difficile du repositionnement est déjà faite.**

- `data_observations` (§K) est un **vrai ledger de lineage au champ** : `field`, `source_id`,
  `source_url`, `reference_date`, `retrieved_at`, `confidence`, `method`, `validation_status`.
  Le brief §3.2 demande exactement ça. **C'est déjà en base.** C'est rare et c'est un actif.
- `lib/esg/sustainability-classification.ts` : classification durable **explicitement
  découplée de SFDR**, avec SFDR relégué au rang de simple _driver corroborant_. Le
  brief §4 exige précisément cette séparation. **Déjà fait, et fait proprement.**
- `lib/portfolio/overlap.ts` : overlap look-through **avec `coverage` retourné** — refuse
  de présenter un chiffre complet quand la couverture est partielle. C'est le brief §5-ETF.
- `lib/esg/transparency.ts` : greenwashing avec bande de tolérance, raisons explicites,
  et robustesse aux données corrompues. Pas un verdict, un drapeau motivé.
- `lib/portfolio/tradeoffs.functions.ts` + `consequences.ts` + `impact/lever.ts` : **le
  What-if existe déjà à 60 %**, sur les leviers d'exclusion et de risque.

**Diagnostic global : le brief demande de construire une couche d'intelligence. Le moteur
est là. Ce qui manque, c'est (a) l'input réel de l'utilisateur, (b) la donnée ESG licenciée,
(c) le récit produit qui relie les deux.** Ce n'est pas un chantier de refonte. C'est un
chantier d'**entrée de données + repositionnement narratif**, avec beaucoup moins de code
à écrire que le brief ne le suppose — et une décision d'achat à prendre.

---

# PHASE 1 — AUDIT DU REPOSITORY (FACT)

## 1.1 Architecture réelle

| Couche            | État                                                                                     | Fichiers de référence                                       |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework         | TanStack Start v1, React 19, SSR Cloudflare Workers, Vite 7                              | `package.json`, `vite.config.ts`                            |
| Backend           | Supabase managé (Lovable Cloud) — 45 tables, RLS partout                                 | `supabase/migrations/*` (78 migrations)                     |
| Optimiseur        | Markowitz QP (`quadprog`) + risk-parity ERC + repli equal-weight borné                   | `lib/portfolio/{engine,markowitz,riskparity}.ts`            |
| Données de marché | Yahoo Finance, cron horaire → `asset_quotes` / `asset_prices`                            | `lib/market/yahoo.server.ts`, `routes/hooks/`               |
| Modèle de risque  | Recalcul μ/σ + covariance, avec palier de qualité (`full`/`partial`/`insufficient`)      | `lib/market/risk-model.ts`, `lib/portfolio/data-quality.ts` |
| Data Engine       | Registry de sources priorisées 1–4, runner, qualité, complétude, dédup ISIN, connecteurs | `lib/data-engine/*` (56 fichiers)                           |
| Catalogue         | Adanos (MIT) → `catalog_instruments`, 61 692 instruments, refresh hebdo                  | `docs/adanos-catalog.md`                                    |
| ESG               | Classification durable SFDR-indépendante, greenwashing, carbone bottom-up PCAF           | `lib/esg/*`                                                 |
| Impact            | Empreinte carbone honnête + équivalences ADEME sourcées + levier climat                  | `lib/impact/*`                                              |
| IA                | Ethi via Lovable AI Gateway, avec module `compliance.ts`                                 | `lib/ethi/*`, `routes/api.ethi.ts`                          |
| MCP               | Serveur MCP exposant 4 outils Seedow                                                     | `lib/mcp/*`                                                 |
| Tests             | 82 fichiers de test (vitest), concentrés sur `lib/`                                      | `src/lib/**/__tests__`                                      |

## 1.2 Les données — ce qui est réellement en base

**Univers moteur (`assets`)** — ~112 fonds actifs (`is_active=true`), enrichis.
Colonnes ESG : `esg_score`, `env_score`, `social_score`, `governance_score`,
`msci_esg_quality_score`, `waci_tco2e_per_musd_sales`, `implied_temp_rise`,
`sfdr_article`, `carbon_intensity_*`, `cause_exposure` (jsonb), `excluded_sectors`,
plus la traçabilité `esg_score_source` / `esg_data_asof` / `esg_score_fetched_at`.

**Catalogue (`catalog_instruments`)** — 61 692 instruments (16 530 ETF / 45 162 actions),
ISIN à 98 %. 10 789 ETF promus dans `assets` mais **tous `is_active=false`** : le gate
`activation.ts` refuse d'activer un fonds sans ESG sourcé. **C'est une bonne décision
d'ingénierie qui expose crûment le mur n°2** : l'univers réellement exposable reste ~112.

**Lineage (`data_observations`, `data_sources`, `fund_documents`, `ingestion_jobs`,
`ingestion_errors`)** — schéma complet et RLS. Le brief §3.2 (source / date de collecte /
date d'effet / méthodologie / confiance / fraîcheur) est **intégralement couvert par le
schéma**. Reste à en propager l'usage de bout en bout jusqu'à l'UI.

**Look-through (`fund_holdings`, `securities`)** — historisé par `as_of`, avec vue
`fund_latest_holdings`. Alimenté par le connecteur iShares. Couverture réelle : partielle.

**Carbone (`carbon_estimates`, `issuer_emissions`, `sector_carbon_intensity`,
`carbon_equivalences`)** — moteur d'estimation bottom-up holdings → émetteur, avec
`sourced_coverage` distinct de `coverage` (mesuré vs estimé). Méthodologiquement solide.

**Utilisateur** — `portfolios` (préférences + poids + métriques), `financial_goals`,
`watchlists`, `alerts`, `asset_score_history`, `decision_events`, `tradeoff_decisions`,
`preference_events`, `app_events`, `notification_preferences`, `resolution_votes`.

## 1.3 Le point de bascule de tout le dossier

Les préférences utilisateur (`causes`, `cause_intensity`, `exclusions`, `risk_target`,
`horizon_years`) **vivent sur la table `portfolios`, pas sur `profiles`**.
`profiles` ne contient que de l'affichage (`theme`, `font_scale`, `view_mode`, `display_name`).

C'est cohérent avec le produit actuel (« un portefeuille = un jeu de convictions ») et
**structurellement incompatible avec la vision cible**, où _User Alignment_ doit être une
propriété de la **personne**, applicable à n'importe quel portefeuille, actif ou ETF
qu'elle regarde. C'est le premier changement de schéma à faire (§K).

---

# PHASE 2 — GAP ANALYSIS

Priorité : 🔴 P0 (indispensable) · 🟠 P1 (important) · 🟡 P2 (plus tard).
« Effort » : S ≤ 3 j · M ≤ 2 sem · L ≤ 1 mois · XL > 1 mois ou décision externe.

| Area                                        | Current (FACT)                                                                                                                      | Target                                                                                            | Gap                                                                                   | Prio | Effort                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| **Portefeuille réel**                       | Généré par l'optimiseur ; montant déclaratif ; aucun import                                                                         | L'utilisateur déclare/importe ce qu'il possède déjà                                               | **Tout.** Table `user_holdings`, saisie manuelle, import CSV, plus tard agrégation    | 🔴   | M (manuel+CSV) / XL (agrégation) |
| **Préférences = propriété de la personne**  | Sur `portfolios` uniquement                                                                                                         | Sur `profiles`, versionnées                                                                       | Migration + rétrocompat                                                               | 🔴   | S                                |
| **User Alignment**                          | N'existe pas ; les préférences ne servent qu'à _générer_                                                                            | Score explicite « ce portefeuille vs ce que TU as demandé », explicable ligne à ligne             | Module `lib/alignment/` complet                                                       | 🔴   | M                                |
| **Look-through ETF**                        | `overlap.ts` + `holdings-adapter.ts` (moteur prêt), couverture partielle                                                            | « Cet ETF contient X entreprises, ton exposition à Y est de Z % »                                 | Couverture holdings + **agrégation d'exposition par activité** (n'existe pas)         | 🔴   | M + XL (données)                 |
| **Exposition par activité économique**      | `cause_exposure` (jsonb déclaratif, 6 thèmes) au niveau **fonds**                                                                   | Exposition dérivée **bottom-up des holdings** (secteur/activité/revenus)                          | La brique manque entièrement ; `securities.sector`/`industry` existe mais peu peuplée | 🔴   | L                                |
| **Exposition fossile**                      | Approximée par `excluded_sectors` (déclaratif du fonds)                                                                             | % réel du portefeuille exposé aux activités fossiles, look-through                                | Manque : classification d'activité par titre                                          | 🔴   | L                                |
| **Source ESG par ISIN**                     | Aucune branchée (probes documentés, gate actif)                                                                                     | Flux licencié EET/SFDR ou résolveur KID                                                           | **Décision d'achat non prise.** Bloque 6 chantiers                                    | 🔴   | XL (décision)                    |
| **Controverses**                            | N'existe pas (aucune table, aucun champ)                                                                                            | Niveau + liste sourcée                                                                            | Tout. Donnée exclusivement licenciée (Sustainalytics/RepRisk/MSCI)                    | 🟠   | XL (achat)                       |
| **Taxonomie UE / activité durable %**       | N'existe pas                                                                                                                        | % d'alignement taxonomie                                                                          | Tout. Donnée EET (champs SFDR/PAI) — vient avec le flux licencié                      | 🟠   | XL (achat)                       |
| **Impact Profile multi-dimensions**         | 1 score (`esg_score` 0–100) + score Seedow v1.0 (3 piliers) + tier durabilité                                                       | 4 dimensions défendables + alignement (§G)                                                        | Restructuration UI + module de composition                                            | 🔴   | M                                |
| **What-if**                                 | `tradeoffs.functions.ts` (leviers exclusion/risque), `lever.ts` (curseur climat), `consequences.ts` (édition d'allocation)          | Comparaison A→B avec before/after et arbitrage explicite                                          | **Repositionner + généraliser** à une substitution d'actif ; ≠ construire             | 🟠   | M                                |
| **Comparaison 2 actifs / 2 ETF**            | `comparatif.tsx` = portefeuille vs MSCI World uniquement                                                                            | Comparateur symétrique actif↔actif, ETF↔ETF                                                       | Écran + server fn ; le calcul existe                                                  | 🟠   | S-M                              |
| **Monthly Impact / « Your money changed »** | `asset_score_history`, `alerts`, `esg-alert.ts`, `notifications/digest.ts`, `le-fil`, `reveil`, `wrapped`                           | Snapshot mensuel + explication causale des deltas                                                 | Manque `portfolio_impact_snapshots` + **attribution de cause** (le point dur)         | 🟠   | M                                |
| **Attribution de cause d'un delta**         | N'existe pas                                                                                                                        | Distinguer : donnée changée / exposition changée / méthodologie changée / activité réelle changée | Brique neuve, mais **le lineage existant la rend possible** — c'est notre avantage    | 🟠   | M                                |
| **Obligations (méthodo par classe)**        | Classes `green_bond`/`social_bond`/`sov_bond`/`corporate_bond` existent dans l'enum ; **traitées comme des actions par le scoring** | Méthodo distincte par type (use of proceeds, KPI, émetteur souverain)                             | 3 086 Fixed Income non classifiés (roadmap §2.3) ; aucune logique dédiée              | 🟠   | L                                |
| **Actions individuelles**                   | `catalog_instruments` en contient 45 162 ; **aucune n'est investissable ni notée**                                                  | Analyse par entreprise (activité, revenus, émissions, controverses)                               | Univers entier non adressé                                                            | 🟡   | XL                               |
| **Monétisation**                            | 0 € ; `tarifs.future` = placeholder ; aucun code de paiement                                                                        | Free / Premium / Invest / B2B                                                                     | Tout : plans, paywall, facturation, `entitlements`                                    | 🟠   | M                                |
| **Investir réellement**                     | `real_investment_intents` = formulaire de lead                                                                                      | Passerelle courtier partenaire                                                                    | Tout : partenariat + parcours + statut réglementaire                                  | 🟡   | XL                               |
| **Explainability**                          | Excellente dans `lib/` (drivers, raisons, coverage), **inégalement remontée à l'UI**                                                | Chaque chiffre cliquable → preuve                                                                 | Composant transverse « Pourquoi ? »                                                   | 🟠   | M                                |
| **Surface produit**                         | 40 routes, features de rétention concurrentes                                                                                       | IA resserrée (§J)                                                                                 | Suppression/fusion de 6–8 routes                                                      | 🟠   | M                                |

---

# PHASE 3 — PRODUCT SPEC

## A. New Seedow Vision

> **Seedow te dit ce que fait ton argent — et te montre comment lui faire faire mieux.**

Formulation produit retenue, en français, dans le ton de la marque :

> **« Ton argent fait déjà quelque chose. Sache quoi. »**

C'est la déclinaison directe de la signature de marque (« Ce n'est pas une fatalité.
C'est un choix. Le tien aussi. ») : l'argent agit **déjà**, avec ou sans l'utilisateur.
Seedow ne propose pas de « faire le bien », il **lève l'aveuglement**. Ce cadrage évite
le piège moralisateur du §14 du brief et il est vrai même pour un Livret A.

**Les 4 temps, avec ce qu'ils exigent réellement :**

| Temps          | Promesse                               | Pré-requis dur                                        | Statut                      |
| -------------- | -------------------------------------- | ----------------------------------------------------- | --------------------------- |
| **UNDERSTAND** | « Où va mon argent ? »                 | Connaître ce que l'utilisateur possède + look-through | ❌ bloqué (mur n°1)         |
| **MEASURE**    | « Quel est le profil de mon argent ? » | Donnée ESG par instrument                             | ⚠️ partiel (mur n°2)        |
| **IMPROVE**    | « Comment faire mieux ? »              | Cadre non-conseil (§H)                                | ⚠️ à re-concevoir (mur n°3) |
| **INVEST**     | « Passe à l'acte »                     | Courtier partenaire                                   | ❌ non commencé             |
| **MONITOR**    | « Ton argent a changé »                | Snapshots + attribution                               | ⚠️ briques éparses          |

**Correction de fond apportée à la vision du brief.** Le brief place INVEST en bout de
chaîne, « à terme ». C'est juste sur le plan réglementaire, mais dangereux sur le plan
business : **sans INVEST, Seedow n'a aucune boucle de valeur mesurable** — on ne sait
jamais si l'utilisateur a agi, donc jamais si le produit sert à quelque chose. Il faut
donc, dès la V1, une **preuve d'action même sans exécution** : « j'ai fait le changement »
déclaratif, qui met à jour le portefeuille réel de l'utilisateur. C'est gratuit à
construire, non réglementé, et ça transforme MONITOR en boucle fermée.

## B. New Product Positioning

**Ce que Seedow devient :** la **couche de lecture indépendante de l'argent des
particuliers européens**. On lit ce que l'utilisateur possède **déjà, ailleurs**, on
en explique le contenu réel, et on lui donne les moyens de comparer.

**La phrase de positionnement interne (pas marketing) :**

> Seedow est le seul acteur qui peut dire ce que vaut un fonds **sans avoir intérêt à
> ce que tu l'achètes.**

C'est le seul angle qu'aucun incumbent ne peut occuper : une banque, un courtier, un
robo-advisor et un émetteur d'ETF ont tous un produit à placer. C'est aussi ce que dit
déjà le `MOAT_BLUEPRINT.md` (« l'Autorité ») — le repositionnement ne le contredit pas,
il le **généralise du fonds vers le portefeuille**.

**Ce que Seedow refuse d'être** (repris du brief, validé) : banque, courtier, screener
ETF, base ESG, robo-advisor, app de scoring. **À ajouter à la liste : « app de finance
personnelle »** — pas d'agrégation de comptes courants, pas de catégorisation de
dépenses. Le périmètre est l'**épargne investie**, et rien d'autre.

**Cible.** Le brief dit 20–35 ans. Les personas du CLAUDE.md (Léa 27, Karim 34, Inès 31,
Thomas 40) sont plus larges et plus justes. **Point de tension à trancher (DÉCISION) :**
un utilisateur de 20–27 ans a rarement un portefeuille à analyser — donc le mur n°1 le
laisse dehors. **Le cœur de cible réel du repositionnement est Karim/Thomas (32–45 ans,
épargne déjà investie, méfiance envers l'intermédiaire).** Léa reste servie par
l'onboarding/simulation existant, mais elle n'est plus le centre de gravité. Assumer ce
glissement explicitement, sinon le produit servira mal les deux.

## C. Business Model — voir §M (fusionné pour éviter le doublon).

## D. Impact Engine — architecture

Le point clé du brief §4 est juste et doit devenir une **contrainte de type**, pas une
intention : _ESG Risk_, _Impact_, _User Alignment_, _SFDR_, _Activity exposure_ sont des
objets différents et ne doivent jamais transiter dans la même variable.

```
                       ┌──────────────────────────────────────────┐
   USER                │  UserPreferenceProfile (profiles)        │
   ─────────────────▶  │  causes · intensités · exclusions        │
                       │  risque · horizon · versionné            │
                       └──────────────────┬───────────────────────┘
                                          │
   POSITIONS RÉELLES                      │
   ─────────────────▶  user_holdings ─────┤
   (saisie / CSV / agrégation)            │
                                          ▼
   INSTRUMENTS         ┌──────────────────────────────────────────┐
   ─────────────────▶  │            IMPACT ENGINE                 │
   assets              │                                          │
   fund_holdings ────▶ │  1. Résolution (ISIN → instrument)       │
   securities          │  2. Look-through (fonds → titres)        │
   data_observations   │  3. Agrégation pondérée                  │
   carbon_estimates    │  4. Couverture & confiance (jamais       │
                       │     d'extrapolation silencieuse)         │
                       │  5. Composition en dimensions            │
                       └──────────────────┬───────────────────────┘
                                          ▼
        ┌──────────────┬──────────────────┬──────────────────┬──────────────┐
        ▼              ▼                  ▼                  ▼              ▼
  ExposureProfile  ClimateProfile   ESGRiskProfile   RegulatoryFacts  AlignmentProfile
  (ce que ça       (carbone, ITR,   (score tiers,    (SFDR, PAI —     (vs CE
   finance)         vs benchmark)    controverses)    jamais un score)  utilisateur)
        └──────────────┴──────────────────┴──────────────────┴──────────────┘
                                          ▼
                          Explication + preuve (data_observations)
                                          ▼
                              Comparaison / What-if / Monitoring
```

**Cinq règles d'architecture non négociables :**

1. **Aucune dimension ne se compose avec une autre en un chiffre unique**, sauf
   `AlignmentProfile` (qui est par construction un composite pondéré par l'utilisateur).
2. **Toute sortie porte sa `coverage` (0..1) et sa `confidence`.** C'est déjà la
   convention de `overlap.ts` et `carbon.ts` — la généraliser à tout le moteur.
3. **`RegulatoryFacts` est un conteneur de faits, jamais un score.** L'article SFDR y est
   affiché comme une déclaration de l'émetteur, avec sa date. Le brief §4 est catégorique
   là-dessus et il a raison : Article 9 ≠ meilleur. Le code respecte déjà ce principe
   (`sustainability-classification.ts`) ; il faut que **l'UI le respecte aussi**.
4. **Une dimension sans donnée ne s'affiche pas « 0 » ni « n/a » discret : elle s'affiche
   comme un trou explicite, avec ce qu'il faudrait pour le combler.** C'est un
   différenciateur de confiance, pas une faiblesse à cacher.
5. **Fonctions pures dans `lib/`, I/O au bord.** Convention déjà en place, à tenir.

## E. Méthodologie par classe d'actifs

Le brief §5 a raison sur le fond : traiter un ETF comme une entreprise est faux.
Voici ce qui est **faisable aujourd'hui** vs ce qui exige une donnée absente.

### E.1 ETF / fonds (le cœur — 100 % de l'univers actif actuel)

```
ETF ──▶ fund_holdings (as_of le plus récent)
     ──▶ securities (ISIN → secteur / activité / pays)
     ──▶ pondération par poids
     ──▶ ExposureProfile + ClimateProfile, chacun avec coverage
```

**Faisable maintenant :** overlap look-through (`overlap.ts` ✅), carbone bottom-up
(`carbon-engine.ts` ✅), nombre de titres, top holdings, concentration réelle.
**Manque :** la table de correspondance **titre → activité économique**. C'est le chaînon
qui permet la phrase cible du brief (« ton exposition indirecte à telle activité est de
Y % »). `securities.sector`/`industry` existe mais est peu peuplée et trop grossière
(un secteur GICS « Energy » ne distingue pas pétrole amont et renouvelable).

**Recommandation (DÉCISION) :** ne pas viser une classification d'activité universelle.
Viser **une seule classification, binaire et défendable, sur les activités qui décident
réellement de la conviction** : fossile amont, charbon, armement controversé, tabac,
énergies renouvelables. 5 axes, sourcés, plutôt que 20 approximatifs. C'est ce que
l'utilisateur demande réellement, et c'est atteignable.

**Point de fraîcheur à assumer :** les compositions d'ETF sont publiées avec 1 à 3 mois
de retard. Toute exposition look-through doit afficher son `as_of`. Ne jamais présenter
une exposition comme « actuelle ».

### E.2 Obligations

Le brief §5 demande la distinction. Elle est **méthodologiquement juste et
opérationnellement hors de portée à court terme**. Verdict par type :

| Type                           | Analyse cible                                              | Donnée requise                                                                                      | Verdict                                                                                                               |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Corporate bond**             | Exposition à l'émetteur (mêmes signaux que l'action)       | Émetteur → ESG. Le lien existe via `securities`                                                     | 🟠 P1, faisable                                                                                                       |
| **Green bond**                 | _Use of proceeds_ : à quoi sert l'argent levé              | Documentation d'émission, non structurée, pas de source gratuite par ISIN                           | 🟡 P2, **XL**                                                                                                         |
| **Sustainability-linked bond** | KPI / SPT + pénalité de coupon                             | Idem, encore plus rare                                                                              | 🟡 P2 — **recommandation : ne pas le faire.** Volume marginal en portefeuille retail, coût de données disproportionné |
| **Sovereign bond**             | Signaux pays (émissions, trajectoire, gouvernance, droits) | Données publiques (Banque mondiale, UNFCCC, indices de gouvernance) — **gratuites et exploitables** | 🟠 P1, faisable et sous-estimé par le brief                                                                           |

**Franchise nécessaire :** le repo classe déjà `green_bond` / `social_bond` comme classes
d'actifs, mais **ne les analyse pas différemment**. Un green bond hérite aujourd'hui du
scoring générique. **C'est une faiblesse méthodologique réelle qu'il faut soit corriger,
soit cesser d'afficher comme une distinction.** Afficher « green bond » sans analyser
le use of proceeds, c'est relayer l'étiquette de l'émetteur — exactement le
greenwashing que l'`Observatoire` dénonce. **Cohérence exigée.**

### E.3 Actions individuelles

45 162 en catalogue, 0 investissable. Le brief §5 demande une analyse complète
(activité, revenus, émissions, climat, transition, controverses, social, gouvernance).
**Verdict : ne pas l'ouvrir maintenant.** Raisons : (a) coût de données par entreprise
supérieur à celui des fonds, (b) l'action individuelle est un produit à risque plus élevé
qui pousserait Seedow vers un terrain de conseil, (c) le look-through fonds sert déjà à
répondre « quelles entreprises je finance ». **L'action entre par la porte des holdings,
pas par la porte du catalogue.**

### E.4 Cash / fonds monétaire

Pertinent et bon marché : l'utilisateur qui a 8 000 € sur un Livret A finance quelque
chose (crédits d'État et logement social via la Caisse des Dépôts — **information
publique et sourçable**). C'est le meilleur point d'entrée UNDERSTAND pour Léa/Karim,
qui n'ont souvent que ça. **🟠 P1, effort S, valeur narrative très élevée.**

## F. User Alignment — méthodologie

**La seule métrique vraiment propriétaire du dossier.** Un score ESG se copie ; un
alignement dépend de préférences qu'un concurrent n'a pas.

### Définition

> **User Alignment = dans quelle mesure ce portefeuille respecte les contraintes et
> priorités que CET utilisateur a exprimées.**

Ce n'est **ni** une note de qualité, **ni** une mesure d'impact, **ni** un score ESG.
Deux utilisateurs regardant le même ETF doivent voir deux alignements différents — sinon
la métrique ne sert à rien.

### Composition proposée

Trois blocs, aux statuts logiques distincts :

**1. Contraintes dures (booléen, non négociable, non pondéré)**
Les `exclusions` de l'utilisateur. Une violation n'abaisse pas le score : elle
**produit un drapeau nommé**. « Ton portefeuille contient 2,1 % d'exposition fossile
alors que tu as exclu les fossiles » est infiniment plus utile que « -8 points ».

> **Décision méthodologique clé : ne jamais noyer une violation d'exclusion dans un score.**

**2. Priorités déclarées (pondéré, 0..100)**
Les `causes` + `cause_intensity`. Mesure : exposition réelle du portefeuille aux thèmes
priorisés, rapportée à ce que l'utilisateur a demandé. Réutilise `themeBreakdown.ts` et
`causeToPillarWeights()` qui existent déjà.

**3. Contraintes de forme (pondéré)**
`risk_target` vs volatilité réelle, `horizon_years` vs profil, et — ajout recommandé —
frais (TER) et diversification look-through réelle. Ce bloc évite l'écueil d'un
alignement purement moral qui validerait un portefeuille aligné mais absurde
financièrement.

### Règles

- **Renormalisation sur les blocs mesurables**, jamais de valeur neutre inventée pour un
  bloc manquant (règle déjà appliquée dans `computeSeedowScore` — la réutiliser).
- **`coverage` obligatoire.** Un alignement à 92 % calculé sur 40 % du portefeuille
  s'affiche « 92 % · sur 40 % de ton portefeuille mesuré ».
- **Décomposable ligne à ligne.** « Cette ligne tire ton alignement vers le bas parce
  que X » doit être une propriété du calcul, pas un texte reconstruit après coup.
- **Versionné** (`ALIGNMENT_VERSION`), comme `SEEDOW_SCORE_VERSION` et
  `METHODOLOGY_VERSION` le sont déjà. Un utilisateur doit pouvoir comprendre qu'un
  changement de score vient d'un changement de méthode — c'est le pré-requis de §I.

### Faiblesse à assumer publiquement

L'alignement mesure la **conformité aux préférences déclarées**, pas l'impact réel dans
le monde. Un portefeuille aligné à 95 % ne réduit aucune émission par lui-même
(l'achat sur le marché secondaire ne finance pas directement l'entreprise). **Cette limite
doit être écrite sur `/methodologie` et dans l'UI, pas enterrée.** C'est précisément le
genre d'honnêteté qui construit l'Autorité du `MOAT_BLUEPRINT`.

## G. Impact Profile — audit métrique par métrique

Le brief §6 demande explicitement l'audit. Voici le verdict, sans complaisance.

| Métrique proposée                        | Défendable ?          | Donnée disponible ?                                        | Verdict                                                                                                                                                 |
| ---------------------------------------- | --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overall profile (81)**                 | ❌ Non                | —                                                          | **SUPPRIMER.** Composite de dimensions non commensurables ; contredit le brief §6 lui-même. Remplacé en tête d'écran par User Alignment                 |
| **Climate (82)**                         | ✅ Oui                | ✅ WACI + ITR + carbone bottom-up, avec coverage           | **GARDER**, calculé. Le mieux outillé du lot                                                                                                            |
| **Environment (79)**                     | ⚠️ Redondant          | `env_score` existe mais recouvre le climat à 80 %          | **FUSIONNER dans Climate.** Deux chiffres proches côte à côte détruisent la lisibilité sans rien apporter                                               |
| **Social (76)**                          | ⚠️ Faible             | `social_score` = pilier d'un score tiers, non décomposable | **AFFICHER COMME DONNÉE EXTERNE**, avec le nom du fournisseur et sa date. Ne pas le recalculer, ne pas prétendre que c'est du Seedow                    |
| **Governance (81)**                      | ⚠️ Faible             | idem                                                       | **Idem Social.** Regrouper Social+Governance en un bloc « Notation externe » assumé comme relayé                                                        |
| **Controversies (Low)**                  | ✅ Très pertinent     | ❌ **Aucune donnée. Aucune table. Aucune source gratuite** | **NE PAS AFFICHER** tant que non licencié. C'est la métrique la plus demandée par Thomas (persona) et la plus chère. Candidat n°1 d'un achat de données |
| **Sustainable activity exposure (18 %)** | ✅ Oui                | ❌ Taxonomie UE : champs EET, non disponibles              | **REPORTER.** Arrive avec le flux licencié                                                                                                              |
| **User alignment (92 %)**                | ✅✅ Oui, le meilleur | ✅ Préférences + expositions déjà en base                  | **CONSTRUIRE — priorité n°1 (§F)**                                                                                                                      |
| **Transition / Climate alignment**       | ⚠️                    | ITR partiellement présent (`implied_temp_rise`)            | **Intégrer dans Climate comme sous-signal**, pas comme dimension autonome                                                                               |
| **Fossil exposure %** _(ajout)_          | ✅✅                  | ⚠️ Approximable, exact seulement en look-through           | **AJOUTER.** C'est le chiffre que l'utilisateur comprend immédiatement, bien plus qu'un score                                                           |
| **Frais réels (TER) en €/an** _(ajout)_  | ✅✅                  | ✅ Disponible                                              | **AJOUTER.** Non-ESG, mais c'est la donnée qui prouve le plus vite que Seedow est de son côté                                                           |

### Impact Profile retenu

```
TON ALIGNEMENT                                92 %
   sur 78 % de ton portefeuille mesuré
   ⚠ 2 lignes contredisent une exclusion que tu as posée

CE QUE TON ARGENT FINANCE
   Solutions climat            18 %
   Énergies fossiles            3,4 %      ← tu as exclu ce secteur
   Santé                       11 %
   Technologie                 21 %
   Non classé                  17 %        ← honnêteté, pas un trou caché

CLIMAT
   Intensité carbone   62 tCO₂e/M$   ·  46 % sous l'indice mondial
   Trajectoire         2,1 °C        ·  source MSCI, au 30/06/2026

COÛT
   Frais annuels       0,24 %  =  11,60 € sur 4 820 €

NOTATION EXTERNE  (relayée, non calculée par Seedow)
   Social 76  ·  Gouvernance 81      —  fournisseur X, au 30/06/2026

FAITS RÉGLEMENTAIRES  (déclaratif de l'émetteur, ce n'est pas une note)
   SFDR Article 8  ·  3 exclusions formelles
```

**Cinq dimensions au lieu de huit, aucune inventée, chacune avec sa source et sa
couverture.** C'est moins spectaculaire que le brief et beaucoup plus crédible — et c'est
le seul format compatible avec les non-négociables §1.2/§1.3.

## H. What-if engine — et le mur réglementaire

### Le problème, énoncé sans détour

Le brief §8 décrit : l'utilisateur possède ETF A, **Seedow propose ETF B**. Ce verbe
« propose » fait basculer l'activité dans la recommandation personnalisée. Ajouter un
disclaimer ne change rien : le régulateur regarde la substance, pas la clause.

### La conception qui préserve la fonction sans le statut

**Inverser l'initiative.** Ce n'est pas Seedow qui propose B ; c'est l'utilisateur qui
choisit B dans un univers qu'il explore, et Seedow qui **calcule les conséquences**.

| ❌ Interdit (recommandation)                  | ✅ Autorisé (outil de comparaison)                                      |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| « Voici une meilleure alternative à ton ETF » | « Compare ton ETF à n'importe quel autre »                              |
| Classement de « fonds recommandés pour toi »  | Filtres/tri **que l'utilisateur pilote**, appliqués à tout l'univers    |
| « Tu devrais passer de A à B »                | « Si tu passais de A à B : voici ce qui change, dans les deux sens »    |
| Un seul candidat mis en avant                 | Comparaison symétrique, gains **et** pertes affichés avec le même poids |
| « Optimiser mon portefeuille » (bouton)       | « Simuler un changement » (bouton)                                      |

**Deux garde-fous à coder, pas seulement à écrire dans les CGU :**

1. **Symétrie obligatoire.** Un résultat What-if qui n'affiche que des améliorations est
   un résultat invalide. Si la comparaison ne produit aucun coût, l'écran dit
   explicitement « aucun coût détecté sur les dimensions mesurées » — ce qui est une
   affirmation de couverture, pas une approbation.
2. **Aucun tri par défaut sur une notion de « meilleur ».** Le tri par défaut est neutre
   (encours, nom, ou ordre de l'univers). L'utilisateur choisit son critère.

### Ce qui existe déjà

`tradeoffs.functions.ts` fait tourner le moteur sur des variantes de paramètres et
retourne `costBps` / `esgDelta` / volatilité — **et il affiche déjà le coût des leviers**.
C'est-à-dire que **le principe de symétrie est déjà implémenté dans le repo.** Le What-if
du brief est une généralisation de ce module de « levier de paramètre » vers
« substitution de ligne ». **Effort M, pas L.**

### Ce qu'il faut ajouter à l'écran BEFORE/AFTER du brief

Le brief liste : Impact profile, Fossil exposure, Green activity, Diversification, Cost.
**Il manque trois lignes indispensables :**

- **Couverture de la comparaison** — comparer un fonds mesuré à 90 % avec un fonds mesuré
  à 30 % n'est pas une comparaison. Sans cette ligne, l'écran ment par omission.
- **Fiscalité et frais de transaction** — vendre A pour acheter B a un coût réel
  (plus-value, courtage, spread) qui peut annuler tout le gain d'impact. **Ne pas
  l'afficher est la faiblesse la plus grave du What-if tel que décrit dans le brief.**
- **Date des données comparées** — deux fonds dont les compositions ont 4 mois d'écart
  ne se comparent pas au même instant.

## I. Monthly retention loop — « Ton argent a changé »

Bonne idée, **et le repo a déjà l'ingrédient rare** : `data_observations` avec
`reference_date` **et** `retrieved_at` séparées. Cette séparation — qu'aucun agrégateur
grand public ne fait — permet exactement la distinction que le brief §9 exige.

### Les quatre causes d'un delta, et comment on les distingue

| Cause                          | Signature dans les données                                             | Message                                                             |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **La donnée a changé**         | Même `reference_date`, nouveau `retrieved_at`, valeur différente       | « Le fournisseur a corrigé sa donnée »                              |
| **L'exposition a changé**      | Poids du portefeuille modifiés, données instruments inchangées         | « Tu as changé ton portefeuille » / « le marché a bougé les poids » |
| **La méthodologie a changé**   | `ALIGNMENT_VERSION` / `SEEDOW_SCORE_VERSION` différent entre snapshots | « Nous avons changé notre méthode — voici quoi et pourquoi »        |
| **L'activité réelle a changé** | Nouvelle `reference_date` avec un `as_of` plus récent                  | « L'entreprise/le fonds a réellement changé »                       |

**Règle absolue, que le brief énonce et qu'il faut coder :** si le moteur ne peut pas
attribuer un delta à une cause, il affiche « cause indéterminée » — jamais la cause la
plus flatteuse. Un score qui monte parce que le fournisseur a corrigé une erreur n'est
pas une bonne nouvelle, et le dire renforce la confiance plus que l'inverse.

### Cadence — désaccord avec le brief

Le brief dit « chaque mois ». **Le mensuel est trop lent pour créer une habitude et trop
rapide pour que les données ESG bougent** (compositions trimestrielles, notations
semestrielles). Recommandation :

- **Événementiel** (`alerts` existe déjà, `esg-alert.ts` aussi) : une controverse, un
  changement de composition significatif, une exclusion violée → notification immédiate.
  C'est ce qui crée le réflexe.
- **Trimestriel** pour le bilan complet, aligné sur la vraie fréquence des données.
- **Annuel** pour `wrapped` (qui existe déjà).

Le mensuel produirait, 9 mois sur 12, un message « rien n'a changé » — le pire signal
de rétention possible.

### Attention : trois features de rétention concurrentes existent déjà

`le-fil`, `reveil`, et `wrapped` occupent chacune une partie de ce terrain, sans qu'aucune
ne soit la boucle canonique. **Il faut en choisir une et absorber les autres** (§P),
sinon la « Monthly loop » sera la quatrième.

---

# PHASE 4 — ARCHITECTURE TECHNIQUE

## J. UX architecture — Information Architecture

Le brief §13 propose 7 sections. **C'est deux de trop**, et une manque.

| Section du brief                  | Verdict                                                                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOME « Your money »               | ✅ Garder — devient l'écran d'entrée                                                                                                                                                                             |
| PORTFOLIO « What you own »        | ⚠️ **Fusionner avec HOME.** Séparer « ton argent » de « ce que tu possèdes » est une distinction d'ingénieur, pas d'utilisateur                                                                                  |
| IMPACT « What your money does »   | ✅ **C'est le cœur du repositionnement.** Garder, nommer clairement                                                                                                                                              |
| EXPLORE « What you could own »    | ✅ Garder (= `discover` existant)                                                                                                                                                                                |
| IMPROVE « How to make it better » | ⚠️ **Ne pas en faire une section de navigation.** Une entrée permanente « améliore ton portefeuille » ressemble à une incitation commerciale. En faire une **action contextuelle** depuis n'importe quelle ligne |
| INVEST « Take action »            | ⚠️ Pas une section tant qu'il n'y a pas de courtier. Une action en fin de parcours                                                                                                                               |
| PROFILE « What matters to you »   | ✅✅ Garder, et **le promouvoir** : c'est là que vivent les préférences qui pilotent l'alignement. Aujourd'hui elles sont enterrées dans l'onboarding                                                            |

### IA recommandée — 4 onglets

```
┌──────────┬──────────┬──────────┬──────────┐
│ TON      │ CE QUE   │ EXPLORER │ TOI      │
│ ARGENT   │ ÇA FAIT  │          │          │
└──────────┴──────────┴──────────┴──────────┘
   ▲            ▲          ▲          ▲
   │            │          │          │
positions   Impact      univers   préférences
valeur      Profile     comparer  (pilotent
frais       preuves     fiches     l'alignement)
alertes     évolution
   │
   └── "simuler un changement" (What-if) accessible depuis toute ligne,
       jamais depuis la barre de navigation
```

**Quatre onglets contre les 8+ destinations actuelles.** Chaque route supprimée est
listée en §P.

### Principes de visualisation (brief §7 — validé et précisé)

> **Ne montre pas de la donnée ESG. Explique ce que la donnée signifie pour l'argent de la personne.**

- **Toujours en euros d'abord, en pourcentage ensuite.** « 164 € de ton argent financent
  des activités fossiles » bat « 3,4 % d'exposition fossile ». Le brief le fait déjà
  intuitivement (« €4,820 invested »), il faut l'ériger en règle.
- **Un chiffre par écran a le droit d'être gros.** Le reste est du corps de texte.
- **Chaque chiffre est cliquable et mène à sa preuve** (source, date, méthode, couverture)
  — le lineage existe en base, il faut le remonter.
- **Le trou de données est un élément de design de premier plan**, pas un `—` gris.
- **Zéro jauge circulaire, zéro feuille verte, zéro badge gamifié** (brief §14, validé).
- **La typo mono (IBM Plex Mono) porte les chiffres**, l'Inter porte le sens (DA §4,
  déjà en place). Ce contraste **est** l'argument visuel « factuel, pas militant ».

## K. Data architecture

### Tables à créer

| Table                        | Rôle                                                                                                                                                                                               | Prio  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `user_holdings`              | Ce que l'utilisateur possède réellement : `user_id`, `isin`/`asset_id`, `quantity`, `avg_price`, `currency`, `account_label`, `source` (`manual`/`csv`/`aggregator`), `as_of`. **RLS obligatoire** | 🔴 P0 |
| `user_preference_profile`    | Préférences au niveau **personne** (aujourd'hui sur `portfolios`), versionnées : `causes`, `cause_intensity`, `exclusions`, `risk_target`, `horizon_years`, `version`, `updated_at`. **RLS**       | 🔴 P0 |
| `security_activities`        | Titre → activité économique, avec source et part de revenus quand disponible. Les 5 axes de §E.1                                                                                                   | 🔴 P0 |
| `portfolio_impact_snapshots` | Photo horodatée d'un profil d'impact + versions de méthodologie, pour §I. **RLS**                                                                                                                  | 🟠 P1 |
| `impact_deltas`              | Deltas attribués à une cause (§I), dérivés de deux snapshots                                                                                                                                       | 🟠 P1 |
| `entitlements`               | Droits d'accès (free/premium), pour la monétisation. **RLS**                                                                                                                                       | 🟠 P1 |
| `issuer_controversies`       | Controverses par émetteur — **à ne créer qu'une fois la source licenciée**                                                                                                                         | 🟡 P2 |

### Tables à étendre (jamais casser — brief §15)

- `assets` : `taxonomy_aligned_pct`, `controversy_level` — **colonnes nullable, laissées
  vides tant que non sourcées.** Le gate `activation.ts` continue de protéger l'exposition.
- `securities` : peupler `sector`/`industry`/`country`, ajouter `activity_tags[]`.
- `profiles` : rien — les préférences vont dans leur propre table versionnée, parce
  qu'un historique de préférences est nécessaire pour §I (distinguer « la donnée a changé »
  de « tu as changé d'avis »).

### Tables à ne surtout pas toucher

`data_observations`, `data_sources`, `fund_documents`, `fund_holdings`, `securities`,
`catalog_instruments`, `catalog_imports`, `ingestion_jobs`, `ingestion_errors`,
`carbon_estimates`, `issuer_emissions`, `assets`, `asset_prices`, `asset_quotes`.
**Ce sont les actifs du moat. Ils s'étendent, ils ne se refactorisent pas.**

### Règle de lineage à généraliser

Toute valeur affichée à l'écran doit pouvoir répondre : _quelle source, quelle date
d'effet, quelle date de collecte, quelle méthode, quelle confiance, quelle fraîcheur_.
`data_observations` le permet déjà **par construction**. Le gap est d'usage, pas de
schéma : il faut (a) écrire systématiquement dans ce ledger, (b) un composant UI unique
« Pourquoi ? » qui le lit.

## L. Architecture technique — modules

```
src/lib/
├── holdings/          🔴 NOUVEAU — positions réelles
│   ├── parse-csv.ts          (formats courtiers FR/EU, tolérant)
│   ├── resolve.ts            (ISIN → assets, réutilise data-engine/isin.ts)
│   └── holdings.functions.ts (server fn, RLS)
├── alignment/         🔴 NOUVEAU — §F
│   ├── constraints.ts        (exclusions = drapeaux, pas de points)
│   ├── priorities.ts         (causes vs exposition réelle)
│   ├── shape.ts              (risque, horizon, frais, diversification)
│   └── alignment.ts          (composition + coverage + décomposition par ligne)
├── exposure/          🔴 NOUVEAU — « ce que ton argent finance »
│   ├── activities.ts         (les 5 axes, look-through)
│   └── aggregate.ts          (pondération + coverage, réutilise holdings-adapter)
├── whatif/            🟠 NOUVEAU — §H (généralise tradeoffs.functions.ts)
│   ├── substitute.ts         (A→B, symétrique par construction)
│   └── frictions.ts          (fiscalité, courtage, spread)
├── monitoring/        🟠 NOUVEAU — §I
│   ├── snapshot.ts
│   └── attribution.ts        (les 4 causes)
├── impact-profile/    🔴 NOUVEAU — composition des 5 dimensions (§G)
│
├── portfolio/  ✅ INCHANGÉ (engine, markowitz, metrics, overlap, tradeoffs…)
├── esg/        ✅ INCHANGÉ (classification, transparency, carbon-engine…)
├── data-engine/✅ INCHANGÉ (registry, connecteurs, quality, isin…)
├── impact/     ⚠️ à recentrer : `portfolioImpact.ts` devient un consommateur
│                  d'impact-profile plutôt que la source de vérité carbone
└── discover/   ⚠️ `impact.ts` (4 niveaux) à réconcilier avec le nouveau profil
```

**Zéro suppression dans `lib/`.** Tout le nouveau est additif ; deux modules sont
recentrés. C'est la garantie demandée par le brief §15, tenue au niveau du plan.

### Contraintes techniques à surveiller

- **Taille du bundle Edge** (Cloudflare Workers, limite dure). Le parsing CSV et
  l'agrégation d'exposition doivent rester côté serveur, jamais dans le bundle client.
- **Coût du look-through.** Agréger l'exposition sur un portefeuille de 12 lignes × 500
  holdings = 6 000 jointures par calcul. **À matérialiser** (table ou vue matérialisée),
  pas à calculer à chaque affichage.
- **`types.ts` auto-généré** : les nouvelles colonnes n'apparaissent qu'après
  régénération. Le repo a déjà la convention du cast localisé (`universe.server.ts`) —
  la suivre, ne pas éditer `types.ts`.
- **Tests** : `lib/alignment/`, `lib/exposure/`, `lib/whatif/` sont de la logique métier →
  couverture obligatoire (CLAUDE.md §8).

---

# PHASE 5 — BUSINESS & EXÉCUTION

## M. Monétisation

### Le fait qui commande tout

**Le coût dominant de Seedow n'est ni le serveur ni le développement : c'est la donnée.**
Un flux EET/SFDR licencié par ISIN, plus les controverses, est un coût **fixe annuel**,
largement indépendant du nombre d'utilisateurs. **HYP à valider par devis :** ordre de
grandeur **15–60 k€/an** pour un périmètre UCITS européen en entrée de gamme, avec
une clause de redistribution qui coûte plus cher que l'usage interne.

Cette structure de coûts a trois conséquences directes :

1. **Le point mort est un nombre d'abonnés, pas un taux de marge.** À 5 €/mois net,
   30 k€ de données = **~600 abonnés payants** juste pour la donnée.
2. **Le B2B n'est pas un « plus tard », c'est ce qui amortit la donnée.** Un seul contrat
   B2B à 30–80 k€/an couvre le coût fixe et rend le B2C structurellement rentable.
3. **⚠️ Piège juridique majeur : la plupart des licences ESG interdisent la
   redistribution.** Vendre une API construite sur un flux licencié **sans droit de
   redistribution est une rupture de contrat**, pas une zone grise. **DÉCISION : négocier
   le droit de redistribution dès le premier contrat de données**, même s'il coûte plus
   cher — ou construire le B2B **exclusivement sur les couches propriétaires Seedow**
   (look-through calculé depuis des documents publics, score Seedow, drapeaux
   greenwashing, alignement), qui, elles, sont redistribuables.

### Les quatre couches

**FREE — UNDERSTAND.** ✅ Validé, et le brief a raison : ne pas mettre la donnée
fondamentale derrière un paywall. C'est cohérent avec l'Autorité du `MOAT_BLUEPRINT`, ça
alimente le SEO (`observatoire`, `fonds/$isin` sont déjà publics), et ça fait la
différence avec un incumbent. Contenu : portefeuille, Impact Profile complet, alignement,
expositions principales, fiches fonds sourcées.

**PREMIUM — IMPROVE.** ⚠️ **Le prix de 4–7 €/mois est probablement mal calibré.**
Arguments contre le bas de fourchette :

- L'utilisateur qui a 20 k€ investis et paie 0,3 % de frais dépense 60 €/an sans y penser.
  Un outil qui lui montre qu'il paie 40 € de trop se vend plus cher que 4 €/mois.
- Un prix bas attire les curieux (churn élevé) et exclut le prix de la donnée.
- Un prix bas sur un produit d'analyse financière signale « pas sérieux ».

**Recommandation : 8–12 €/mois, ou 79–99 €/an** (l'annuel comme offre mise en avant :
il résout le churn mensuel, qui est la vraie menace d'un produit consulté 4× par an).
**Et un test de prix dès les 100 premiers payants** — pas une décision a priori.

Contenu premium (aligné sur la valeur, pas sur la friction) : What-if illimité,
historique complet et attribution des deltas, alertes personnalisées, comparaisons
multiples, rapports exportables, multi-portefeuilles/multi-comptes.
**Contenu qui ne doit JAMAIS être premium** : la révélation d'un problème. Si le
portefeuille de l'utilisateur viole une exclusion qu'il a posée, il l'apprend en gratuit.
Facturer l'alerte serait un dark pattern (§1.5).

**INVEST — ACT.** ✅ Validé sur le principe (courtier partenaire, pas de custody).
⚠️ Mais **l'affiliation courtier crée un conflit d'intérêts** avec « sans jamais rien
vendre ». Si Seedow touche une commission quand l'utilisateur ouvre un compte chez le
courtier X, Seedow a un intérêt à orienter vers X. **DÉCISION à trancher franchement :**
soit passerelle **non rémunérée** (pure valeur d'usage, cohérence maximale), soit
rémunération **publiée à l'écran** (« Seedow perçoit N € si tu ouvres ce compte »).
La troisième option — commission silencieuse — est incompatible avec le §1.1 du CLAUDE.md
et détruirait l'actif le plus précieux : la crédibilité.

**B2B — POWER.** ✅✅ **C'est le meilleur modèle du dossier et il est sous-estimé dans le
brief.** Marge logicielle, coût marginal quasi nul, amortit la donnée, et vend une chose
qu'aucun client B2B ne veut construire (le look-through + la traçabilité). Clients :
néobanques, courtiers en ligne, assureurs-vie/PER, conseillers en gestion de patrimoine,
CSE/épargne salariale. Sous réserve de la clause de redistribution ci-dessus.

## N. Unit economics

> **Tous les chiffres ci-dessous sont des HYP.** Traction réelle = UNKNOWN (bêta
> gratuite, aucun revenu — FACT `tarifs.tsx`). Ce modèle sert à identifier les
> **seuils de bascule**, pas à prévoir un chiffre d'affaires.

### Hypothèses de base

| Paramètre                       | Bear      | Base      | Bull      | Commentaire                                                                                                                        |
| ------------------------------- | --------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Conversion Free → Premium       | 1,5 %     | 3 %       | 6 %       | 3 % est la médiane fintech B2C ; >6 % suppose un problème très douloureux                                                          |
| ARPU premium (mensuel effectif) | 5 €       | 8 €       | 11 €      | après mix annuel/mensuel                                                                                                           |
| Churn mensuel                   | 8 %       | 5 %       | 3 %       | **le vrai risque** : produit consulté 4×/an                                                                                        |
| Durée de vie (1/churn)          | 12,5 mois | 20 mois   | 33 mois   |                                                                                                                                    |
| **LTV**                         | **63 €**  | **160 €** | **363 €** | hors coûts variables                                                                                                               |
| CAC (organique + contenu)       | 40 €      | 20 €      | 8 €       | l'Observatoire/SEO est le levier                                                                                                   |
| **LTV/CAC**                     | **1,6**   | **8,0**   | **45**    | <3 = non viable                                                                                                                    |
| Coût données (fixe/an)          | 60 k€     | 30 k€     | 15 k€     | dominant                                                                                                                           |
| Infra/user/an                   | 1,20 €    | 0,60 €    | 0,30 €    | Workers + Supabase, faible                                                                                                         |
| Coût IA (Ethi)/user actif/an    | 6 €       | 3 €       | 1,50 €    | **à surveiller** : peut dépasser l'ARPU sur un utilisateur bavard → plafond d'usage nécessaire (`ethi_rate_limits` existe déjà ✅) |

### Scénarios

**1 000 utilisateurs**

|               | Bear       | Base       | Bull      |
| ------------- | ---------- | ---------- | --------- |
| Payants       | 15         | 30         | 60        |
| Revenu annuel | 900 €      | 2 880 €    | 7 920 €   |
| Coût données  | 60 k€      | 30 k€      | 15 k€     |
| **Résultat**  | **−60 k€** | **−28 k€** | **−8 k€** |

> **Verdict : à 1 000 utilisateurs, le B2C ne finance rien, quel que soit le scénario.**
> C'est structurel, pas un problème d'exécution. **Ce palier doit être financé
> autrement : subvention/levée, ou premier contrat B2B.** Toute stratégie qui suppose
> l'autofinancement à ce stade est fausse.

**10 000 utilisateurs**

|                              | Bear       | Base       | Bull        |
| ---------------------------- | ---------- | ---------- | ----------- |
| Payants                      | 150        | 300        | 600         |
| Revenu B2C                   | 9 k€       | 28,8 k€    | 79,2 k€     |
| + 1 contrat B2B              | 0          | 40 k€      | 80 k€       |
| Coûts (données + infra + IA) | 78 k€      | 42 k€      | 24 k€       |
| **Résultat**                 | **−69 k€** | **+27 k€** | **+135 k€** |

> **Verdict : c'est ici que tout se joue, et le facteur décisif n'est pas le B2C —
> c'est le premier contrat B2B.** Le scénario Base est rentable _uniquement_ grâce à lui.
> **Conséquence stratégique : commencer la prospection B2B bien avant 10 k utilisateurs.**
> Le brief place le B2B en 4ᵉ couche ; il devrait être en 2ᵉ.

**100 000 utilisateurs**

|                                                 | Bear       | Base        | Bull          |
| ----------------------------------------------- | ---------- | ----------- | ------------- |
| Payants                                         | 1 500      | 3 000       | 6 000         |
| Revenu B2C                                      | 90 k€      | 288 k€      | 792 k€        |
| B2B (1 / 3 / 6 contrats)                        | 40 k€      | 150 k€      | 400 k€        |
| Revenu passerelle courtier                      | 0          | 30 k€       | 100 k€        |
| Coûts (données étendues + infra + IA + support) | 200 k€     | 180 k€      | 170 k€        |
| **Résultat**                                    | **−70 k€** | **+288 k€** | **+1 122 k€** |

> **Verdict : même à 100 k utilisateurs, le scénario Bear perd de l'argent.** Un churn à
> 8 % avec un ARPU à 5 € ne devient jamais rentable, quelle que soit l'échelle. **Le
> churn est la variable la plus importante du modèle — plus que la conversion, plus que
> le CAC.** D'où la priorité absolue de §I (boucle de rétention) et de l'offre annuelle.

### Les trois chiffres à surveiller en priorité

1. **Churn mensuel.** Au-dessus de 6 %, le modèle ne fonctionne à aucune échelle.
2. **Date du premier contrat B2B.** C'est ce qui décide de la rentabilité à 10 k.
3. **Coût IA par utilisateur actif.** Peut silencieusement dépasser l'ARPU.

### Sur INVEST (encours)

Revenu potentiel : 0,2–0,5 %/an d'encours en apport d'affaires ; 0,5–1 % en gestion —
**mais la gestion exige l'agrément (PSI/CIF, MiFID, KYC/LCB-FT)**, un coût de conformité
récurrent à six chiffres et une équipe dédiée. **Recommandation : ne pas y aller avant
une levée dédiée.** L'apport d'affaires reste accessible et suffit à prouver l'activation.

## O. Roadmap

### Horizon 1 — « Seedow lit ton argent » (T1–T2)

Objectif : **franchir le mur n°1.** Sans lui, rien d'autre ne compte.

- `user_holdings` + saisie manuelle + import CSV
- Préférences au niveau personne (`user_preference_profile`)
- **User Alignment v1** (§F) — le premier chiffre vraiment propriétaire
- Impact Profile 5 dimensions (§G), avec trous assumés
- Composant transverse « Pourquoi ? » branché sur `data_observations`
- IA resserrée à 4 onglets (§J) + suppressions (§P)
- **DÉCISION en parallèle : achat du flux ESG** (le blocage est commercial, pas technique)

### Horizon 2 — « Seedow te montre les conséquences » (T3)

- Exposition par activité (les 5 axes) en look-through
- What-if v1 : substitution A→B symétrique, avec frictions (§H)
- Comparateur symétrique actif↔actif
- Premium + `entitlements` + facturation
- **Démarrage de la prospection B2B** (voir §N : c'est en avance sur le calendrier du brief)

### Horizon 3 — « Seedow suit ton argent » (T4)

- Snapshots + attribution des deltas (§I)
- Alertes événementielles + bilan trimestriel
- Méthodologie obligataire (corporate + souverain — §E.2)
- Passerelle courtier (décision de rémunération tranchée)

### Horizon 4 — « Seedow équipe les autres » (année 2)

- API Impact Intelligence (sous réserve des droits de redistribution)
- Controverses + taxonomie (si licenciées)
- Extension de l'univers activable

## P. Keep / Change / Remove / Build / Reposition

### KEEP — ne pas toucher

`data_observations` & tout le lineage · `data-engine/*` (registry, connecteurs, quality,
isin, activation gate) · `sustainability-classification.ts` (découplage SFDR) ·
`transparency.ts` (greenwashing) · `carbon-engine.ts` + `carbon.ts` (PCAF, coverage) ·
`overlap.ts` (look-through) · `portfolio/engine.ts` & optimiseur · `catalog_instruments` ·
`observatoire` + `fonds/$isin` (l'Autorité, et le seul SEO du produit) ·
`methodologie.tsx` · la DA (Inter/IBM Plex Mono, tokens) · les tests.

### CHANGE

| Quoi                                         | Vers quoi                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `portfolios` = simulation                    | Coexistence : **portefeuille réel** (analysé) + **simulation** (explicitement étiquetée)                           |
| Préférences sur `portfolios`                 | Préférences sur la **personne**, versionnées                                                                       |
| `esg_score` unique 0–100 en tête d'écran     | **User Alignment** en tête, dimensions en dessous                                                                  |
| `discover/impact.ts` (4 niveaux qualitatifs) | Réconcilié avec l'Impact Profile — une seule échelle dans toute l'app                                              |
| `comparatif.tsx` (vs MSCI World uniquement)  | Comparateur symétrique universel                                                                                   |
| `certificat.tsx`                             | Rapport d'impact partageable, sourcé — ou supprimé (voir REMOVE)                                                   |
| `tarifs.tsx` (placeholder)                   | Vraie grille Free/Premium                                                                                          |
| Ethi : assistant généraliste                 | **Explicateur du portefeuille de l'utilisateur** — c'est son avantage unique, et c'est aussi ce qui borne son coût |

### REMOVE ou FUSIONNER — la surface est trop large

| Route                                                                          | Verdict                                                              | Raison                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vote.tsx` + `vote.$resolutionId.tsx` + `agm_resolutions` + `resolution_votes` | **⚠️ Supprimer ou sortir du produit**                                | Le vote en AG suppose une détention directe et des droits de vote que Seedow ne peut pas exercer. Feature la plus éloignée de la vision, et la plus coûteuse à maintenir |
| `wrapped.tsx`                                                                  | **Fusionner** dans le bilan annuel de §I                             | Sinon 4ᵉ boucle de rétention concurrente                                                                                                                                 |
| `communaute.tsx` + `portfolio_shares`                                          | **Geler**                                                            | Partage social de portefeuille = risque de recommandation entre pairs + zéro preuve de rétention                                                                         |
| `le-fil.tsx` + `reveil.tsx`                                                    | **Fusionner en une seule** boucle « Ton argent a changé »            | Deux features occupant le même terrain                                                                                                                                   |
| `construire.tsx`                                                               | **Fusionner** avec onboarding/simulation                             | Redondant                                                                                                                                                                |
| `certificat.tsx`                                                               | **Décision** : garder seulement s'il devient le rapport sourcé de §I | Aujourd'hui c'est un objet de partage, pas d'information                                                                                                                 |
| `cours/*`                                                                      | **Garder mais figer**                                                | Bon pour Léa et le SEO, mais aucun développement nouveau                                                                                                                 |

> **~8 routes en moins. C'est ce qui rend le reste finançable en temps de développement.**
> Le brief demande de construire 5 gros modules ; sans coupe, l'équipe n'en livrera aucun.

### BUILD

`lib/holdings/` · `lib/alignment/` · `lib/exposure/` · `lib/impact-profile/` ·
`lib/whatif/` · `lib/monitoring/` · composant « Pourquoi ? » · `entitlements` + paywall.

### REPOSITION — existe, mal raconté

| Ce qui existe                           | Ce que ça devient                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `tradeoffs.functions.ts`                | Le **What-if**, avec la symétrie déjà intégrée                                                                                       |
| `overlap.ts`                            | La preuve « tes 3 ETF, c'est en fait les mêmes 400 entreprises » — **l'argument le plus frappant du produit, aujourd'hui invisible** |
| `transparency.ts` + `observatoire`      | L'**Autorité** : le contenu qui amène le trafic gratuit                                                                              |
| `carbon-engine.ts` + `sourced_coverage` | La preuve de sérieux méthodologique : « on distingue ce qu'on mesure de ce qu'on estime »                                            |
| `data_observations`                     | **« Pourquoi ? »** — le geste signature du produit                                                                                   |
| `esg-alert.ts` + `alerts`               | Le déclencheur de la boucle de rétention                                                                                             |

## Q. Risques et faiblesses méthodologiques

| #   | Risque                                                                                 | Gravité     | Mitigation                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Requalification en conseil en investissement** (IMPROVE, What-if)                    | 🔴 Critique | Conception §H : initiative à l'utilisateur, symétrie codée, aucun tri par « meilleur ». **Faire valider par un avocat AMF avant de livrer What-if**                |
| 2   | **Absence de source ESG licenciée**                                                    | 🔴 Critique | Décision d'achat. Sans elle : Impact Profile à 4 dimensions assumées, pas 8                                                                                        |
| 3   | **Le portefeuille n'est pas réel**                                                     | 🔴 Critique | P0 absolu : `user_holdings`                                                                                                                                        |
| 4   | **Fraîcheur des compositions** (1–3 mois de retard)                                    | 🟠 Élevé    | `as_of` affiché systématiquement ; jamais « actuel »                                                                                                               |
| 5   | **Confusion impact / alignement** — un portefeuille aligné ne réduit aucune émission   | 🟠 Élevé    | Écrit sur `/methodologie` **et** dans l'UI. Ne jamais dire « ton impact » là où on mesure une exposition                                                           |
| 6   | **Couverture partielle présentée comme complète**                                      | 🟠 Élevé    | `coverage` obligatoire dans chaque type de retour. Déjà la convention du repo                                                                                      |
| 7   | **Droits de redistribution B2B**                                                       | 🟠 Élevé    | Négocier dès le 1ᵉʳ contrat, ou B2B sur les seules couches propriétaires                                                                                           |
| 8   | **Churn > 6 %** → modèle non viable à toute échelle                                    | 🟠 Élevé    | Offre annuelle mise en avant + boucle événementielle §I                                                                                                            |
| 9   | **Green/social bonds affichés mais non analysés**                                      | 🟠 Élevé    | Corriger (§E.2) ou cesser d'afficher la distinction. Incohérence avec l'Observatoire                                                                               |
| 10  | **Coût IA > ARPU** sur un utilisateur intensif                                         | 🟡 Moyen    | `ethi_rate_limits` existe ✅ ; ajouter un plafond par palier                                                                                                       |
| 11  | **Sur-promesse du What-if** (« +6 points d'impact ») ignorant fiscalité et frais       | 🟡 Moyen    | Frictions obligatoires à l'écran (§H)                                                                                                                              |
| 12  | **Copiabilité** : un concurrent bien financé achète le même flux ESG                   | 🟡 Moyen    | Le moat n'est pas la donnée achetée, c'est **holdings look-through + lineage + alignement + Autorité**. Ne jamais positionner Seedow sur « on a de la donnée ESG » |
| 13  | **Conflit d'intérêts de l'affiliation courtier**                                       | 🟡 Moyen    | Non rémunéré, ou rémunération publiée à l'écran                                                                                                                    |
| 14  | **Surface produit ingérable**                                                          | 🟡 Moyen    | Coupes du §P, à faire **avant** de construire                                                                                                                      |
| 15  | **Le score Seedow devient une cible de critique publique** (comme tous les scores ESG) | 🟡 Moyen    | Méthodologie versionnée et publiée ✅ déjà fait ; ajouter un droit de réponse comme sur l'Observatoire                                                             |

## R. Séquence d'implémentation recommandée

### 🔴 P0 — sans ça, rien n'a de sens

1. **DÉCISION : achat du flux ESG/SFDR** — lancer les devis cette semaine. Le blocage
   n'est pas technique, il est commercial, et il conditionne 6 chantiers. C'est l'action
   à plus fort effet de levier du document.
2. **`user_holdings` + saisie manuelle** — le plus petit chemin vers un portefeuille réel
   (12 lignes saisies à la main valent mieux qu'un agrégateur parfait dans 6 mois).
3. **`user_preference_profile`** — préférences au niveau personne, versionnées.
4. **`lib/alignment/` + User Alignment v1** — le premier chiffre que personne ne peut copier.
5. **Impact Profile 5 dimensions** (§G) — remplacer le score unique en tête d'écran.
6. **Composant « Pourquoi ? »** — rendre visible le lineage qui existe déjà. Peu de code,
   effet maximal sur la crédibilité.
7. **Import CSV** — les formats des 4-5 courtiers dominants en France.
8. **Coupes du §P** — avant, pas après.

### 🟠 P1 — ce qui fait la différence concurrentielle

9. `security_activities` + exposition par activité (les 5 axes)
10. What-if v1 avec frictions et symétrie — **après validation juridique**
11. Comparateur symétrique actif↔actif
12. Snapshots + attribution des deltas
13. Alertes événementielles (fusion `le-fil`/`reveil`)
14. Premium + `entitlements` + facturation
15. **Prospection B2B** (décisif pour la rentabilité à 10 k — cf. §N)
16. Méthodologie obligataire : corporate + souverain
17. Fonds monétaire / Livret A (§E.4) — fort effet narratif, coût faible

### 🟡 P2 — plus tard, ou seulement si financé

18. Agrégation de comptes (Powens/Bridge — coût récurrent, à arbitrer contre le CSV)
19. Controverses (si licenciées)
20. Taxonomie UE / exposition activité durable (si licenciée)
21. Passerelle courtier
22. API B2B publique
23. Green bonds (use of proceeds) — **et non, pas les sustainability-linked bonds**
24. Actions individuelles

---

## Annexe — Réponse directe aux points du brief

| Point du brief                                         | Verdict                                                                     | Où             |
| ------------------------------------------------------ | --------------------------------------------------------------------------- | -------------- |
| Vision UNDERSTAND→MEASURE→IMPROVE→INVEST               | ✅ Adoptée, + MONITOR, + preuve d'action déclarative                        | §A             |
| « Personalized Money Impact Intelligence »             | ✅ Adopté, précisé : _couche de lecture indépendante_                       | §B             |
| Moat en 7 points                                       | ✅ 5 sur 7 déjà en place ; le vrai moat est holdings + lineage + alignement | §0, §Q-12      |
| Ne pas confondre ESG Risk / Impact / Alignement / SFDR | ✅✅ Le repo le fait déjà mieux que le brief ne l'imagine                   | §D             |
| ETF ≠ entreprise, look-through                         | ✅ Moteur prêt (`overlap.ts`) ; manque la classification d'activité         | §E.1           |
| Obligations : 4 types distincts                        | ⚠️ Corporate + souverain oui ; green bonds P2 ; **SLB : ne pas faire**      | §E.2           |
| Impact Profile 8 dimensions                            | ❌ **5 dimensions.** 3 des 8 sont non sourçables aujourd'hui                | §G             |
| « Overall profile : 81 »                               | ❌ **Supprimer** — contredit le brief lui-même                              | §0 mur n°4, §G |
| What-if « Seedow propose ETF B »                       | ⚠️ **Re-concevoir** : l'utilisateur choisit, Seedow calcule                 | §H             |
| Monthly Impact                                         | ⚠️ **Événementiel + trimestriel**, pas mensuel                              | §I             |
| IA en 7 sections                                       | ⚠️ **4 onglets** ; IMPROVE et INVEST sont des actions, pas des sections     | §J             |
| Premium 4–7 €/mois                                     | ⚠️ **8–12 €/mois ou 79–99 €/an**, à tester                                  | §M             |
| B2B en 4ᵉ couche                                       | ❌ **En 2ᵉ.** C'est lui qui amortit la donnée et décide de la rentabilité   | §M, §N         |
| Ne rien casser                                         | ✅ Tenu : zéro suppression dans `lib/`, deux modules recentrés              | §L             |
