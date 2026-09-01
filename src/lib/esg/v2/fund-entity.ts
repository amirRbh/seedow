/**
 * Déduplication — l'entité de référence est le FONDS, pas la ligne de cotation.
 *
 * Clé composite : `(émetteur, stratégie, indice répliqué)`. Les parts de classe
 * — accumulation/distribution, devise, couverture de change — sont des
 * ATTRIBUTS du même fonds, pas des fonds différents. Une seule fiche, un seul
 * STI, les ISIN listés dessous.
 *
 * Pourquoi c'est prioritaire : deux scores différents pour le même fonds selon
 * la ligne de données récupérée est le défaut qui décrédibilise le plus vite,
 * parce qu'il se vérifie en dix secondes. Le catalogue v1 portait iShares MSCI
 * Japan SRI à 68 (SUJP) et 85 (SUJM), iShares MSCI EM SRI à 72 et 81, et deux
 * jeux de thèmes divergents pour le même Amundi EUR Corporate Bond ESG.
 *
 * ── Comment la stratégie est dérivée ──────────────────────────────────────
 *
 * L'indice répliqué n'est pas stocké en base aujourd'hui. Il est donc dérivé du
 * nom commercial, en retirant les marqueurs de part de classe d'une liste
 * FERMÉE (`SHARE_CLASS_TOKENS`) — jamais par une heuristique qui devinerait. Un
 * token inconnu reste dans la clé : deux fonds réellement distincts ne seront
 * jamais fusionnés par excès de zèle. C'est le sens de l'erreur à préférer :
 * une fiche en double se voit et se corrige, une fusion abusive publie un STI
 * sur un fonds qui n'est pas celui-là.
 *
 * Fonctions pures, sans I/O.
 */

/**
 * Marqueurs de part de classe, retirés du nom avant comparaison. Liste fermée,
 * ordonnée du plus spécifique au plus général (« eur hedged » avant « eur »).
 */
const SHARE_CLASS_TOKENS = [
  "acc",
  "accumulating",
  "accumulation",
  "dist",
  "distributing",
  "distribution",
  "inc",
  "income",
  "cap",
  "capitalisation",
  "capitalization",
  "hedged",
  "hedge",
  "unhedged",
  "eur hedged",
  "usd hedged",
  "gbp hedged",
  "chf hedged",
  "eur",
  "usd",
  "gbp",
  "chf",
  "jpy",
  "ucits",
  "etf",
  "ucits etf",
  "class",
  "share class",
  "1c",
  "1d",
  "2c",
  "2d",
  "a2",
  "c2",
  "de",
  "fr",
  "ie",
  "lu",
] as const;

/** Retire diacritiques et ponctuation, normalise les espaces. */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Nom canonique d'une stratégie : le nom commercial débarrassé de ses marqueurs
 * de part de classe. Les tokens ne sont retirés qu'en FIN de nom (là où les
 * émetteurs les placent) ou entre parenthèses, jamais au milieu — « ESG Acc
 * World » ne doit pas devenir « ESG World ».
 */
export function canonicalStrategy(name: string): string {
  // Les parenthèses portent presque toujours la part de classe : « (Acc) »,
  // « (EUR Hedged) ». On les retire quand leur contenu n'est QUE des marqueurs.
  const withoutParens = name.replace(/\(([^)]*)\)/g, (whole, inner: string) => {
    const words = normalizeText(inner).split(" ").filter(Boolean);
    const allTokens =
      words.length > 0 && words.every((w) => (SHARE_CLASS_TOKENS as readonly string[]).includes(w));
    return allTokens ? " " : whole;
  });

  let words = normalizeText(withoutParens).split(" ").filter(Boolean);
  // Épluchage par la fin, tant que le dernier mot est un marqueur connu.
  while (words.length > 1 && (SHARE_CLASS_TOKENS as readonly string[]).includes(words.at(-1)!)) {
    words = words.slice(0, -1);
  }
  // « UCITS ETF » se glisse aussi au milieu (« … UCITS ETF USD Dist ») : une
  // fois la queue épluchée, ces deux mots-là ne distinguent plus rien.
  words = words.filter((w) => w !== "ucits" && w !== "etf");
  return words.join(" ");
}

export interface FundLine {
  ticker: string;
  name: string;
  issuer: string | null;
  isin: string | null;
  /** Indice répliqué, quand l'émetteur le publie. Entre dans la clé s'il existe. */
  benchmarkIndex?: string | null;
}

/**
 * Clé d'entité : `émetteur | stratégie | indice`. L'indice n'entre dans la clé
 * que lorsqu'il est connu — sinon deux lignes du même fonds, dont une seule
 * porte l'indice, ne se rejoindraient jamais.
 */
export function fundEntityKey(line: FundLine): string {
  const issuer = normalizeText(line.issuer ?? "");
  const strategy = canonicalStrategy(line.name);
  const index = normalizeText(line.benchmarkIndex ?? "");
  return [issuer || "emetteur-inconnu", strategy || normalizeText(line.ticker), index]
    .filter((part, i) => i < 2 || part.length > 0)
    .join("|");
}

export interface FundEntity<L extends FundLine = FundLine> {
  key: string;
  /** Nom retenu : le plus court des noms du groupe (le moins chargé en part de classe). */
  name: string;
  issuer: string | null;
  /** Toutes les lignes de cotation rattachées, dans l'ordre d'entrée. */
  lines: L[];
  isins: string[];
  tickers: string[];
  /** Identifiant d'URL de la fiche : premier ISIN connu, sinon premier ticker. */
  slug: string;
}

/**
 * Regroupe des lignes de cotation en entités-fonds. L'ordre des entités suit
 * celui de la première apparition — aucun tri implicite, le classement est une
 * décision d'affichage soumise aux règles de comparaison (cf. `peer-group.ts`).
 */
export function groupFundEntities<L extends FundLine>(lines: readonly L[]): FundEntity<L>[] {
  const byKey = new Map<string, FundEntity<L>>();
  for (const line of lines) {
    const key = fundEntityKey(line);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        name: line.name,
        issuer: line.issuer,
        lines: [line],
        isins: line.isin ? [line.isin] : [],
        tickers: [line.ticker],
        slug: line.isin ?? line.ticker,
      });
      continue;
    }
    existing.lines.push(line);
    if (line.isin && !existing.isins.includes(line.isin)) existing.isins.push(line.isin);
    if (!existing.tickers.includes(line.ticker)) existing.tickers.push(line.ticker);
    // Le nom le plus court est celui qui porte le moins de suffixes de part de
    // classe — c'est le nom du fonds, pas celui d'une de ses parts.
    if (line.name.length < existing.name.length) existing.name = line.name;
    if (!existing.issuer && line.issuer) existing.issuer = line.issuer;
    existing.slug = existing.isins[0] ?? existing.tickers[0];
  }
  return [...byKey.values()];
}
