/**
 * Enrichissement d'IDENTITÉ des ETF promus (dormants) à partir de leur **nom** —
 * maillon qui débloque l'activation. `activation.ts` voie 2 (« tradeabilité
 * prouvée ») exige une identité complète : ISIN + nom + **issuer** + **domicile**
 * (`region`) + devise + TER. Les ETF promus ont déjà ISIN, nom, devise (défaut) et
 * TER (défaut) ; il manque `issuer` et `region`.
 *
 * Anti-invention (§1.3) : on ne DÉRIVE que ce que le nom du fonds affirme
 * explicitement. Marque non reconnue → `issuer = null` ; aucune géographie claire
 * dans le nom → `region = null`. On ne complète JAMAIS au jugé (pas de « probable »).
 *
 * `issuer` = société de gestion, via un mapping marque→gérant **public et non
 * contesté** (iShares = BlackRock, Xtrackers = DWS…). `region` = région
 * d'EXPOSITION lue dans le nom (World, US, Europe, EM, Japon…), pas le domicile.
 *
 * Fonctions PURES, sans I/O.
 */

/** Marque ETF (présente dans le nom) → société de gestion. Ordre = priorité. */
const ISSUER_BY_BRAND: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bishares\b/i, "BlackRock"],
  [/\bxtrackers\b/i, "DWS"],
  [/\bspdr\b/i, "State Street (SSGA)"],
  [/\bvanguard\b/i, "Vanguard"],
  [/\blyxor\b/i, "Amundi (Lyxor)"],
  [/\bamundi\b/i, "Amundi"],
  [/\binvesco\b/i, "Invesco"],
  [/\bwisdomtree\b/i, "WisdomTree"],
  [/\bvaneck\b/i, "VanEck"],
  [/\bglobal x\b/i, "Global X"],
  [/\bfranklin\b/i, "Franklin Templeton"],
  [/\bfidelity\b/i, "Fidelity"],
  [/\bhsbc\b/i, "HSBC"],
  [/\bbnp paribas\b/i, "BNP Paribas"],
  [/\bdeka\b/i, "Deka"],
  [/\bfirst trust\b/i, "First Trust"],
  [/\bhanetf\b/i, "HANetf"],
  [/\bpimco\b/i, "PIMCO"],
  [/\b(?:j\.?p\.?\s*morgan|jpm)\b/i, "J.P. Morgan AM"],
  [/\b(?:legal & general|l&g)\b/i, "LGIM"],
  [/\bubs\b/i, "UBS"],
];

/**
 * Société de gestion déduite de la marque présente dans le nom, ou `null` si
 * aucune marque connue (jamais deviné). La 1re marque reconnue gagne.
 */
export function extractIssuer(name: string | null): string | null {
  const n = name ?? "";
  for (const [re, issuer] of ISSUER_BY_BRAND) {
    if (re.test(n)) return issuer;
  }
  return null;
}

/** Régions d'exposition qu'on sait lire dans un nom d'ETF (sinon `null`). */
export type ExposureRegion = "world" | "us" | "europe" | "em" | "japan" | "china";

/** Règles ordonnées : la plus spécifique / prioritaire d'abord. */
const REGION_RULES: ReadonlyArray<readonly [RegExp, ExposureRegion]> = [
  // Émergents avant "world" (ex. « MSCI Emerging Markets »).
  [/emerging|\bem\b|\bmsci\s+em\b/i, "em"],
  [/\bchina\b|\bchinese\b|csi\s*300|\bhong kong\b/i, "china"],
  [/\bjapan\b|nikkei|topix/i, "japan"],
  [/\bworld\b|all.?world|\bacwi\b|\bglobal\b|developed markets|\bmsci world\b/i, "world"],
  [/s&p\s*500|nasdaq|\busa\b|\bu\.s\.\b|\bus\b|dow jones|\bamerica\b/i, "us"],
  [
    /\beurope\b|euro\s*stoxx|\bemu\b|eurozone|\bstoxx\b|ftse\s*100|\buk\b|\bdax\b|\bcac\b/i,
    "europe",
  ],
];

/**
 * Région d'EXPOSITION déduite du nom, ou `null` si aucune géographie claire
 * (fonds sectoriel/thématique sans pays → région inconnue, jamais inventée).
 */
export function inferExposureRegion(name: string | null): ExposureRegion | null {
  const n = name ?? "";
  for (const [re, region] of REGION_RULES) {
    if (re.test(n)) return region;
  }
  return null;
}

/** Champs d'identité dérivés d'un nom (l'un ou l'autre peut être null). */
export interface DerivedIdentity {
  issuer: string | null;
  region: ExposureRegion | null;
}

/** Dérive issuer + region depuis un nom. Au moins un des deux peut rester null. */
export function deriveIdentityFromName(name: string | null): DerivedIdentity {
  return { issuer: extractIssuer(name), region: inferExposureRegion(name) };
}
