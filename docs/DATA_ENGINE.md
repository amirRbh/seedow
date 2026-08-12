# Seedow Data Engine

> Architecture data-first pour maximiser les données **gratuites, officielles et
> légalement réutilisables** sur les ETF/fonds européens, tout en restant prête
> à brancher des fournisseurs premium en _fallback_ futur.
>
> Principe fondateur (§9) : **on n'invente jamais**. Une donnée absente reste
> `null` / `unknown` — la crédibilité prime sur la couverture.

---

## 1. Audit de l'existant (ÉTAPE 1)

### Ce qui existe et fonctionne

| Brique                 | Fichier / table                                   | État                                                                 |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Univers d'actifs       | table `assets` (~82 tickers, seed manuel)         | ✅ modèle plat identité + ESG + TER + `cause_exposure`               |
| Cotations              | `asset_quotes`, `asset_prices` + `lib/market/`    | ✅ ingestion horaire Yahoo (`hooks/refresh-market-data`)             |
| ESG sourcé             | `lib/esg/ingest.functions.ts`                     | ✅ admin-gated, **provenance obligatoire** (source + date `as of`)   |
| Parsing factsheet      | `lib/esg/factsheet-parser.ts`                     | ✅ parse PDF iShares/MSCI, `null` si absent, garde-fous plausibilité |
| Transparence           | `lib/esg/transparency.ts`, `DiscoverAsset`        | ✅ `DataCoverage` + score greenwashing affichés, jamais cachés       |
| Historisation scores   | `asset_score_history` + trigger `snapshot_scores` | ✅ empile ESG/SFDR + alertes sur baisse                              |
| Demande de fonds (log) | `fund_rejections`                                 | 🟡 existe pour « pas assez vert », pas pour « fonds inconnu »        |

### Ce qui est fragile

- **ISIN quasi vides** : `assets.isin` est `NULL` sur la majorité des lignes → pas
  de clé de jointure fiable vers documents/holdings.
- **Colonnes fournisseur hors types** : `waci_*`, `msci_*`, `esg_data_asof` lues
  via `select(string)` + cast (cf. `universe.server.ts`) car `types.ts`
  auto-généré n'est pas régénéré → dette de typage assumée mais fragile.
- **Seed par migrations manuelles** : chaque vague d'univers = une migration
  écrite à la main. Ne passe pas à l'échelle au-delà de ~100 fonds.

### Ce qui manque (comblé par ce Data Engine)

Holdings · titres sous-jacents · documents officiels · **ledger de provenance
générique** · registre de sources · score de complétude · validation de
plausibilité · demande de fonds inconnu · validation/normalisation ISIN ·
recherche multi-alias · abstraction connecteur · monitoring d'ingestion.

### Ce qui est réutilisé (pas de réarchitecture parallèle)

Le Data Engine **prolonge** `assets` (= « fund »), **réutilise** le parser
factsheet, le contrat de provenance de `ingest.functions.ts`, et le pattern
`asset_score_history` pour l'historisation. Aucune fonctionnalité supprimée.

---

## 2. Architecture data-first (ÉTAPES 2 & 4)

```
Source (registry) → Connector → RawData → Parser → Normalizer
   → Validator → Confidence → Canonical DB → API Seedow → Frontend
```

### Modèle logique (adapté à la stack existante)

- **`assets`** = FUND (identité, frais, indice, SFDR, ESG agrégé) — table existante, étendue.
- **`securities`** = titres sous-jacents (entreprises).
- **`fund_holdings`** = composition, **historisée** par `as_of` (§13), poids + provenance.
- **`fund_documents`** = KID/DICI/prospectus/factsheet/SFDR/rapport annuel.
- **`data_observations`** = **ledger de provenance** générique : chaque valeur
  atomique (`field`, `value`, `source`, `reference_date`, `confidence`, `validation`).
- **`data_sources`** = miroir DB du `SOURCE_REGISTRY`.
- **`fund_requests`** = demandes de fonds inconnus (§27).
- **`ingestion_jobs` / `ingestion_errors`** = monitoring (§20/§21).

Migration : `supabase/migrations/20260812130000_data_engine_foundation.sql`
(toutes tables RLS activée, écritures `service_role`, lectures `authenticated`).

### Code (`src/lib/data-engine/`)

| Module                  | Rôle                                                                           | Testé |
| ----------------------- | ------------------------------------------------------------------------------ | ----- |
| `isin.ts`               | validation Luhn ISO 6166, normalisation, pays (§16/§21)                        | ✅    |
| `validation.ts`         | plausibilité TER/poids/somme/date → statut de validation (§11)                 | ✅    |
| `completeness.ts`       | Fund Completeness Score interne 0-100 + ventilation (§8)                       | ✅    |
| `search.ts`             | parse requête, alias, matcher ISIN/ticker/nom/indice (§16)                     | ✅    |
| `sources/registry.ts`   | `SOURCE_REGISTRY` typé + arbitrage de priorité (§4/§23)                        | ✅    |
| `connectors/types.ts`   | contrat du pipeline (Connector/Observation/Confidence, §5)                     | —     |
| `connectors/ishares.ts` | connecteur iShares : factsheet → observations sourcées (§5/§10)                | ✅    |
| `engine.ts`             | runner d'ingestion + filtres de publication (§5/§17/§20)                       | ✅    |
| `persist.ts`            | observations → `data_observations` + colonnes canoniques `assets` (§3/§11/§24) | ✅    |
| `persist.supabase.ts`   | adaptateur Supabase de l'`ObservationWriter` (I/O server-only)                 | —     |

---

## 3. Provenance & hiérarchie des sources (§3/§4)

Chaque donnée porte : `source`, `source_url`, `reference_date`, `retrieved_at`,
`confidence`, `method`, `validation_status`. Une donnée sans source identifiable
n'est pas considérée fiable.

| Priorité | Type                                                | Exemples                          |
| -------- | --------------------------------------------------- | --------------------------------- |
| **1**    | régulateur / document officiel / société de gestion | AMF-GECO, KID/DICI, factsheets    |
| **2**    | open data / API publique exploitable                | data.gouv, APIs institutionnelles |
| **3**    | financier public secondaire                         | Yahoo Finance (cotations)         |
| **4**    | commercial — **fallback futur uniquement (§22)**    | (aucun en V1)                     |

Arbitrage : `preferredSource(a, b)` — la priorité la plus forte gagne sur un même
champ. `PremiumProviderAdapter` s'ajoute plus tard sans refonte (§22).

### Légal (§23)

Le `SOURCE_REGISTRY` documente pour chaque source : URL, type, `terms_url`,
`robots_allowed`, automatisation, attribution, restrictions. **Priorité aux APIs
officielles, open data et documents publics téléchargeables.** Pas de scraping
aveugle ; une source à risque juridique/technique n'est jamais au cœur de
l'architecture.

---

## 4. Plan d'implémentation priorisé (ÉTAPES 5→10)

**Livré dans cette itération (MVP data, §26 Phase 1 – fondations) :**

1. ✅ Schéma canonique (migration) — provenance, holdings, documents, requests, monitoring, RLS.
2. ✅ `SOURCE_REGISTRY` code + miroir DB.
3. ✅ Validation/normalisation ISIN + recherche multi-alias.
4. ✅ Validation de plausibilité + Completeness Score.
5. ✅ Contrat de connecteur (pipeline modulaire, une source = un connecteur).
6. ✅ Tests automatisés des briques pures.

**Suite :**

7. ✅ Chemin d'ingestion complet et testé de bout en bout : `iSharesConnector`
   (réutilise le parser factsheet), runner `engine.ts`, puis persistance
   `persist.ts` (→ `data_observations` + colonnes canoniques `assets`, avec
   provenance ; valeurs rejetées jamais écrites). **Reste** : le downloader
   réseau (PDF officiel + `pdftotext`), le connecteur `AmundiConnector`, et
   l'écriture des `fund_holdings` (le parser ESG actuel ne fournit pas la
   composition).
8. Backfill ISIN sur les ~82 assets existants depuis les documents officiels.
9. Server function + UI « Demander l'analyse » (`fund_requests`) sur recherche vide (§27).
10. Job planifié d'ingestion (quotidien : nouveautés ; hebdo : holdings ; mensuel :
    factsheets) via le pattern `hooks/` + `pg_cron` existant (§19).
11. Admin/data-quality dashboard (`ingestion_jobs`, complétude, ISIN invalides, doublons) (§20/§21/§25).
12. Test sur 20 ETF réels puis vérification manuelle contre sources officielles (§7-8), montée à 100 (§9).

**Règle absolue (§ final)** : 500 ETF à 95 % de données fiables et sourcées
valent mieux que 20 000 approximatifs. Seedow gagne sur transparence, simplicité
et confiance, pas sur la quantité brute.
