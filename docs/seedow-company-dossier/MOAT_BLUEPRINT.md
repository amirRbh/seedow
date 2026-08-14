# SEEDOW — Moat Blueprint (plan d'exécution)

> Objectif : transformer l'avance produit de Seedow (copiable) en **moat défendable**. Convention FACT/OBJECTIF conservée. Ancré sur le code réel (`src/lib/data-engine`, `src/lib/esg`, routes publiques). Hypothèse d'équipe : petite (fondateur + 1-2). Effort : **S** (≤3 j) · **M** (≤2 sem) · **L** (≤1 mois).

## 1. Thèse — deux actifs qui composent

**Le moat n'est pas une feature, c'est un actif qui grandit tout seul et coûte cher à rattraper.** Deux, qui se renforcent :

1. **Le Socle** — base ESG + holdings **large, fraîche, multi-sources, traçable au champ (source + date + couverture)**. Compose : chaque fonds, chaque jour d'historique, chaque source réconciliée creuse l'écart.
2. **L'Autorité** — cette donnée rendue **publique et citable** (observatoire greenwashing, pages fonds sourcées, droit de réponse). Un acteur qui _vend des produits_ ne peut pas être le tiers neutre. Terrain que les incumbents ne peuvent pas occuper crédiblement.

**La boucle** : Socle → Autorité (trafic + earned media + SEO) → demande B2C/B2B → revenu → plus de Socle. Plus **effet réseau bon marché** : `fund_requests` priorise l'ingestion là où la demande est.

## 2. Pourquoi ce moat (vs alternatives)

| Levier                                 | Défendabilité                       | Coût / risque                    | Verdict                               |
| -------------------------------------- | ----------------------------------- | -------------------------------- | ------------------------------------- |
| **Socle data + Autorité**              | Élevée (compose, légalement propre) | Faible-moyen, capital-efficient  | **✅ On y va**                        |
| Switching cost par exécution (custody) | Élevée                              | Très élevé (agrément, MiFID/KYC) | Plus tard, si financé                 |
| Effet réseau Vote/Bloc                 | Incertaine                          | Moyen                            | Garder comme option, ne pas prioriser |
| Marque seule                           | Faible sans data                    | Faible                           | Sous-produit de l'Autorité            |

## 3. État de départ (FACT — audit du code)

| Brique                                                         | Existe                                        | Manque                                                         |
| -------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Hiérarchie de sources (priorité 1-4, légal/robots/attribution) | ✅ `registry.ts`                              | Activer Amundi/Vanguard/AMF (déclarés, pas codés)              |
| Runner d'ingestion (ne casse jamais)                           | ✅ `engine.ts`                                | File pilotée par la demande                                    |
| Traçabilité au champ (`Observation` + source + validation)     | ✅ `connectors/types.ts`                      | Propager source+asOf+coverage jusqu'à `assets` de bout en bout |
| Parsing de factsheet                                           | ✅ `lib/esg/factsheet-parser.ts`              | Généraliser multi-émetteurs                                    |
| Qualité / fraîcheur / complétude / dédup / ISIN                | ✅ `quality.ts`, `completeness.ts`, `isin.ts` | **Route dashboard** (fonctions pures non exposées)             |
| Connecteur réel                                                | ✅ **iShares uniquement**                     | Amundi, Vanguard, AMF GECO                                     |
| Aperçu ESG public                                              | ✅ `api.public.esg-preview.ts`                | Pages publiques SEO + index observatoire                       |
| Greenwashing (heuristique motivée)                             | ✅ `lib/esg/transparency.ts`                  | Découpler de SFDR (signaux bruts)                              |
| Demande utilisateur                                            | ✅ table `fund_requests`                      | Boucler sur la priorisation d'ingestion                        |
| Cron horaire                                                   | ✅ `hooks/refresh-market-data`                | Étendre à la ré-ingestion docs par staleness                   |

**Diagnostic** : l'architecture du moat est faite ; **le moat, non**. Manque = largeur, fraîcheur, diversité de sources, et la couche publique d'autorité.

## 4. Le plan — 4 phases, tickets concrets

### Phase A — Finir la fondation (Sem. 1-2)

| #   | Ticket                                                                | Fichiers                                                       | Effort | Dépend          | KPI                    |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------- | ------ | --------------- | ---------------------- |
| A1  | Connecteur **Amundi** (document officiel → Observations)              | `data-engine/connectors/amundi.ts` (nouv.), `factsheet-parser` | M      | registry (fait) | +1 source active       |
| A2  | Connecteur **Vanguard** UCITS                                         | `connectors/vanguard.ts` (nouv.)                               | M      | A1 (pattern)    | +1 source active       |
| A3  | **AMF GECO** (identité/DICI fonds FR)                                 | `connectors/amf-geco.ts` (nouv.)                               | M      | —               | identité sourcée niv.1 |
| A4  | Propager **source+asOf+coverage** jusqu'à `assets` (bout en bout)     | `persist.supabase.ts`, `assets` cols (déjà partielles)         | M      | —               | % champs tracés        |
| A5  | **Route dashboard « Data health »** (admin) branchée sur `quality.ts` | `routes/_authenticated/admin.data.tsx` (nouv.)                 | S-M    | has_role        | visibilité interne     |

### Phase B — Largeur + fraîcheur (Sem. 3-6)

| #   | Ticket                                                                                            | Effort | KPI cible             |
| --- | ------------------------------------------------------------------------------------------------- | ------ | --------------------- |
| B1  | Passer ~58 → **150+ fonds** sur données réelles sourcées (pas seeds)                              | L      | coverage ≥ 150        |
| B2  | **Boucle de fraîcheur** : cron ré-ingère les docs périmés (`staleDays`) → `ingestion_jobs/errors` | M      | % frais < 30 j ≥ 90 % |
| B3  | **File pilotée par la demande** : `fund_requests` → priorité d'ingestion                          | M      | délai demande→analyse |
| B4  | **Stocker les signaux bruts** (exclusions, WACI, implied temp rise) pas seulement l'article SFDR  | M      | robuste SFDR 2.0      |

### Phase C — Autorité (Sem. 6-10)

| #   | Ticket                                                                                                                      | Effort | KPI cible              |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| C1  | Pages publiques **« Ce fonds est-il vraiment vert ? »** (par ISIN), sourcées/datées, SEO                                    | L      | pages indexées         |
| C2  | **Observatoire du greenwashing** : index public ranké/flaggé, chaque chiffre sourcé + **droit de réponse** (CLAUDE.md §1.2) | M      | backlinks / citations  |
| C3  | **Méthodologie publique versionnée** (route `methodologie` existe)                                                          | S      | transparence auditable |

### Phase D — Monétiser le moat (Mois 3+)

| #   | Ticket                                                                          | Effort | KPI          |
| --- | ------------------------------------------------------------------------------- | ------ | ------------ |
| D1  | **API/licence data ESG & greenwashing** B2B (graine : `api.public.esg-preview`) | L      | 1 pilote B2B |

## 5. KPIs du moat (tableau de bord)

| Indicateur                              | Départ     | 90 j (OBJECTIF)  |
| --------------------------------------- | ---------- | ---------------- |
| Fonds sur données réelles sourcées      | ~0 (seeds) | ≥ 150            |
| Connecteurs actifs                      | 1          | ≥ 4              |
| % champs ESG/carbone avec source + date | partiel    | ≥ 90 %           |
| % données fraîches (< 30 j)             | UNKNOWN    | ≥ 90 %           |
| Pages autorité indexées                 | 0          | ≥ 100            |
| Citations / backlinks externes          | 0          | premiers signaux |
| Volume « Demander l'analyse »           | UNKNOWN    | en hausse        |

## 6. Coûts & ressources (ESTIMATION honnête)

- **Dev** : le gros du travail (connecteurs, robustesse parsing, pages) — 1 dev à temps plein sur 10 semaines. Le parsing multi-émetteurs (formats de factsheet hétérogènes) est le vrai poste d'effort, pas l'architecture.
- **Données** : rester sur sources **officielles/open** (priorité 1-2 du registry) → **coût ~0**. Éviter le commercial (MSCI/Sustainalytics premium, priorité 4) tant que le B2B ne le finance pas.
- **Juridique** : revue des conditions de réutilisation par émetteur (le registry documente déjà termsUrl/robots) — ponctuel.
- **Infra** : négligeable (ingestion sur cron existant).

## 7. Risques spécifiques au moat

| Risque                                          | Mitigation                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Formats de factsheet cassants (parsing fragile) | Validation stricte + `review_required` (déjà dans le runner) ; ne jamais publier une donnée non validée       |
| Conditions de réutilisation d'un émetteur       | Registry `termsUrl`/`robotsAllowed` ; document officiel téléchargé, pas de scraping dynamique (§23 déjà codé) |
| SFDR 2.0 périme la classification               | B4 : stocker les signaux bruts, dériver le label à l'affichage                                                |
| Dépendance donnée commerciale coûteuse          | Rester priorité 1-2 ; commercial = fallback financé par le B2B                                                |
| Autorité = risque réputationnel (flag injuste)  | Droit de réponse (C2), « drapeau à vérifier » pas verdict (déjà l'ADN de `transparency.ts`)                   |

## 8. Definition of Done / jalons de validation

- **Fin Phase A** : ≥ 3 connecteurs actifs, dashboard data-health visible, provenance de bout en bout. → _tu valides avant Phase B._
- **Fin Phase B** : ≥ 150 fonds réels, fraîcheur automatisée, signaux bruts stockés.
- **Fin Phase C** : observatoire public en ligne, premières pages indexées.
- **Fin Phase D** : premier pilote B2B.

## 9. Le fil rouge

Chaque euro et chaque jour vont d'abord à **la donnée et à sa mise en visibilité publique** — le seul actif que Seedow peut posséder et qu'un incumbent ne peut pas simplement recopier. Tout le reste (features, UX) sert ce moat, pas l'inverse.
