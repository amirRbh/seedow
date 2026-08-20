/**
 * Promotion CURÉE du catalogue mondial (`catalog_instruments`, source Adanos) vers
 * l'univers du moteur (`assets`). Second chantier de l'intégration Adanos : le
 * premier (import) ne fait que remplir le catalogue d'identités ; ici on
 * sélectionne des ETF et on les insère dans `assets` — mais **jamais actifs**.
 *
 * Décisions non négociables (CLAUDE.md §1.2/§1.3, doc adanos-catalog.md) :
 *  - **ETF uniquement.** Les actions ne sont jamais promues dans le moteur de fonds.
 *  - **`is_active = false` obligatoire.** Un ETF promu n'a ni ESG, ni prix, ni
 *    holdings sourcés → il ne doit JAMAIS entrer dans l'optimiseur (qui le verrait
 *    à `esg_score = 0`). Il reste dormant jusqu'à enrichissement + activation
 *    (voie `activation.ts` : identité complète + série de cours réelle, ou
 *    complétude ≥ seuil — inatteignable pour un placeholder sans `yahoo_symbol`).
 *  - **On n'invente rien.** `asset_class` (NOT NULL) n'est mappé QUE lorsque la
 *    catégorie Adanos le permet sans ambiguïté ; sinon la ligne n'est pas promue.
 *  - **Traçabilité.** Chaque asset promu porte `catalog_listing_key` (lien vers sa
 *    ligne catalogue), et son origine reste dans `description`.
 *
 * Taxonomie Adanos `etf_category` réelle (11 valeurs closes, mesurées sur le dump) :
 *   Equity, Fixed Income, Alternative, Other, Real Estate, Commodity,
 *   Leveraged/Inverse, Money Market, Multi-Asset, Volatility, Currency.
 *
 * Fonctions PURES, sans I/O : le script fait la lecture catalogue + l'écriture.
 */

/** Les 10 classes fonctionnelles du moteur (enum `public.asset_class`). */
export type EngineAssetClass =
  | "equity_dev"
  | "equity_em"
  | "thematic"
  | "green_bond"
  | "social_bond"
  | "sov_bond"
  | "corporate_bond"
  | "reit"
  | "commodity"
  | "cash";

/**
 * Catégories Adanos qu'on refuse DÉLIBÉRÉMENT de promouvoir (choix, pas lacune) :
 * produits à effet de levier / inverses et véhicules de volatilité — dérivés, non
 * « buy-and-hold », contraires à l'investissement long terme éthique de Seedow.
 */
export const DELIBERATELY_EXCLUDED_CATEGORIES = new Set(["leveraged/inverse", "volatility"]);

/**
 * Mappe une `etf_category` Adanos vers une `asset_class` du moteur, ou `null` si
 * la catégorie n'est pas mappable **sans invention** :
 *  - `Fixed Income` → null : le moteur n'a pas de classe « obligation » générique,
 *    et le clivage souverain/corporate/green/social est inconnu à ce niveau.
 *  - `Alternative` / `Other` / `Multi-Asset` / `Currency` → null : non classables.
 *  - `Leveraged/Inverse` / `Volatility` → null : exclusion délibérée (voir ci-dessus).
 *
 * `Equity` → `equity_dev` : bucket « actions développées » par défaut. Adanos ne
 * distingue pas développé/émergent au niveau catégorie → le clivage dev/em est
 * corrigé à l'enrichissement (l'asset est de toute façon `is_active=false`). Choix
 * cohérent avec `deriveAssetClass` de l'ingestion GECO.
 */
export function mapEtfCategoryToAssetClass(category: string | null): EngineAssetClass | null {
  const c = (category ?? "").trim().toLowerCase();
  if (!c) return null;
  if (DELIBERATELY_EXCLUDED_CATEGORIES.has(c)) return null;
  // Taxonomie close d'Adanos, avec garde-fous par mots-clés si elle évolue.
  if (/\bequit|\bstock|\bshare/.test(c)) return "equity_dev";
  if (/real\s*estate|reit|property|immobili/.test(c)) return "reit";
  if (/commodit|precious\s*metal|\bgold\b|\bsilver\b/.test(c)) return "commodity";
  if (/money\s*market|mon[ée]taire|\bcash\b/.test(c)) return "cash";
  // Fixed Income, Alternative, Other, Multi-Asset, Currency → non promus.
  return null;
}

/** Sous-ensemble des colonnes de `catalog_instruments` lues par la promotion. */
export interface CatalogInstrumentRow {
  listing_key: string;
  ticker: string | null;
  exchange: string | null;
  name: string;
  asset_type: string;
  etf_category: string | null;
  country: string | null;
  isin: string | null;
}

/** Un ETF est promouvable s'il est bien un ETF, a un ISIN, et une catégorie mappable. */
export function isPromotableEtf(r: CatalogInstrumentRow): boolean {
  return r.asset_type === "etf" && !!r.isin && mapEtfCategoryToAssetClass(r.etf_category) !== null;
}

/** Ligne prête à insérer dans `public.assets` (placeholder dormant). */
export interface PromotedAssetRow {
  ticker: string;
  isin: string;
  name: string;
  issuer: null;
  asset_class: EngineAssetClass;
  region: null;
  description: string;
  is_active: false;
  catalog_listing_key: string;
}

/**
 * Construit la ligne `assets` d'un ETF promu. `ticker` est fourni par l'appelant
 * (résolution d'unicité contre la base — voir le script). `region`/`issuer` restent
 * `null` (Adanos ne les fournit pas : jamais inventés). L'origine catalogue est
 * conservée dans `description` et via `catalog_listing_key`.
 */
export function buildPromotedAsset(
  r: CatalogInstrumentRow,
  assetClass: EngineAssetClass,
  ticker: string,
): PromotedAssetRow {
  if (!r.isin) throw new Error(`buildPromotedAsset: ${r.listing_key} sans ISIN`);
  const provenance = [r.exchange, r.country, r.etf_category].filter(Boolean).join(" · ");
  return {
    ticker,
    isin: r.isin,
    name: r.name,
    issuer: null,
    asset_class: assetClass,
    region: null,
    description: provenance ? `Catalogue Adanos · ${provenance}` : "Catalogue Adanos",
    is_active: false,
    catalog_listing_key: r.listing_key,
  };
}

export interface PromotionReport {
  /** Toutes les lignes ETF vues (asset_type='etf'). */
  etfTotal: number;
  /** ETF mappables mais sans ISIN (donc non promus : clé moteur = ISIN). */
  noIsin: number;
  /** ETF mappables + ISIN présents (candidats à la promotion, avant dédup base). */
  promotable: number;
  /** ETF non promus car catégorie non mappable (hors exclusions délibérées). */
  unmapped: number;
  /** ETF non promus car catégorie exclue délibérément (levier/inverse, volatilité). */
  excluded: number;
  /** Répartition des promouvables par classe moteur. */
  byClass: Record<string, number>;
  /** Répartition des non-mappables par catégorie Adanos (pour curation future). */
  byUnmappedCategory: Record<string, number>;
}

/** Compte les métriques d'un lot catalogue (rapport de promotion). Pur. */
export function computePromotionReport(rows: CatalogInstrumentRow[]): PromotionReport {
  const rep: PromotionReport = {
    etfTotal: 0,
    noIsin: 0,
    promotable: 0,
    unmapped: 0,
    excluded: 0,
    byClass: {},
    byUnmappedCategory: {},
  };
  for (const r of rows) {
    if (r.asset_type !== "etf") continue;
    rep.etfTotal++;
    const cls = mapEtfCategoryToAssetClass(r.etf_category);
    if (cls) {
      if (r.isin) {
        rep.promotable++;
        rep.byClass[cls] = (rep.byClass[cls] ?? 0) + 1;
      } else {
        rep.noIsin++;
      }
      continue;
    }
    const cat = (r.etf_category ?? "").trim().toLowerCase();
    if (DELIBERATELY_EXCLUDED_CATEGORIES.has(cat)) {
      rep.excluded++;
    } else {
      rep.unmapped++;
      const key = r.etf_category?.trim() || "(vide)";
      rep.byUnmappedCategory[key] = (rep.byUnmappedCategory[key] ?? 0) + 1;
    }
  }
  return rep;
}
