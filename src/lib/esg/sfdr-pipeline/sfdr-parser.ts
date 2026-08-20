/**
 * Parseur SFDR **bilingue** (FR + EN) qui rend la PREUVE, pas seulement un
 * numéro (§6, §7, §18). C'est le cœur du pipeline : à partir du texte d'un
 * document officiel (KID/DIC/prospectus/annexe SFDR), il détermine l'article
 * SFDR (6/8/9) du fonds **uniquement s'il est réellement affirmé**, et renvoie :
 *   - l'article
 *   - le snippet exact qui le prouve (`evidenceText`)
 *   - la référence réglementaire trouvée (`regulationReference`)
 *   - un niveau de confiance (classification explicite = high, référence liée = medium)
 *
 * Anti-invention (§1) — jamais de déduction :
 *   - on ne déduit JAMAIS l'article du nom du fonds (ce parseur ne voit que le
 *     texte du document, pas le nom) ;
 *   - on ne transforme JAMAIS une absence d'info en « article 6 » (l'absence de
 *     promotion E/S ne suffit pas — il faut une classification affirmée) ;
 *   - un « article 8 » générique (« Article 8 products are described… ») ne
 *     suffit pas : le sujet de la phrase doit être le fonds lui-même ;
 *   - une négation devant l'article (« ne … pas … au sens de l'article 9 »,
 *     « does not qualify as Article 9 ») écarte ce numéro ;
 *   - plusieurs articles distincts affirmés → ambigu → null.
 *
 * Le parseur FR historique (`parseKidSfdrArticle`, lib/esg/kid-parser) reste la
 * référence pour les DIC français ; ce module en est le sur-ensemble bilingue,
 * qui produit en plus la preuve. `PARSER_VERSION` sert la reproductibilité (§15).
 */

/** Version du parseur — incrémentée à chaque changement de logique (§15). */
export const SFDR_PARSER_VERSION = 1;

export type SfdrArticle = 6 | 8 | 9;
export type SfdrConfidence = "high" | "medium";

export interface SfdrEvidence {
  /** Article SFDR affirmé par le document. */
  article: SfdrArticle;
  /**
   * `high` = classification explicite (« classified as / au sens de l'article X »).
   * `medium` = référence unique et non ambiguë à l'article X rattaché au règlement,
   * sans verbe de classification explicite.
   */
  confidence: SfdrConfidence;
  /** Snippet EXACT du document prouvant la classification (§7 « pourquoi ? »). */
  evidenceText: string;
  /** Référence réglementaire détectée (« EU 2019/2088 » ou « SFDR »). */
  regulationReference: string;
  /** Nature du match : classification explicite ou référence liée. */
  matchKind: "classification" | "bound_reference";
  /** Langue du passage de preuve. */
  language: "fr" | "en";
}

const NEGATION_WINDOW = 90;

/** Négation FR ou EN dans la fenêtre précédant l'index du match. */
function isNegatedBefore(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - NEGATION_WINDOW), index);
  return (
    /\bne\s+\S+\s+pas\b|\bn['’]est\s+pas\b|\bpas\s+d['’]|\bsans\b/i.test(before) ||
    /\b(does|do|did|is|are|was|were|will)\s+not\b|\bnot\b|\bwithout\b|\bno\b/i.test(before)
  );
}

/** Référence réglementaire lisible à partir du texte matché. */
function regRef(matched: string): string {
  return /2019\s*\/\s*2088/.test(matched) ? "EU 2019/2088" : "SFDR";
}

/** Extrait le passage-preuve : la « phrase » autour du match, bornée. */
function evidenceAround(text: string, index: number, matchLen: number): string {
  const MAX = 320;
  // Frontières de phrase les plus proches (point, saut de ligne, tabulation).
  const start = (() => {
    const lower = Math.max(0, index - MAX);
    const slice = text.slice(lower, index);
    const m = slice.search(/[.\n\r\t][^.\n\r\t]*$/);
    return m >= 0 ? lower + m + 1 : lower;
  })();
  const end = (() => {
    const upper = Math.min(text.length, index + matchLen + MAX);
    const slice = text.slice(index + matchLen, upper);
    const rel = slice.search(/[.\n\r]/);
    return rel >= 0 ? index + matchLen + rel + 1 : upper;
  })();
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

interface RawMatch {
  article: SfdrArticle;
  index: number;
  length: number;
  matched: string;
  language: "fr" | "en";
}

// ── FR : « au sens de / du règlement SFDR / 2019/2088 » ──────────────────────

const FR_REGLEMENT = "(?:du r[éèe]glement|de la r[éèe]glementation)";

/** FR classification explicite : « au sens de l'article X … règlement SFDR ». */
const FR_AUTHORITATIVE = new RegExp(
  String.raw`au sens de l['’]article\s*(6|8|9)\b[^.\n]{0,40}?\b${FR_REGLEMENT}\s*(?:\(UE\)\s*)?(?:n[°ºo]?\s*)?(?:2019\s*\/\s*2088|SFDR)`,
  "gi",
);

/** FR référence liée (sans « au sens de ») : « article X … règlement SFDR ». */
const FR_BOUND = new RegExp(
  String.raw`article\s*(6|8|9)\b[^.\n]{0,40}?\b${FR_REGLEMENT}\s*(?:\(UE\)\s*)?(?:n[°ºo]?\s*)?(?:2019\s*\/\s*2088|SFDR)`,
  "gi",
);

// ── EN : sujet = le fonds + verbe de classification ─────────────────────────

// Sujet acceptable : le fonds/produit lui-même (pas « Article 8 products … »).
const EN_SUBJECT = String.raw`(?:the\s+(?:sub[-\s]?)?fund|this\s+(?:sub[-\s]?)?fund|the\s+compartment|the\s+product|this\s+product|the\s+share\s+class)`;
// Verbe de classification réglementaire.
const EN_VERB = String.raw`(?:is|has\s+been|will\s+be|are)\s+(?:classified|categori[sz]ed|categori[sz]es|qualif(?:ies|ied)|designated|treated|considered)\s+(?:as|under)`;

/**
 * EN classification explicite : « The Fund is classified as (an) Article X
 * [product] [under/of … SFDR/2019/2088] ». On exige, après « Article X », SOIT
 * le nom « product/fund/financial product » (terminologie SFDR intrinsèque),
 * SOIT une référence SFDR/2019/2088 proche — sinon on n'accepte pas (évite les
 * « Article X » hors-sujet). Le sujet DOIT être le fonds (pas « Article 8
 * products are described »).
 */
const EN_AUTHORITATIVE = new RegExp(
  String.raw`${EN_SUBJECT}\s+${EN_VERB}\s+(?:an?\s+)?article\s*(6|8|9)\b` +
    String.raw`(?:\s*(?:product|fund|financial\s+product)|[^.\n]{0,60}?(?:2019\s*\/\s*2088|SFDR|sustainable\s+finance\s+disclosure))`,
  "gi",
);

/**
 * EN copule : « The Fund is an Article X product » (sans verbe de
 * classification, mais le nom « product/fund » rend l'énoncé SFDR).
 */
const EN_COPULA = new RegExp(
  String.raw`${EN_SUBJECT}\s+is\s+(?:an?\s+)?article\s*(6|8|9)\s+(?:product|fund|financial\s+product)`,
  "gi",
);

/** EN référence liée : « Article X … Regulation (EU) 2019/2088 / SFDR ». */
const EN_BOUND = new RegExp(
  String.raw`article\s*(6|8|9)\b[^.\n]{0,60}?(?:regulation\s*\(eu\)\s*)?(?:2019\s*\/\s*2088|\bSFDR\b|sustainable\s+finance\s+disclosure)`,
  "gi",
);

function collect(text: string, re: RegExp, language: "fr" | "en"): RawMatch[] {
  const out: RawMatch[] = [];
  for (const m of text.matchAll(re)) {
    if (m.index == null) continue;
    if (isNegatedBefore(text, m.index)) continue; // écarté par négation
    out.push({
      article: Number(m[1]) as SfdrArticle,
      index: m.index,
      length: m[0].length,
      matched: m[0],
      language,
    });
  }
  return out;
}

/** Réduit une liste de matches à un article unique + sa preuve, ou null si vide/ambigu. */
function resolve(
  matches: RawMatch[],
  matchKind: "classification" | "bound_reference",
  confidence: SfdrConfidence,
): SfdrEvidence | null {
  if (matches.length === 0) return null;
  const distinct = new Set(matches.map((m) => m.article));
  if (distinct.size !== 1) return null; // plusieurs classifications affirmées → ambigu
  const first = matches[0];
  return {
    article: first.article,
    confidence,
    evidenceText: "", // rempli par l'appelant avec le texte source complet
    regulationReference: regRef(first.matched),
    matchKind,
    language: first.language,
  };
}

/**
 * Détermine l'article SFDR d'un document + la preuve, ou null si non affirmé /
 * ambigu. Ordre : classification explicite (FR+EN, high) d'abord ; à défaut,
 * référence liée unique (FR+EN, medium). Jamais de déduction hors du texte.
 */
export function extractSfdrEvidence(text: string): SfdrEvidence | null {
  if (!text) return null;

  // 1) Classification explicite (la plus fiable) — FR et EN confondus.
  const authoritative = [
    ...collect(text, FR_AUTHORITATIVE, "fr"),
    ...collect(text, EN_AUTHORITATIVE, "en"),
    ...collect(text, EN_COPULA, "en"),
  ];
  const auth = resolve(authoritative, "classification", "high");
  if (auth) {
    const m = authoritative.find((x) => x.article === auth.article)!;
    return { ...auth, evidenceText: evidenceAround(text, m.index, m.length) };
  }
  // Si des classifications explicites existaient mais étaient ambiguës, on
  // s'arrête (ne pas « rattraper » avec une référence liée moins fiable).
  if (authoritative.length > 0) return null;

  // 2) Référence liée unique et non ambiguë — FR et EN.
  const bound = [...collect(text, FR_BOUND, "fr"), ...collect(text, EN_BOUND, "en")];
  const b = resolve(bound, "bound_reference", "medium");
  if (b) {
    const m = bound.find((x) => x.article === b.article)!;
    return { ...b, evidenceText: evidenceAround(text, m.index, m.length) };
  }
  return null;
}

/** Numéro d'article seul (compat / usage simple), sans la preuve. */
export function sfdrArticleOf(text: string): SfdrArticle | null {
  return extractSfdrEvidence(text)?.article ?? null;
}

/**
 * Y a-t-il un SIGNAL SFDR (un « article 6/8/9 » à proximité d'une référence
 * SFDR / 2019/2088) dans le texte, indépendamment du fait qu'on puisse en tirer
 * un article unique ? Sert au pipeline à distinguer un document « qui parle de
 * SFDR mais reste ambigu/nié » (AMBIGUOUS_SFDR) d'un document « sans aucune
 * mention » (NO_SFDR_MENTION), sans jamais servir à classer un fonds.
 */
export function hasSfdrSignal(text: string): boolean {
  if (!text) return false;
  FR_BOUND.lastIndex = 0;
  EN_BOUND.lastIndex = 0;
  return FR_BOUND.test(text) || EN_BOUND.test(text);
}
