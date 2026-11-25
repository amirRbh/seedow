/**
 * Orientations de l'ESMA sur les noms de fonds utilisant des termes ESG ou de
 * durabilité (rapport final ESMA34-472-440, annexe IV, §15 à 19). Module pur.
 *
 * §15 classe les termes en six familles ; §16 à 18 en déduisent les exigences :
 *   - transition, social, gouvernance : 80 % + exclusions CTB (art. 12(1)(a)-(c)
 *     du règlement délégué 2020/1818) ;
 *   - environnement (dont « ESG », « SRI »), impact : 80 % + exclusions PAB
 *     (art. 12(1)(a)-(g)) ;
 *   - durabilité : 80 % + PAB + investir « de manière significative » en
 *     investissements durables (art. 2(17) SFDR).
 * §19 : termes combinés → exigences cumulées, SAUF avec un terme « transition »,
 * où seules les exigences §16 (CTB) s'appliquent.
 *
 * Les listes de mots reprennent les exemples de §15 et leurs équivalents
 * français. Ce que §15 laisse à l'appréciation (« tout mot donnant
 * l'impression… ») est marqué `interpreted` : c'est une lecture de Seedow.
 */

export type EsmaTermCategory =
  | "transition"
  | "environmental"
  | "social"
  | "governance"
  | "impact"
  | "sustainability";

export interface EsmaTermMatch {
  category: EsmaTermCategory;
  /** Mot tel qu'il figure dans le nom. */
  term: string;
  /** Rattachement par interprétation de §15 (le mot n'est pas un exemple de l'ESMA). */
  interpreted: boolean;
}

interface Rule {
  category: EsmaTermCategory;
  re: RegExp;
  interpreted?: boolean;
}

// Appliquées sur le nom sans accents, en minuscules.
const RULES: readonly Rule[] = [
  // Transition (§15 : transition, improve, progress, evolution, transformation, net-zero)
  { category: "transition", re: /\btransition\w*/ },
  { category: "transition", re: /\bimprov\w*|\bamelior\w*/ },
  { category: "transition", re: /\bprogres\w*/ },
  { category: "transition", re: /\bevolution\w*/ },
  { category: "transition", re: /\btransformation\w*/ },
  { category: "transition", re: /\bnet[\s-]?zero\b|\bzero emission nette\b/ },
  // Environnement (§15 : green, environmental, climate, ESG, SRI)
  { category: "environmental", re: /\bgreen(?:s|er|est)?\b/ },
  { category: "environmental", re: /\benvironnement\w*|\benvironment\w*/ },
  { category: "environmental", re: /\bclimat\w*/ },
  { category: "environmental", re: /\besg\b/ },
  { category: "environmental", re: /\bsri\b|\bisr\b/ },
  { category: "environmental", re: /\bverte?s?\b/, interpreted: true },
  { category: "environmental", re: /\bcarbon\w*/, interpreted: true },
  { category: "environmental", re: /\becolog\w*/, interpreted: true },
  { category: "environmental", re: /\brespons[ai]b\w*/, interpreted: true },
  // Social (§15 : social, equality)
  { category: "social", re: /\bsocial\w*|\bsociaux\b/ },
  { category: "social", re: /\bequality\b|\begalite\w*/ },
  { category: "social", re: /\bsolidai\w*/, interpreted: true },
  // Gouvernance (§15 : governance, controversies)
  { category: "governance", re: /\bgovernance\b|\bgouvernance\b/ },
  { category: "governance", re: /\bcontrovers\w*/ },
  // Impact (§15 : termes dérivés de « impact »)
  { category: "impact", re: /\bimpact\w*/ },
  // Durabilité (§15 : termes dérivés de « sustainable » ; FR « durable »)
  { category: "sustainability", re: /\bsustainab\w*/ },
  { category: "sustainability", re: /\bdurab\w*/ },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Termes du nom relevant des orientations ESMA, dans l'ordre des familles de §15. */
export function esmaTermsInName(name: string): EsmaTermMatch[] {
  const n = fold(name);
  const out: EsmaTermMatch[] = [];
  // Une règle = un mot distinct : pas de doublon possible.
  for (const r of RULES) {
    const m = r.re.exec(n);
    if (!m) continue;
    out.push({ category: r.category, term: m[0], interpreted: r.interpreted === true });
  }
  return out;
}

export type BenchmarkExclusions = "pab" | "ctb";

export interface EsmaNameRequirements {
  categories: EsmaTermCategory[];
  /** Exclusions attendues : PAB (12(1)(a)-(g)) ou CTB (12(1)(a)-(c)), null si aucun terme. */
  exclusions: BenchmarkExclusions | null;
  /** §18 : engagement significatif en investissements durables. */
  meaningfulSustainableInvestment: boolean;
}

export function esmaRequirements(matches: readonly EsmaTermMatch[]): EsmaNameRequirements {
  const cats = [...new Set(matches.map((m) => m.category))];
  if (cats.length === 0) {
    return { categories: [], exclusions: null, meaningfulSustainableInvestment: false };
  }
  const hasTransition = cats.includes("transition");
  const needsPab = cats.some(
    (c) => c === "environmental" || c === "impact" || c === "sustainability",
  );
  return {
    categories: cats,
    // §19 : un terme « transition » ramène aux exigences de §16 (CTB).
    exclusions: hasTransition ? "ctb" : needsPab ? "pab" : "ctb",
    meaningfulSustainableInvestment: cats.includes("sustainability"),
  };
}

/** Les exclusions déclarées couvrent-elles celles attendues ? (PAB inclut CTB.) */
export function exclusionsSatisfy(
  declared: BenchmarkExclusions,
  required: BenchmarkExclusions,
): boolean {
  return declared === "pab" || required === "ctb";
}

export const ESMA_CATEGORY_LABELS: Record<EsmaTermCategory, string> = {
  transition: "transition",
  environmental: "environnement",
  social: "social",
  governance: "gouvernance",
  impact: "impact",
  sustainability: "durabilité",
};

export const EXCLUSION_LABELS: Record<BenchmarkExclusions, string> = {
  pab: "exclusions des indices de référence « accord de Paris » (PAB, art. 12(1)(a) à (g) du règlement délégué 2020/1818)",
  ctb: "exclusions des indices « transition climatique » (CTB, art. 12(1)(a) à (c) du règlement délégué 2020/1818)",
};
