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

## Limites / non couvert (promotion catalogue → moteur)

- **Mapping `etf_category` → `asset_class`** : catégories Adanos libres → nos 9
  classes fonctionnelles. Aucun mapping auto fiable → promotion **curée**, jamais
  en masse.
- **Adanos ≠ investabilité** : pas de statut UCITS, dispo retail UE, TER, SFDR,
  ESG. Un ETF promu ⇒ `is_active=false` obligatoire jusqu'à enrichissement (sinon
  l'allocateur le voit à `esg_score=0`).
- **Stocks** : jamais promus dans le moteur de fonds ; `asset_type` conservé pour
  filtrer.
- **2 % sans ISIN** (`scope_reason=primary_listing_missing_isin`) : stockés, non
  promouvables (clé moteur = ISIN).

## Attribution

Source : Adanos Free Global Ticker Database (github.com/adanos-software/free-ticker-database), licence MIT.
