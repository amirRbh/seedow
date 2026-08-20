# Catalogue mondial d'instruments — source Adanos

> Remplace la découverte « scraper par émetteur » (iShares product screener) par
> une source **unique, gratuite, mondiale** : [Adanos Free Global Ticker
> Database](https://github.com/adanos-software/free-ticker-database) (licence MIT).

## Décision d'architecture

`assets` est l'**univers curé du moteur** (`ticker UNIQUE`, `asset_class`
fonctionnel, `esg_score`/`cause_exposure`/`expected_return` consommés par
l'optimiseur). Y déverser les ~61 700 lignes Adanos (dont 47 771 actions +
cross-listings) casserait `ticker UNIQUE` et polluerait l'allocateur.

→ Adanos alimente une **couche séparée** `catalog_instruments`. Les holdings, l'ESG
détaillé et le carbone restent des couches séparées. Adanos ne sert qu'à
**l'identité des titres** (catalogue), jamais à l'ESG/SFDR.

```
Adanos core_listings.csv (GitHub, MIT)
   │  GitHub Action hebdo (gratuit, réseau GitHub → release + Supabase)
   ▼
scripts/import-adanos-catalog.ts  ── parse + dédup(listing_key) + upsert batch + rapport
   ▼
catalog_instruments  (61k lignes)   +  catalog_imports (log version/date/rapport)
   │
   ▼  promotion OPT-IN, curée, ETF uniquement (chantier séparé)
assets (moteur, INCHANGÉ) — is_active=false jusqu'à enrichissement ESG/prix
```

## Fichier source

`data/core_listings.csv` — univers canonique **collision-safe**, **une ligne
primaire par titre**, clé `listing_key` (`EXCHANGE::TICKER`). Colonnes :
`listing_key, ticker, exchange, name, asset_type, stock_sector, etf_category,
country, country_code, isin, aliases, instrument_group_key, scope_reason`.
Couverture : ~61,7k lignes (16k ETF / 48k actions), ISIN 98 %. Les cross-listings
secondaires vivent dans `listings.csv` (exclus du core) → **la dédup est faite à
la source** ; on reste défensif (dédup par `listing_key`).

## Composants

| Élément                                      | Fichier                                                 | Rôle                                                                                 |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Parser pur + normalisation + dédup + rapport | `src/lib/data-engine/adanos.ts`                         | ISIN validé Luhn, `asset_type` normalisé, champ absent → null                        |
| Tests                                        | `src/lib/data-engine/__tests__/adanos.test.ts`          |                                                                                      |
| Schéma                                       | `supabase/migrations/20260819160000_adanos_catalog.sql` | `catalog_instruments`, `catalog_imports`, `assets.catalog_listing_key` (RLS activée) |
| Import (I/O)                                 | `scripts/import-adanos-catalog.ts`                      | fetch → parse → upsert batch (1000) → log                                            |
| Refresh gratuit                              | `.github/workflows/import-adanos-catalog.yml`           | cron hebdo lundi 04h UTC + manuel                                                    |

## Provenance & versionnage (exigence 7)

Chaque ligne `catalog_instruments` porte `source='adanos'`, `source_version`,
`source_url`, `first_seen_at`, `last_seen_at`, `is_present_in_latest`. Chaque
import ajoute une ligne `catalog_imports` (version, date, compteurs).

## Rapport d'import (exigence 8)

Le script imprime et persiste : `count_before, count_parsed, count_new,
count_updated, count_skipped_dup, count_no_isin, count_etf, count_stock,
count_errors, status`.

## Exécution

```bash
# dry-run (parse + rapport, aucune écriture)
bun run scripts/import-adanos-catalog.ts
# écriture réelle (secrets Supabase requis)
SEEDOW_PERSIST=1 bun run scripts/import-adanos-catalog.ts
```

Secrets GitHub Actions requis : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
(déjà utilisés par les workflows d'ingestion existants).

## Promotion catalogue → moteur (`assets`)

Second chantier : sélectionner des ETF du catalogue et les insérer dans `assets`,
**toujours `is_active=false`**. Logique pure/testée
(`src/lib/data-engine/promotion.ts`), exécutée par `scripts/promote-catalog-etfs.ts`
(dry-run par défaut, `SEEDOW_PERSIST=1` pour écrire), workflow **manuel uniquement**
(`.github/workflows/promote-catalog-etfs.yml`, pas de cron — la promotion est un
acte curé, jamais automatique en masse).

### Mapping `etf_category` → `asset_class` (taxonomie Adanos réelle, 11 valeurs)

| Catégorie Adanos                             | Classe moteur      | Note                                                                |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| Equity                                       | `equity_dev`       | bucket dev par défaut ; clivage dev/em curé à l'enrichis.           |
| Real Estate                                  | `reit`             |                                                                     |
| Commodity                                    | `commodity`        |                                                                     |
| Money Market                                 | `cash`             |                                                                     |
| Fixed Income                                 | **non promu**      | pas de classe « bond » générique ; sov/corp inconnu → jamais deviné |
| Alternative / Other / Multi-Asset / Currency | **non promu**      | non classables à ce niveau                                          |
| Leveraged/Inverse · Volatility               | **exclus (choix)** | dérivés à levier, contraires au buy-and-hold éthique                |

### Garde-fous (non destructif, anti-fonds-fictif)

- **`is_active=false`** : l'optimiseur (`universe.server.ts`) et Découvrir filtrent
  `is_active=true` → un ETF promu est invisible tant qu'il n'est pas enrichi.
- **Jamais auto-activé** : sans `yahoo_symbol`, la complétude d'un placeholder
  plafonne ~25-30 (< seuil 50) et il n'a aucune série de cours → `activation.ts` ne
  l'active jamais.
- **On n'invente rien** : `issuer`/`region` restent `null`, `asset_class` seulement
  si mappable. Origine dans `description` + `catalog_listing_key`.
- **Unicité** : dédup par ISIN contre `assets` existants (backfill du lien si déjà
  présent) ; `ticker` = ticker Adanos si libre, sinon `listing_key`.
- **Stocks** : jamais promus (`asset_type='stock'` filtré).
- **Sans ISIN** : non promouvables (clé moteur = ISIN).
- **Audit** : chaque run écrit une ligne `cron_run_log`
  (`job_name='promote-catalog-etfs'`, compteurs + rapport).

## Enrichissement (rendre un ETF promu investissable)

Un ETF promu est dormant (`is_active=false`). Pour qu'il devienne présentable, il
faut l'enrichir puis l'activer (`activation.ts`, automatique dès « tradeabilité
prouvée » ou complétude ≥ 50). Chantier séquentiel, curé, sourcé.

### Maillon 1 — wiring `yahoo_symbol` (fait)

`src/lib/data-engine/market-symbol.ts` (pur/testé) dérive un symbole Yahoo
`TICKER[.SUFFIXE]` depuis `exchange`+`ticker` du catalogue ; place inconnue/ambiguë
→ `null` (jamais deviné). `scripts/wire-yahoo-symbols.ts` sélectionne une fournée
**curée** (ETF UCITS, domicile IE/LU, place mappable), **valide chaque symbole
contre Yahoo** (cotation + barres réelles) et n'écrit `assets.yahoo_symbol` que
pour les validés — `is_active` reste `false`. Workflow **manuel**
(`.github/workflows/wire-yahoo-symbols.yml`), borné par `WIRE_LIMIT`. Une fois le
symbole posé, l'ingestion horaire (`refresh-market-data`, qui lit tout asset ayant
un `yahoo_symbol`, actif ou non) accumule la série de cours.

### Maillon 2 — identité `issuer` / `region` (fait)

`src/lib/data-engine/identity.ts` (pur/testé) dérive `issuer` (marque→gérant :
iShares→BlackRock, Xtrackers→DWS…) et `region` (exposition : World/US/Europe/EM/
Japon/Chine) **depuis le nom du fonds**. `scripts/enrich-catalog-identity.ts`
complète ces champs `NULL` sur les ETF promus (ciblé par défaut sur les **wirés**),
sans écraser l'existant, sans activer. Marque inconnue → `issuer=null` ; pas de
géographie claire → `region=null` (jamais deviné). Workflow **manuel**.

Effet : un ETF **wiré + identité complète** a `hasFullIdentity=true` ; dès qu'il
cumule ≥40 cours réels (~2 mois via `refresh-market-data`), `activation.ts` voie
« tradeabilité prouvée » l'**active automatiquement** (politique existante : un
fonds qui cote vraiment et qu'on identifie sans ambiguïté est investissable, même
avant ingestion ESG).

### Maillons suivants (à faire)

- **ESG/SFDR/carbone** sourcés (pipeline d'ingestion existant) — sinon un ETF activé
  reste à `esg_score=0` tant que l'ESG n'est pas ingéré.
- **Classification fine** des non-mappés (3 086 Fixed Income → sov/corp/green/social).

## Attribution

Source : Adanos Free Global Ticker Database (github.com/adanos-software/free-ticker-database), licence MIT.
