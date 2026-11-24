/**
 * Vérification des preuves d'une extraction : chaque citation doit figurer
 * dans le texte de la page citée. Module pur, sans I/O.
 *
 * Normalisation (texte de page ET citation) : NFKC, minuscules, apostrophes et
 * tirets unifiés, puis suppression de tout ce qui n'est ni lettre ni chiffre ni
 * « % ». Les extracteurs PDF insèrent des espaces au milieu des mots
 * (« filtrag e », « a - t - il ») et coupent les lignes n'importe où : comparer
 * les seuls caractères signifiants rend la vérification robuste à ces artefacts
 * sans la rendre laxiste (l'ordre des caractères est conservé).
 *
 * Statut : `needs_review` dès qu'UNE citation échoue, qu'un champ clé est null
 * pour un fonds art. 8/9, ou qu'une valeur est ambiguë ou lue sur un graphique
 * pour un champ clé. Sinon `auto`. `validated` ne s'obtient que par revue humaine.
 */
import {
  EVIDENCE_FIELDS,
  KEY_FIELDS,
  PAI_CATEGORIES,
  PCT_FIELDS,
  type Extraction,
  type ExtractionField,
  type PaiCategory,
} from "./schema";

/** Longueur normalisée minimale d'une citation probante. */
export const MIN_QUOTE_CHARS = 15;

export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’ʼ′`]/g, "'")
    .replace(/[^\p{L}\p{N}%]+/gu, "");
}

/** Fragments d'une citation séparés par des points de suspension (tolérés). */
function quoteFragments(quote: string): string[] {
  return quote
    .split(/\.{3,}|…|\[\s*\.\.\.\s*\]/)
    .map(normalizeForMatch)
    .filter((f) => f.length > 0);
}

/** La citation apparaît-elle (fragments dans l'ordre) dans le texte ? */
export function quoteInText(quote: string, text: string): boolean {
  const frags = quoteFragments(quote);
  if (frags.length === 0) return false;
  const hay = normalizeForMatch(text);
  let from = 0;
  for (const f of frags) {
    const i = hay.indexOf(f, from);
    if (i < 0) return false;
    from = i + f.length;
  }
  return true;
}

/** Nombres présents dans une citation (« 55,0 % » → 55, « 1.5% » → 1.5). */
export function numbersIn(quote: string): number[] {
  const out: number[] = [];
  for (const m of quote.normalize("NFKC").matchAll(/\d+(?:[.,]\d+)?/g)) {
    out.push(Number(m[0].replace(",", ".")));
  }
  return out;
}

export interface EvidenceRecord {
  page: number | null;
  quote: string | null;
  verified: boolean;
  ambiguous?: boolean;
  visual?: boolean;
  note?: string | null;
  /** Pages où la citation a été trouvée quand ce n'est pas la page citée. */
  found_on_pages?: number[];
  issue?: string;
}

export type EvidenceMap = Record<string, EvidenceRecord>;

export interface VerificationResult {
  evidence: EvidenceMap;
  status: "auto" | "needs_review";
  /** Raisons lisibles du passage en revue (vide si `auto`). */
  reviewReasons: string[];
  /** Catégories PAI identifiées (explicites, ou toutes si « tous les indicateurs obligatoires »). */
  paiCategories: PaiCategory[];
}

function checkQuote(
  quote: string | null,
  page: number | null,
  pages: readonly string[],
): Pick<EvidenceRecord, "verified" | "found_on_pages" | "issue"> {
  if (!quote || page === null) return { verified: false, issue: "citation ou page manquante" };
  if (normalizeForMatch(quote).length < MIN_QUOTE_CHARS) {
    return { verified: false, issue: "citation trop courte pour être probante" };
  }
  if (page < 1 || page > pages.length) {
    return { verified: false, issue: `page ${page} hors du document (${pages.length} p.)` };
  }
  if (quoteInText(quote, pages[page - 1])) return { verified: true };
  const elsewhere = pages.flatMap((t, i) => (quoteInText(quote, t) ? [i + 1] : []));
  return elsewhere.length > 0
    ? {
        verified: false,
        found_on_pages: elsewhere,
        issue: `citation absente de la p. ${page}, trouvée p. ${elsewhere.join(", ")}`,
      }
    : { verified: false, issue: `citation introuvable dans le document` };
}

const isPct = (f: ExtractionField): boolean => (PCT_FIELDS as readonly string[]).includes(f);
const isKey = (f: ExtractionField): boolean => (KEY_FIELDS as readonly string[]).includes(f);

/**
 * Vérifie toutes les preuves d'une extraction contre le texte des pages.
 * `pages[0]` = texte de la page 1 du PDF.
 */
export function verifyExtraction(x: Extraction, pages: readonly string[]): VerificationResult {
  const evidence: EvidenceMap = {};
  const reasons: string[] = [];

  for (const f of EVIDENCE_FIELDS) {
    const e = x[f];
    if (e.value === null) continue;
    const rec: EvidenceRecord = {
      page: e.page,
      quote: e.quote,
      ...checkQuote(e.quote, e.page, pages),
    };
    if (e.ambiguous) rec.ambiguous = true;
    if (e.visual) rec.visual = true;
    if (e.note) rec.note = e.note;
    // Un pourcentage lu dans le texte doit apparaître dans sa citation : une
    // citation exacte qui ne contient pas le chiffre ne prouve rien.
    if (rec.verified && isPct(f) && !e.visual && typeof e.value === "number") {
      const v = e.value;
      if (!numbersIn(e.quote ?? "").some((n) => Math.abs(n - v) < 1e-9)) {
        rec.verified = false;
        rec.issue = `la citation ne contient pas la valeur ${v}`;
      }
    }
    evidence[f] = rec;
    if (!rec.verified) reasons.push(`${f} : ${rec.issue}`);
    if (e.ambiguous) reasons.push(`${f} : plusieurs chiffres dans le document (minimum retenu)`);
    if (e.visual && isKey(f)) reasons.push(`${f} : valeur lue sur un élément graphique`);
  }

  // Catégories PAI : explicites, chacune avec sa preuve.
  const explicit = new Set<PaiCategory>();
  for (const c of x.pai_categories) {
    const rec: EvidenceRecord = {
      page: c.page,
      quote: c.quote,
      ...checkQuote(c.quote, c.page, pages),
    };
    evidence[`pai_category:${c.category}`] = rec;
    if (rec.verified) explicit.add(c.category);
    else reasons.push(`pai_category:${c.category} : ${rec.issue}`);
  }
  // « Tous les indicateurs obligatoires du tableau 1 » couvre les cinq catégories
  // (indicateurs 1-6 GES, 7 biodiversité, 8 eau, 9 déchets, 10-14 social).
  const allMandatory =
    x.pai_all_mandatory_indicators.value === true &&
    evidence.pai_all_mandatory_indicators?.verified === true;
  const paiCategories = allMandatory
    ? [...PAI_CATEGORIES]
    : PAI_CATEGORIES.filter((c) => explicit.has(c));

  // Champs clés manquants pour un fonds qui doit publier une annexe.
  const article = x.sfdr_article.value;
  if (article === null) reasons.push("sfdr_article : article SFDR non établi");
  if (article === 8 || article === 9) {
    for (const f of KEY_FIELDS) {
      if (x[f].value === null) reasons.push(`${f} : absent alors que le fonds est art. ${article}`);
    }
  }

  return {
    evidence,
    status: reasons.length > 0 ? "needs_review" : "auto",
    reviewReasons: reasons,
    paiCategories,
  };
}
