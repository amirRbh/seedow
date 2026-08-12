/**
 * SOURCE_REGISTRY (§4 hiérarchie de confiance, §23 légal/scraping).
 *
 * Chaque source de données du Data Engine est documentée ici : type, priorité,
 * URL, conditions d'utilisation, robots.txt, automatisation possible,
 * attribution requise. C'est la source de vérité pour décider QUELLE source
 * fait autorité sur un champ, et ce qui est légalement réutilisable.
 *
 * Règle (§23) : priorité absolue aux APIs officielles, open data, documents
 * publics explicitement publiés pour consultation/réutilisation. Une source à
 * risque juridique ou technique NE DOIT PAS être au cœur de l'architecture.
 *
 * Table miroir en base : `data_sources` (voir migration data_engine_foundation).
 */

/** Type de source, du plus faisant-foi au moins. */
export type SourceType =
  | "official_regulator" // AMF, GECO, ESMA…
  | "official_document" // DICI/KID, prospectus, rapport annuel, doc SFDR
  | "official_asset_manager" // page/factsheet officielle de la société de gestion
  | "public_open_data" // data.gouv, open data institutionnel
  | "public_api" // API publique gratuite réellement exploitable
  | "secondary_financial" // source financière publique secondaire
  | "commercial"; // fournisseur payant — FALLBACK futur uniquement (§22)

/** Niveau de priorité §4 : 1 = officiel, 4 = commercial (fallback). */
export type SourcePriority = 1 | 2 | 3 | 4;

export type Automation = "api" | "document_download" | "scrape" | "manual";

export interface SourceDefinition {
  /** Clé stable (référencée par les observations de données). */
  key: string;
  name: string;
  type: SourceType;
  priority: SourcePriority;
  /** Ce que la source fournit réellement (jamais de sur-promesse). */
  provides: string[];
  homeUrl: string;
  /** Page des conditions d'utilisation / mentions légales, si connue. */
  termsUrl: string | null;
  /** robots.txt pertinent (true = collecte autorisée sur les chemins visés). */
  robotsAllowed: boolean | null;
  automation: Automation;
  /** Attribution à afficher si la source l'exige. */
  attribution: string | null;
  /** Restrictions de réutilisation / notes de conformité. */
  notes: string;
}

const PRIORITY_BY_TYPE: Record<SourceType, SourcePriority> = {
  official_regulator: 1,
  official_document: 1,
  official_asset_manager: 1,
  public_open_data: 2,
  public_api: 2,
  secondary_financial: 3,
  commercial: 4,
};

/**
 * Registre initial (MVP ETF). À étendre à mesure que les connecteurs sont
 * implémentés. Chaque entrée décrit une source réelle — aucune n'est activée
 * automatiquement sans connecteur dédié.
 */
export const SOURCE_REGISTRY: readonly SourceDefinition[] = [
  {
    key: "amf_geco",
    name: "AMF — base GECO",
    type: "official_regulator",
    priority: 1,
    provides: ["fund_identity", "isin", "prospectus", "dici", "nav"],
    homeUrl: "https://geco.amf-france.org/",
    termsUrl: "https://www.amf-france.org/fr/mentions-legales",
    robotsAllowed: null,
    automation: "document_download",
    attribution: "Source : AMF (GECO)",
    notes:
      "Base officielle de l'AMF : consultation des OPC, prospectus, DICI et VL. Référence pour l'identification des fonds de droit français. Vérifier les conditions de réutilisation avant automatisation lourde.",
  },
  {
    key: "ishares_factsheet",
    name: "iShares / BlackRock — fiches produit officielles",
    type: "official_asset_manager",
    priority: 1,
    provides: ["ter", "index", "holdings", "sfdr", "msci_esg", "waci", "domicile", "currency"],
    homeUrl: "https://www.ishares.com/",
    termsUrl: "https://www.ishares.com/uk/legal/terms-and-conditions",
    robotsAllowed: null,
    automation: "document_download",
    attribution: "Source : iShares / BlackRock (fiche produit officielle)",
    notes:
      "Factsheets et fichiers de composition publiés par l'émetteur. Déjà parsés (lib/esg/factsheet-parser). Télécharger le document officiel, ne pas scraper la page dynamiquement.",
  },
  {
    key: "amundi_factsheet",
    name: "Amundi ETF — documents officiels",
    type: "official_asset_manager",
    priority: 1,
    provides: ["ter", "index", "holdings", "sfdr", "domicile", "currency"],
    homeUrl: "https://www.amundietf.fr/",
    termsUrl: "https://www.amundietf.fr/fr/particuliers/mentions-legales",
    robotsAllowed: null,
    automation: "document_download",
    attribution: "Source : Amundi ETF (document officiel)",
    notes: "Premier émetteur européen. DICI/KID et factsheets publics par ISIN.",
  },
  {
    key: "vanguard_factsheet",
    name: "Vanguard — documents officiels UCITS",
    type: "official_asset_manager",
    priority: 1,
    provides: ["ter", "index", "holdings", "domicile", "currency"],
    homeUrl: "https://www.vanguard.co.uk/",
    termsUrl: "https://www.vanguard.co.uk/legal/terms-and-conditions",
    robotsAllowed: null,
    automation: "document_download",
    attribution: "Source : Vanguard (document officiel)",
    notes: "Gamme UCITS (VWCE, VWRL…). Documents KID/factsheet publics.",
  },
  {
    key: "yahoo_finance",
    name: "Yahoo Finance (cotations)",
    type: "secondary_financial",
    priority: 3,
    provides: ["quote", "price_history", "currency"],
    homeUrl: "https://finance.yahoo.com/",
    termsUrl: "https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html",
    robotsAllowed: null,
    automation: "api",
    attribution: null,
    notes:
      "Déjà utilisé pour asset_quotes/asset_prices (lib/market/yahoo.server). Cotations uniquement, source secondaire — jamais faisant-foi pour identité/frais/holdings.",
  },
];

/** Table de correspondance clé → définition (lookup O(1)). */
export const SOURCE_BY_KEY: ReadonlyMap<string, SourceDefinition> = new Map(
  SOURCE_REGISTRY.map((s) => [s.key, s]),
);

/** Priorité §4 attendue pour un type de source donné. */
export function priorityForType(type: SourceType): SourcePriority {
  return PRIORITY_BY_TYPE[type];
}

/** Arbitre entre deux sources pour un même champ : la priorité la plus forte gagne. */
export function preferredSource(a: string, b: string): string {
  const pa = SOURCE_BY_KEY.get(a)?.priority ?? 4;
  const pb = SOURCE_BY_KEY.get(b)?.priority ?? 4;
  return pa <= pb ? a : b;
}
