/**
 * Détection des share-classes dupliquées (dédup de l'univers — §5.2 / N4).
 *
 * Un même fonds est souvent listé en plusieurs classes de parts (capitalisante
 * « Acc » / distribuante « Dist », devise couverte « EUR Hedged »…). Sans
 * dédup, l'univers présente 3 fois le même fonds comme 3 choix distincts, ce qui
 * détruit la confiance et fausse la diversification.
 *
 * IMPORTANT — ce module ne FUSIONNE rien et ne remplit JAMAIS `share_class_of`
 * automatiquement (§1.3 : on n'invente pas une relation d'identité qu'on n'a pas
 * vérifiée). Il ne fait que SIGNALER des groupes candidats, à confirmer par une
 * source (ISIN de la classe canonique) ou une revue humaine. La sortie est un
 * rapport ; la décision reste sourcée.
 *
 * Heuristique volontairement conservatrice : on regroupe par (émetteur, nom
 * normalisé) — le nom étant débarrassé des marqueurs de classe de parts et de
 * devise. Deux actifs déjà reliés (`share_class_of` renseigné) ou de nom racine
 * différent ne sont jamais regroupés. Fonctions PURES, aucune I/O.
 */

/** Sous-ensemble de `assets` nécessaire à la détection. */
export interface ShareClassAsset {
  id: string;
  name: string;
  isin: string | null;
  issuer: string | null;
  /** Déjà relié à un canonique ? (null = candidat potentiel). */
  shareClassOf: string | null;
}

/** Marqueurs de classe de parts / devise retirés du nom pour obtenir la racine. */
const SHARE_CLASS_TOKENS = new Set([
  "acc",
  "accumulating",
  "accumulation",
  "dist",
  "distributing",
  "distribution",
  "inc",
  "income",
  "hedged",
  "hedge",
  "hgd",
  "unhedged",
  "ucits",
  "etf",
  "etc",
  "fund",
  "class",
  "cap",
  "capitalisation",
  "usd",
  "eur",
  "gbp",
  "chf",
  "jpy",
  "cad",
  "aud",
  "sek",
  "nok",
  "dkk",
]);

/**
 * Normalise un nom de fonds vers sa « racine » comparable : minuscules, sans
 * diacritiques, sans ponctuation, sans parenthèses, et sans les marqueurs de
 * classe de parts / devise. Deux parts du même fonds convergent vers la même
 * racine ; deux fonds distincts restent distincts.
 */
export function normalizeFundName(name: string): string {
  const noDiacritics = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const noParens = noDiacritics.replace(/\([^)]*\)/g, " ");
  const tokens = noParens
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !SHARE_CLASS_TOKENS.has(tok));
  return tokens.join(" ").trim();
}

/** Clé de regroupement : émetteur normalisé + racine du nom. */
function groupKey(asset: ShareClassAsset): string {
  const issuer = (asset.issuer ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return `${issuer}::${normalizeFundName(asset.name)}`;
}

/** Un groupe de share-classes candidates au même fonds sous-jacent. */
export interface ShareClassCandidateGroup {
  /** Racine commune (nom normalisé) — sert de libellé de groupe. */
  root: string;
  issuer: string | null;
  /** Actifs du groupe (≥ 2), à confirmer comme classes d'un même fonds. */
  members: ShareClassAsset[];
}

/**
 * Repère les groupes de ≥ 2 actifs partageant émetteur + racine de nom, parmi
 * les actifs NON encore reliés (`share_class_of` null). Racine vide ignorée (un
 * nom réduit à des marqueurs génériques n'est pas un signal fiable). Ne fusionne
 * rien : renvoie des candidats à confirmer.
 */
export function detectShareClassCandidates(assets: ShareClassAsset[]): ShareClassCandidateGroup[] {
  const buckets = new Map<string, ShareClassAsset[]>();
  for (const asset of assets) {
    if (asset.shareClassOf !== null) continue; // déjà relié → hors détection
    const root = normalizeFundName(asset.name);
    if (root === "") continue; // pas de signal exploitable
    const key = groupKey(asset);
    const arr = buckets.get(key) ?? [];
    arr.push(asset);
    buckets.set(key, arr);
  }

  const groups: ShareClassCandidateGroup[] = [];
  for (const members of buckets.values()) {
    if (members.length < 2) continue;
    groups.push({
      root: normalizeFundName(members[0].name),
      issuer: members[0].issuer,
      members,
    });
  }
  // Groupes les plus « denses » d'abord (plus de doublons = à traiter en priorité).
  groups.sort((a, b) => b.members.length - a.members.length);
  return groups;
}
