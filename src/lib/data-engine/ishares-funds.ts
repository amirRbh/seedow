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

export interface ISharesFundRef {
  /** ISIN du FONDS (pas de ses positions), tel que publié dans son classeur. */
  isin: string;
  /** Identifiant produit BlackRock, seule clé acceptée par l'API. */
  portfolioId: string;
  /** Nom officiel, conservé pour rendre une erreur de correspondance visible. */
  name: string;
}

/** Vérifiés le 25 août 2026 — chacun a renvoyé un classeur daté du même jour. */
export const ISHARES_FUNDS: readonly ISharesFundRef[] = [
  { isin: "IE00BGR7L912", portfolioId: "307241", name: "iShares $ Treasury Bond 0-1yr UCITS ETF" },
  { isin: "IE00BGSF1X88", portfolioId: "307243", name: "iShares $ Treasury Bond 0-1yr UCITS ETF" },
  { isin: "IE00B14X4S71", portfolioId: "251715", name: "iShares $ Treasury Bond 1-3yr UCITS ETF" },
  { isin: "IE00B3VWN393", portfolioId: "253744", name: "iShares $ Treasury Bond 3-7yr UCITS ETF" },
  {
    isin: "IE00B3VWN518",
    portfolioId: "253745",
    name: "iShares $ Treasury Bond 7-10yr UCITS ETF USD (Acc)",
  },
  { isin: "IE00BKM4GZ66", portfolioId: "264659", name: "iShares Core MSCI EM IMI UCITS ETF" },
  { isin: "IE00B4L5Y983", portfolioId: "251882", name: "iShares Core MSCI World UCITS ETF" },
  { isin: "IE00B5BMR087", portfolioId: "253743", name: "iShares Core S&P 500 UCITS ETF" },
  {
    isin: "IE00B1FZS350",
    portfolioId: "251801",
    name: "iShares Developed Markets Property Yield UCITS ETF",
  },
  { isin: "IE00B7J7TB45", portfolioId: "251813", name: "iShares Global Corp Bond UCITS ETF" },
  { isin: "IE00B2NPKV68", portfolioId: "251824", name: "iShares J.P. Morgan $ EM Bond UCITS ETF" },
  { isin: "IE00B6R52259", portfolioId: "251850", name: "iShares MSCI ACWI UCITS ETF" },
  { isin: "IE00B0M63177", portfolioId: "251857", name: "iShares MSCI EM UCITS ETF USD (Dist)" },
  {
    isin: "IE00B7XYN974",
    portfolioId: "251869",
    name: "iShares MSCI Japan GBP Hedged UCITS ETF (Acc)",
  },
  { isin: "IE00B52XQP83", portfolioId: "251877", name: "iShares MSCI South Africa UCITS ETF" },
  {
    isin: "IE00BP3QZD73",
    portfolioId: "270057",
    name: "iShares MSCI World Mid-Cap Equal Weight UCITS ETF",
  },
  { isin: "IE00BDZZTM54", portfolioId: "291392", name: "iShares MSCI World SRI UCITS ETF" },
  { isin: "IE00BF4RFH31", portfolioId: "296576", name: "iShares MSCI World Small Cap UCITS ETF" },
  { isin: "IE00B53SZB19", portfolioId: "253741", name: "iShares NASDAQ 100 UCITS ETF" },
  { isin: "IE00B52MJD48", portfolioId: "253742", name: "iShares Nikkei 225 UCITS ETF" },
  { isin: "IE00B5L65R35", portfolioId: "251840", name: "iShares £ Corp Bond 0-5yr UCITS ETF" },
] as const;

const BY_ISIN = new Map(ISHARES_FUNDS.map((f) => [f.isin.toUpperCase(), f]));

/**
 * Identifiant produit d'un fonds, ou `null` s'il n'est pas couvert. `null` est
 * une réponse normale, pas une erreur : la plupart des fonds du catalogue n'ont
 * pas encore de source de composition.
 */
export function resolveISharesPortfolioId(isin: string | null | undefined): string | null {
  if (!isin) return null;
  return BY_ISIN.get(isin.trim().toUpperCase())?.portfolioId ?? null;
}
