# N2 — Ingestion des holdings réelles (`fund_holdings`)

> État : **pipeline confronté aux fichiers réels et corrigé** (26 août 2026).
> Les vingt et un fonds du registre iShares ont été téléchargés et lus de bout en
> bout : **29 941 positions**, aucune perdue. L'écriture en base reste à
> déclencher par un opérateur disposant de la clé de service (voir §6).
> Aucune donnée n'a été inventée (§1.3 non négociable).

## 1. Sources officielles retenues (gratuites, sans clé)

| Source              | Type                                                              | Fournit                       | Coût                    |
| ------------------- | ----------------------------------------------------------------- | ----------------------------- | ----------------------- |
| iShares / BlackRock | fichier CSV de composition officiel, daté (`Fund Holdings as of`) | holdings ligne à ligne + ISIN | **gratuit, aucune clé** |
| Amundi ETF          | documents officiels (CSV/PDF)                                     | holdings                      | gratuit                 |
| Vanguard UCITS      | documents officiels                                               | holdings                      | gratuit                 |

**Aucune dépendance payante.** Ces fichiers sont des téléchargements publics. Le
parser CSV **iShares** est implémenté et testé (`data-engine/holdings.ts`,
`parseISharesHoldingsCsv`). Amundi/Vanguard ont des formats distincts : leurs
parsers restent à écrire (voir §Reste à faire) — non devinés à l'aveugle.

## 2. Architecture du pipeline (le chaînon manquant, maintenant en place)

```
resolveUrl(fonds)  →  httpDownload  →  parse CSV  →  QC dure  →  persist fund_holdings
   (URL curée)         (never throws)   (as_of+lignes)  (rejette)   (daté + sourcé)
```

| Étape                           | Fichier                                                           | Statut   |
| ------------------------------- | ----------------------------------------------------------------- | -------- |
| Résolution d'URL officielle     | `routes/hooks/ingest-holdings.ts` (config `HOLDINGS_SOURCES`)     | **neuf** |
| Téléchargement                  | `data-engine/download.server.ts` (`httpDownload`)                 | existant |
| Parsing CSV iShares             | `data-engine/holdings.ts`                                         | existant |
| Contrôle qualité                | `data-engine/holdings-quality.ts`                                 | **neuf** |
| Construction/persistance lignes | `data-engine/holdings.ts` (`buildHoldingRows`, `persistHoldings`) | existant |
| Writer Supabase                 | `data-engine/holdings.supabase.ts`                                | existant |
| **Orchestrateur**               | `data-engine/holdings-ingest.ts`                                  | **neuf** |
| **Hook d'exécution**            | `routes/hooks/ingest-holdings.ts`                                 | **neuf** |

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

## 6. Ce que les fichiers réels ont appris

L'egress vers `blackrock.com` est ouvert depuis la session du 26 août 2026. Les
vingt et un classeurs du registre ont été téléchargés et passés dans la chaîne
complète. Quatre défauts sont apparus, qu'aucun test sur donnée fabriquée
n'aurait pu montrer — ils tenaient tous à la même hypothèse : _un titre = un
nom_.

| Défaut                             | Ce que le fichier réel montre                                                                                                                                                                                                                                      | Correction                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Clé d'unicité `(fonds, nom, date)` | Le iShares Global Corp Bond publie 14 978 lignes dont **2 077 noms répétés** — « AT&T INC » 80 fois, une obligation différente à chaque fois. Sur l'ensemble du registre, **41,4 % des positions** (12 397 sur 29 941) s'écrasaient silencieusement à l'insertion. | Clé = **rang de la ligne** dans le document publié (`line_no`).                                        |
| Contrôle « doublon »               | Rejetait tout fonds obligataire : 11 354 signalements sur un fichier sain.                                                                                                                                                                                         | Le doublon se juge sur l'**identité publiée** (nom + ticker + échéance + coupon), pas sur le nom seul. |
| `CHECK (weight_pct >= 0)`          | Cinq fonds sur vingt et un publient une ligne négative : compte de liquidités à découvert (« USD CASH −0,39 % »), jambe de change à terme.                                                                                                                         | Bornes `[-100, 100]` : l'implausible, c'est qu'une ligne pèse plus que le fonds.                       |
| Échéance et coupon lus puis jetés  | Ce sont précisément les colonnes qui distinguent deux obligations du même émetteur.                                                                                                                                                                                | Persistées (`security_maturity`, `security_coupon_pct`, `security_asset_class`).                       |

Résultat après correction, sur les mêmes fichiers : **0 rejet** (contre 8), 14
fonds `valid`, 7 en `review_required` — et ces sept-là sont de vraies ambiguïtés
que l'émetteur ne tranche pas lui-même (deux tranches HSBC de même échéance et
même coupon, deux sociétés sous le sigle « EQT », douze jambes « SAR/USD »).
Elles sont conservées et signalées, jamais fusionnées.

Les sommes de poids publiées vont de **92,16 %** à **100,15 %**. Le 92 % n'est
pas une perte de lecture : 6 882 des 14 978 lignes du fonds sont publiées à
0,00 % (arrondi de l'émetteur). L'écart est affiché, jamais renormalisé.

Régressions figées dans `__tests__/fixtures/` : deux extraits **verbatim** des
classeurs officiels, portant exactement ces cas.

### Pour peupler la base

La table `fund_holdings` n'est accessible en écriture qu'à `service_role` (RLS,
migration fondatrice) : l'ingestion demande donc la clé de service.

```bash
# 1. Vérifier les sources — ne demande aucun accès base, n'écrit rien
bun run scripts/ingest-holdings.ts

# 2. Appliquer la migration qui corrige la clé d'unicité et les bornes de poids
#    supabase/migrations/20260826180000_fund_holdings_real_identity.sql

# 3. Écrire
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SEEDOW_PERSIST=1 \
  bun run scripts/ingest-holdings.ts
```

L'ordre compte : lancer l'étape 3 avant la migration ferait perdre 41 % des
lignes, sans la moindre erreur remontée.

En variante déployée : `POST /hooks/ingest-holdings` avec
`Authorization: Bearer <CRON_SECRET>`, puis
`POST /hooks/recompute-carbon-estimates` pour activer le carbone bottom-up.

## 7. Reste à faire

- Parsers **Amundi** et **Vanguard** (formats propres, sur échantillon réel).
- Résolution d'URL automatique via le **product screener** iShares (mapping
  ISIN→productId) plutôt que registre curé.
- Lier `source_id` à `data_sources` (actuellement `source_url` fait foi).
- Étendre le registre au-delà des vingt et un fonds vérifiés : seuls ceux dont
  l'API a réellement répondu y figurent.
