# N2 — Ingestion des holdings réelles (`fund_holdings`)

> État : **pipeline construit, testé et prêt à tourner** ; **aucune donnée réelle
> importée depuis la session d'audit** car les domaines des sociétés de gestion
> sont bloqués par la politique d'egress (voir §Bloqué). Aucune donnée n'a été
> inventée (§1.3 non négociable).

## 1. Sources officielles retenues (gratuites, sans clé)

| Source | Type | Fournit | Coût |
|---|---|---|---|
| iShares / BlackRock | fichier CSV de composition officiel, daté (`Fund Holdings as of`) | holdings ligne à ligne + ISIN | **gratuit, aucune clé** |
| Amundi ETF | documents officiels (CSV/PDF) | holdings | gratuit |
| Vanguard UCITS | documents officiels | holdings | gratuit |

**Aucune dépendance payante.** Ces fichiers sont des téléchargements publics. Le
parser CSV **iShares** est implémenté et testé (`data-engine/holdings.ts`,
`parseISharesHoldingsCsv`). Amundi/Vanguard ont des formats distincts : leurs
parsers restent à écrire (voir §Reste à faire) — non devinés à l'aveugle.

## 2. Architecture du pipeline (le chaînon manquant, maintenant en place)

```
resolveUrl(fonds)  →  httpDownload  →  parse CSV  →  QC dure  →  persist fund_holdings
   (URL curée)         (never throws)   (as_of+lignes)  (rejette)   (daté + sourcé)
```

| Étape | Fichier | Statut |
|---|---|---|
| Résolution d'URL officielle | `routes/hooks/ingest-holdings.ts` (config `HOLDINGS_SOURCES`) | **neuf** |
| Téléchargement | `data-engine/download.server.ts` (`httpDownload`) | existant |
| Parsing CSV iShares | `data-engine/holdings.ts` | existant |
| Contrôle qualité | `data-engine/holdings-quality.ts` | **neuf** |
| Construction/persistance lignes | `data-engine/holdings.ts` (`buildHoldingRows`, `persistHoldings`) | existant |
| Writer Supabase | `data-engine/holdings.supabase.ts` | existant |
| **Orchestrateur** | `data-engine/holdings-ingest.ts` | **neuf** |
| **Hook d'exécution** | `routes/hooks/ingest-holdings.ts` | **neuf** |

Schéma `fund_holdings` (déjà présent, `20260812130000_data_engine_foundation.sql`) :
historisé par `(asset_id, security_name, as_of)`, avec `source_id`/`source_url`/
`retrieved_at`/`confidence`/`validation_status` — traçabilité complète.

## 3. Contrôles qualité (`holdings-quality.ts`)

Un lot est **rejeté** (rien persisté) ou **`review_required`** selon :
- poids impossible (< 0 ou > 100) → rejeté ;
- somme des poids > 100 + tolérance → rejetée (double comptage/parsing) ; sous-couverture tolérée ;
- ISIN présent mais checksum/format incohérent → review ;
- doublon (même titre 2× dans le fonds) → review ;
- date de référence (`as_of`) manquante / future / trop vieille → rejetée/review ;
- source manquante (ni `source_id` ni `source_url`) → rejetée.

## 4. Consommation aval — vérifiée

- **Overlap look-through** (`overlap.ts`) : `fundHoldingsToOverlapMap()`
  (`portfolio/holdings-adapter.ts`) transforme les lignes `fund_holdings` en
  `Map<assetId, HoldingWeights>`. Rapprochement par **ISIN canonique** (deux ETF
  tenant Apple sous des libellés différents mais le même ISIN → overlap détecté).
  Prouvé par test (`holdings-adapter.test.ts`).
- **Carbone bottom-up** (`carbon-engine.ts`) : `fundHoldingsToCarbonInputs()`
  produit les `HoldingInput[]`. `carbon-estimate.server.ts` lit déjà
  `fund_holdings` directement → une fois peuplé, le carbone bottom-up s'active
  sans autre changement.

## 5. Mapping ISIN → fonds → holdings

- Résolution d'URL **par ISIN** (ou `assetId`) via `HOLDINGS_SOURCES`, curée et
  vérifiée — **jamais devinée** (§9).
- ISIN du titre sous-jacent conservé tel quel depuis le fichier officiel, validé
  Luhn (`isin.ts`), utilisé comme clé de rapprochement. Un ISIN invalide n'est
  jamais « corrigé » : il déclenche un signal QC.

## 6. Bloqué par l'environnement

- **Egress** : `ishares.com`, `blackrock.com`, `amundietf.fr`, `vanguard.co.uk`
  renvoient **403 CONNECT** via le proxy de la session d'audit. Impossible de
  télécharger un seul fichier officiel ici → **0 fonds peuplé depuis la session**.
- **CI/build** : registre npm privé bloqué (403) → `bun install`/`vitest`/`tsc`
  non exécutables ici. Logique validée par un **smoke-test bun** (10/10) ; la CI
  doit confirmer.

### Pour exécuter en production
1. Autoriser l'egress sortant vers les domaines des sociétés de gestion.
2. Renseigner le secret `HOLDINGS_SOURCES` = `{ "<ISIN>": "<url csv officielle>" }`
   pour un premier lot de fonds représentatifs (ex. iShares Core MSCI World,
   iShares MSCI USA SRI…).
3. `POST /hooks/ingest-holdings` avec `Authorization: Bearer <CRON_SECRET>`.
4. `POST /hooks/recompute-carbon-estimates` pour activer le carbone bottom-up.

## 7. Reste à faire
- Parsers **Amundi** et **Vanguard** (formats propres, sur échantillon réel).
- Résolution d'URL automatique via le **product screener** iShares (mapping
  ISIN→productId) plutôt que config manuelle, quand l'egress est ouvert.
- Lier `source_id` à `data_sources` (actuellement `source_url` fait foi).
