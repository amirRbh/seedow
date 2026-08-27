/**
 * Fonds iShares dont la composition officielle est atteignable.
 *
 * ── Comment cette liste a été produite ────────────────────────────────────
 *
 * Elle n'a pas été saisie à la main. Chaque entrée vient d'une requête réelle
 * à l'API produit BlackRock : l'ISIN, le nom et l'identifiant produit sont
 * ceux que l'émetteur a renvoyés, pas ceux qu'on croyait exacts. Un
 * identifiant qui ne répond pas n'entre pas dans la liste — c'est la raison
 * pour laquelle elle contient exactement les fonds vérifiés, et aucun autre.
 *
 * Pour l'étendre : appeler `iSharesHoldingsUrl(portfolioId)`, vérifier que le
 * classeur revient avec un nom et une date, puis ajouter la ligne. Ne jamais
 * ajouter un identifiant supposé.
 *
 * ── Ce que cette liste n'est pas ──────────────────────────────────────────
 *
 * Ce n'est pas le catalogue de Seedow. C'est la liste des fonds pour lesquels
 * une source de composition existe. Un fonds du catalogue absent d'ici n'est
 * pas un fonds moins bon : c'est un fonds dont on ne sait pas encore dire ce
 * qu'il contient — et l'interface le dit ainsi.
 *
 * Elle est temporaire par construction. Le jour où un annuaire produit
 * exploitable existe, cette table disparaît sans que rien d'autre ne bouge :
 * l'ingestion, les contrôles et l'affichage ne la connaissent qu'à travers
 * `resolveISharesPortfolioId`.
 */

/**
 * Place de cotation du fonds. Elle ne décore pas : elle décide de l'URL, et les
 * deux ne sont pas interchangeables. Le classeur britannique publie des poids
 * formatés (« 5,33 ») et une date « 25/Aug/2026 » ; l'américain publie
 * « Aug 26, 2026 » et un tableau de colonnes différent.
 */
export type ISharesSite = "uk" | "us";

export interface ISharesFundRef {
  /** ISIN du FONDS (pas de ses positions), tel que publié par l'émetteur. */
  isin: string;
  /**
   * Symbole boursier, quand l'émetteur le publie.
   *
   * Il n'est pas décoratif : le catalogue Seedow identifie ses ETF américains
   * par leur ticker et ne porte AUCUN ISIN (la colonne existe, elle est vide).
   * Apparier uniquement sur l'ISIN revenait donc à n'apparier rien du tout.
   */
  ticker: string | null;
  /** Identifiant produit BlackRock, seule clé acceptée par l'API. */
  portfolioId: string;
  site: ISharesSite;
  /** Nom officiel, conservé pour rendre une erreur de correspondance visible. */
  name: string;
}

/** Vérifiés le 25 août 2026 — chacun a renvoyé un classeur daté du même jour. */
export const ISHARES_FUNDS: readonly ISharesFundRef[] = [
  {
    isin: "IE00BGR7L912",
    portfolioId: "307241",
    name: "iShares $ Treasury Bond 0-1yr UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00BGSF1X88",
    portfolioId: "307243",
    name: "iShares $ Treasury Bond 0-1yr UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B14X4S71",
    portfolioId: "251715",
    name: "iShares $ Treasury Bond 1-3yr UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B3VWN393",
    portfolioId: "253744",
    name: "iShares $ Treasury Bond 3-7yr UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B3VWN518",
    portfolioId: "253745",
    name: "iShares $ Treasury Bond 7-10yr UCITS ETF USD (Acc)",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00BKM4GZ66",
    portfolioId: "264659",
    name: "iShares Core MSCI EM IMI UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B4L5Y983",
    portfolioId: "251882",
    name: "iShares Core MSCI World UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B5BMR087",
    portfolioId: "253743",
    name: "iShares Core S&P 500 UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B1FZS350",
    portfolioId: "251801",
    name: "iShares Developed Markets Property Yield UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B7J7TB45",
    portfolioId: "251813",
    name: "iShares Global Corp Bond UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B2NPKV68",
    portfolioId: "251824",
    name: "iShares J.P. Morgan $ EM Bond UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B6R52259",
    portfolioId: "251850",
    name: "iShares MSCI ACWI UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B0M63177",
    portfolioId: "251857",
    name: "iShares MSCI EM UCITS ETF USD (Dist)",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B7XYN974",
    portfolioId: "251869",
    name: "iShares MSCI Japan GBP Hedged UCITS ETF (Acc)",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B52XQP83",
    portfolioId: "251877",
    name: "iShares MSCI South Africa UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00BP3QZD73",
    portfolioId: "270057",
    name: "iShares MSCI World Mid-Cap Equal Weight UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00BDZZTM54",
    portfolioId: "291392",
    name: "iShares MSCI World SRI UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00BF4RFH31",
    portfolioId: "296576",
    name: "iShares MSCI World Small Cap UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B53SZB19",
    portfolioId: "253741",
    name: "iShares NASDAQ 100 UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B52MJD48",
    portfolioId: "253742",
    name: "iShares Nikkei 225 UCITS ETF",
    ticker: null,
    site: "uk",
  },
  {
    isin: "IE00B5L65R35",
    portfolioId: "251840",
    name: "iShares £ Corp Bond 0-5yr UCITS ETF",
    ticker: null,
    site: "uk",
  },
] as const;

/**
 * Fonds iShares COTÉS AUX ÉTATS-UNIS présents dans le catalogue Seedow.
 *
 * ── Pourquoi cette liste a dû exister ─────────────────────────────────────
 *
 * Le registre ne contenait que des UCITS irlandais (`IE00…`), alors que le
 * catalogue Seedow est composé d'ETF américains. Les deux ensembles sont
 * disjoints : l'appariement rendait zéro fonds, et l'ingestion s'arrêtait sur
 * un « aucun fonds du registre n'est présent dans le catalogue » que rien ne
 * distinguait d'un succès. Vingt et un fonds au registre, zéro traité, sortie
 * en code 0.
 *
 * ── Comment elle a été produite ───────────────────────────────────────────
 *
 * Par le screener produit officiel de BlackRock
 * (`ishares.com/us/product-screener/product-screener-v3.1.jsn`), croisé avec
 * les tickers du catalogue : 524 produits publiés, 13 correspondances. Ni le
 * ticker, ni l'ISIN, ni l'identifiant produit ne sont saisis à la main — ils
 * viennent tous de la réponse de l'émetteur. Chacun a ensuite été téléchargé et
 * lu : les treize rendent un classeur daté, avec un secteur sur chaque ligne.
 *
 * Pour l'étendre : relancer le screener, prendre les nouveaux tickers du
 * catalogue, vérifier que le classeur revient. Ne jamais ajouter un identifiant
 * supposé.
 */
export const ISHARES_FUNDS_US: readonly ISharesFundRef[] = [
  {
    ticker: "BGRN",
    isin: "US46435U4408",
    portfolioId: "305296",
    site: "us",
    name: "iShares USD Green Bond ETF",
  },
  {
    ticker: "CRBN",
    isin: "US46434V4648",
    portfolioId: "271054",
    site: "us",
    name: "iShares Low Carbon Optimized MSCI ACWI ETF",
  },
  {
    ticker: "DSI",
    isin: "US4642885705",
    portfolioId: "239667",
    site: "us",
    name: "iShares ESG MSCI KLD 400 ETF",
  },
  {
    ticker: "EAGG",
    isin: "US46435U5496",
    portfolioId: "305252",
    site: "us",
    name: "iShares ESG Aware U.S. Aggregate Bond ETF",
  },
  {
    ticker: "ESGD",
    isin: "US46435G5163",
    portfolioId: "283778",
    site: "us",
    name: "iShares ESG Aware MSCI EAFE ETF",
  },
  {
    ticker: "ESGE",
    isin: "US46434G8630",
    portfolioId: "283777",
    site: "us",
    name: "iShares ESG Aware MSCI EM ETF",
  },
  {
    ticker: "ESGU",
    isin: "US46435G4257",
    portfolioId: "286007",
    site: "us",
    name: "iShares ESG Aware MSCI USA ETF",
  },
  {
    ticker: "ICLN",
    isin: "US4642882249",
    portfolioId: "239738",
    site: "us",
    name: "iShares Global Clean Energy ETF",
  },
  {
    ticker: "SUSA",
    isin: "US4642888022",
    portfolioId: "239692",
    site: "us",
    name: "iShares ESG Optimized MSCI USA ETF",
  },
  {
    ticker: "SUSB",
    isin: "US46435G2434",
    portfolioId: "288490",
    site: "us",
    name: "iShares ESG Aware 1-5 Year USD Corporate Bond ETF",
  },
  {
    ticker: "SUSC",
    isin: "US46435G1931",
    portfolioId: "288488",
    site: "us",
    name: "iShares ESG Aware USD Corporate Bond ETF",
  },
  {
    ticker: "SUSL",
    isin: "US46435U2188",
    portfolioId: "308574",
    site: "us",
    name: "iShares ESG MSCI USA Leaders ETF",
  },
  {
    ticker: "WOOD",
    isin: "US4642881746",
    portfolioId: "239752",
    site: "us",
    name: "iShares Global Timber & Forestry ETF",
  },
] as const;

/** Tout ce que Seedow sait résoudre, quelle que soit la place. */
export const ISHARES_REGISTRY: readonly ISharesFundRef[] = [...ISHARES_FUNDS, ...ISHARES_FUNDS_US];

const BY_ISIN = new Map(ISHARES_REGISTRY.map((f) => [f.isin.toUpperCase(), f]));
const BY_TICKER = new Map(
  ISHARES_REGISTRY.filter((f) => f.ticker).map((f) => [f.ticker!.toUpperCase(), f]),
);

/**
 * Le fonds du registre correspondant à un actif du catalogue, ou `null`.
 *
 * L'ISIN d'abord — c'est l'identifiant sans ambiguïté. Le ticker ensuite, parce
 * que le catalogue n'a pas d'ISIN et que c'est par le ticker que l'émetteur
 * lui-même désigne ses ETF américains dans son screener.
 *
 * `null` reste une réponse normale : la plupart des fonds du catalogue n'ont
 * pas de source de composition, et ce n'est pas un défaut de ces fonds.
 */
export function resolveISharesFund(asset: {
  isin?: string | null;
  ticker?: string | null;
}): ISharesFundRef | null {
  const byIsin = asset.isin ? BY_ISIN.get(asset.isin.trim().toUpperCase()) : undefined;
  if (byIsin) return byIsin;
  const byTicker = asset.ticker ? BY_TICKER.get(asset.ticker.trim().toUpperCase()) : undefined;
  return byTicker ?? null;
}

/** Identifiant produit d'un fonds à partir de son seul ISIN. */
export function resolveISharesPortfolioId(isin: string | null | undefined): string | null {
  return resolveISharesFund({ isin })?.portfolioId ?? null;
}
