/**
 * Pré-contrôle documentaire « noms de fonds » — orientations ESMA sur les noms
 * de fonds utilisant des termes ESG ou liés à la durabilité (ESMA34-1592494965-657,
 * applicables depuis le 21/11/2024 aux nouveaux fonds et depuis le 21/05/2025
 * aux fonds existants ; reprises par l'AMF dans DOC-2020-03).
 *
 * ── Ce que ce module fait ──────────────────────────────────────────────────
 *
 * Il lit le NOM d'un fonds, en déduit les catégories de termes employées, puis
 * confronte les exigences correspondantes à ce que la documentation du fonds
 * DÉCLARE (exclusions, part minimale d'investissements, investissements
 * durables). Chaque point rendu porte ses sources et sa ligne « ce que ce point
 * ne dit pas ».
 *
 * ── Ce qu'il ne fait pas ───────────────────────────────────────────────────
 *
 * Il ne regarde pas les positions du fonds : il ne dit jamais qu'un fonds
 * « respecte » ou « enfreint » les orientations. Il dit si la documentation
 * fournie porte, ou non, l'engagement que le nom appelle. C'est un pré-contrôle
 * documentaire destiné à la fonction conformité, pas un avis juridique.
 *
 * Même discipline que `v2/discrepancies.ts` : un point sans source n'existe pas,
 * et une absence dans les documents FOURNIS n'est jamais présentée comme une
 * absence dans les documents du fonds.
 *
 * Fonctions pures, sans I/O.
 */

import type { SourcedStatement } from "@/lib/esg/v2/discrepancies";

// ─────────────────────────────────────────────────────────────────────────────
// Catégories de termes
// ─────────────────────────────────────────────────────────────────────────────

export type NameTermCategory =
  | "environnement"
  | "impact"
  | "transition"
  | "social"
  | "gouvernance"
  | "durabilite";

export interface NameTermMatch {
  /** Terme tel que reconnu (forme normalisée du lexique). */
  term: string;
  categories: NameTermCategory[];
  /**
   * Terme dont le rattachement n'est pas explicitement tranché par le texte
   * (« responsable », « éthique ») : la lecture retenue est la plus prudente,
   * et le rapport le signale.
   */
  ambiguous: boolean;
}

interface LexiconEntry {
  term: string;
  categories: NameTermCategory[];
  ambiguous?: boolean;
}

const E: NameTermCategory[] = ["environnement"];
const ESG: NameTermCategory[] = ["environnement", "social", "gouvernance"];

/**
 * Lexique FR/EN. Les acronymes ESG / ISR / SRI sont lus comme des termes
 * environnementaux, sociaux ET de gouvernance à la fois : c'est l'application
 * la plus prudente, et elle déclenche le socle d'exclusions le plus exigeant.
 */
const LEXICON: LexiconEntry[] = [
  // Environnement
  { term: "green", categories: E },
  { term: "vert", categories: E },
  { term: "verte", categories: E },
  { term: "environmental", categories: E },
  { term: "environment", categories: E },
  { term: "environnement", categories: E },
  { term: "environnemental", categories: E },
  { term: "environnementale", categories: E },
  { term: "climate", categories: E },
  { term: "climat", categories: E },
  { term: "climatique", categories: E },
  { term: "carbon", categories: E },
  { term: "carbone", categories: E },
  { term: "low carbon", categories: E },
  { term: "bas carbone", categories: E },
  { term: "decarbonisation", categories: E },
  { term: "decarbonization", categories: E },
  { term: "paris aligned", categories: E },
  { term: "transition energetique", categories: E },
  { term: "energy transition", categories: E },
  { term: "biodiversity", categories: E },
  { term: "biodiversite", categories: E },
  { term: "planet", categories: E },
  { term: "planete", categories: E },
  { term: "ecology", categories: E },
  { term: "ecologique", categories: E },
  { term: "nature", categories: E },
  { term: "renewable", categories: E },
  { term: "renouvelable", categories: E },
  { term: "renouvelables", categories: E },
  { term: "clean energy", categories: E },
  { term: "solar", categories: E },
  { term: "solaire", categories: E },
  { term: "water", categories: E },
  { term: "ocean", categories: E },
  // Impact
  { term: "impact", categories: ["impact"] },
  // Transition
  { term: "transition", categories: ["transition"] },
  { term: "transitioning", categories: ["transition"] },
  { term: "transitional", categories: ["transition"] },
  { term: "improving", categories: ["transition"] },
  { term: "progress", categories: ["transition"] },
  { term: "progression", categories: ["transition"] },
  { term: "evolution", categories: ["transition"] },
  { term: "transformation", categories: ["transition"] },
  { term: "net zero", categories: ["transition"] },
  // Social
  { term: "social", categories: ["social"] },
  { term: "sociale", categories: ["social"] },
  { term: "solidaire", categories: ["social"] },
  { term: "equality", categories: ["social"] },
  { term: "egalite", categories: ["social"] },
  { term: "inclusion", categories: ["social"] },
  { term: "diversity", categories: ["social"] },
  { term: "diversite", categories: ["social"] },
  { term: "gender", categories: ["social"] },
  { term: "human rights", categories: ["social"] },
  { term: "droits humains", categories: ["social"] },
  // Gouvernance
  { term: "governance", categories: ["gouvernance"] },
  { term: "gouvernance", categories: ["gouvernance"] },
  // Acronymes E+S+G
  { term: "esg", categories: ESG },
  { term: "isr", categories: ESG },
  { term: "sri", categories: ESG },
  // Durabilité
  { term: "sustainable", categories: ["durabilite"] },
  { term: "sustainability", categories: ["durabilite"] },
  { term: "durable", categories: ["durabilite"] },
  { term: "durables", categories: ["durabilite"] },
  { term: "durabilite", categories: ["durabilite"] },
  // Termes non tranchés explicitement : lecture prudente, signalée.
  { term: "responsible", categories: ESG, ambiguous: true },
  { term: "responsable", categories: ESG, ambiguous: true },
  { term: "responsables", categories: ESG, ambiguous: true },
  { term: "ethical", categories: ESG, ambiguous: true },
  { term: "ethique", categories: ESG, ambiguous: true },
];

/** Minuscules, sans accents, ponctuation → espaces, bordé d'espaces. */
export function normalizeName(name: string): string {
  const flat = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${flat} `;
}

/** Termes ESMA reconnus dans un nom, dans l'ordre du lexique, sans doublon. */
export function detectNameTerms(name: string): NameTermMatch[] {
  const haystack = normalizeName(name);
  const out: NameTermMatch[] = [];
  for (const entry of LEXICON) {
    if (haystack.includes(` ${entry.term} `)) {
      out.push({
        term: entry.term,
        categories: entry.categories,
        ambiguous: entry.ambiguous ?? false,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exigences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exclusions de l'article 12(1) du règlement délégué (UE) 2020/1818.
 * CTB = points a) à c) ; PAB = points a) à g).
 */
export type ExclusionItem =
  | "armes_controversees"
  | "tabac"
  | "violations_ungc_ocde"
  | "charbon_1pct"
  | "petrole_10pct"
  | "gaz_50pct"
  | "electricite_100g_50pct";

export const CTB_EXCLUSIONS: readonly ExclusionItem[] = [
  "armes_controversees",
  "tabac",
  "violations_ungc_ocde",
];

export const PAB_EXCLUSIONS: readonly ExclusionItem[] = [
  ...CTB_EXCLUSIONS,
  "charbon_1pct",
  "petrole_10pct",
  "gaz_50pct",
  "electricite_100g_50pct",
];

export const EXCLUSION_LABELS: Record<ExclusionItem, string> = {
  armes_controversees: "armes controversées",
  tabac: "culture et production de tabac",
  violations_ungc_ocde: "violations du Pacte mondial de l'ONU / principes de l'OCDE",
  charbon_1pct: "charbon (≥ 1 % du chiffre d'affaires)",
  petrole_10pct: "pétrole (≥ 10 % du chiffre d'affaires)",
  gaz_50pct: "gaz (≥ 50 % du chiffre d'affaires)",
  electricite_100g_50pct: "production d'électricité > 100 g CO2e/kWh (≥ 50 % du CA)",
};

export type ExclusionBaseline = "CTB" | "PAB";

export interface NameRequirements {
  categories: NameTermCategory[];
  /** Socle d'exclusions appelé par le nom ; null si aucun terme reconnu. */
  baseline: ExclusionBaseline | null;
  /** Seuil de 80 % d'investissements servant les caractéristiques E/S ou l'objectif. */
  threshold80: boolean;
  /** Termes de durabilité : engagement d'investir « de manière significative » en investissements durables. */
  meaningfulSustainable: boolean;
  /** Termes de transition : trajectoire de transition claire et mesurable. */
  transitionPath: boolean;
  /** Termes d'impact : objectif d'impact positif et mesurable. */
  measurableImpact: boolean;
  /** Points de lecture à faire trancher par la conformité du client. */
  readingNotes: string[];
}

export function requirementsFor(matches: readonly NameTermMatch[]): NameRequirements {
  const categories = [...new Set(matches.flatMap((m) => m.categories))];
  const has = (c: NameTermCategory) => categories.includes(c);
  const readingNotes: string[] = [];

  if (categories.length === 0) {
    return {
      categories,
      baseline: null,
      threshold80: false,
      meaningfulSustainable: false,
      transitionPath: false,
      measurableImpact: false,
      readingNotes,
    };
  }

  const pab = has("environnement") || has("impact") || has("durabilite");
  if (has("transition") && (has("environnement") || has("impact"))) {
    readingNotes.push(
      "Le nom combine un terme de transition et un terme environnemental ou d'impact : le socle retenu ici est le plus exigeant (PAB). Le socle applicable à cette combinaison est à confirmer par la conformité au regard des orientations et des Q&A de l'ESMA.",
    );
  }
  for (const m of matches.filter((x) => x.ambiguous)) {
    readingNotes.push(
      `Le terme « ${m.term} » n'est pas rattaché explicitement à une catégorie par les orientations : il est lu ici comme un terme E, S et G (lecture la plus prudente).`,
    );
  }

  return {
    categories,
    baseline: pab ? "PAB" : "CTB",
    threshold80: true,
    meaningfulSustainable: has("durabilite"),
    transitionPath: has("transition"),
    measurableImpact: has("impact"),
    readingNotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentation fournie et contrôle
// ─────────────────────────────────────────────────────────────────────────────

export interface SourcedValue<T> {
  value: T;
  source: SourcedStatement;
}

export interface FundDocumentation {
  id: string;
  /** Dénomination légale, telle que publiée. */
  name: string;
  sfdrArticle: 6 | 8 | 9 | null;
  sfdrSource: SourcedStatement | null;
  /** La documentation renvoie explicitement aux exclusions CTB ou PAB (art. 12 du règlement 2020/1818). */
  benchmarkExclusionsReference: SourcedValue<ExclusionBaseline> | null;
  /** Exclusions déclarées une à une, chacune sourcée. */
  declaredExclusions: SourcedValue<ExclusionItem>[];
  /** Part minimale d'investissements servant les caractéristiques E/S ou l'objectif durable, en %. */
  minAlignedProportionPct: SourcedValue<number> | null;
  /** Part minimale d'investissements durables (art. 2(17) SFDR), en %. */
  minSustainableInvestmentPct: SourcedValue<number> | null;
}

export type CheckStatus = "documente" | "ecart_documentaire" | "a_verifier" | "sans_objet";

export type CheckCode = "N0" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6";

export interface NameCheckPoint {
  code: CheckCode;
  status: CheckStatus;
  title: string;
  detail: string;
  sources: SourcedStatement[];
  /** Ce que ce point ne dit pas — toujours affiché avec lui. */
  limit: string;
}

export interface FundNameCheck {
  fundId: string;
  name: string;
  terms: NameTermMatch[];
  requirements: NameRequirements;
  points: NameCheckPoint[];
}

const LIMIT_DOCS =
  "Ce point porte sur les documents fournis pour ce contrôle. Il ne dit pas qu'un autre document du fonds ne contient pas l'engagement, ni que les positions du fonds respectent ou non cet engagement.";

const LIMIT_HOLDINGS =
  "Ce contrôle est documentaire : il ne vérifie pas les positions du fonds. Le respect effectif des exclusions et du seuil de 80 % exige les inventaires et des données émetteurs au niveau du chiffre d'affaires.";

function missingExclusions(doc: FundDocumentation, baseline: ExclusionBaseline): ExclusionItem[] {
  const ref = doc.benchmarkExclusionsReference?.value;
  // Un renvoi explicite à un socle couvre toutes ses exclusions ; PAB inclut CTB.
  const covered = new Set<ExclusionItem>(
    ref === "PAB" ? PAB_EXCLUSIONS : ref === "CTB" ? CTB_EXCLUSIONS : [],
  );
  for (const d of doc.declaredExclusions) covered.add(d.value);
  const required = baseline === "PAB" ? PAB_EXCLUSIONS : CTB_EXCLUSIONS;
  return required.filter((item) => !covered.has(item));
}

export function checkFundName(doc: FundDocumentation): FundNameCheck {
  const terms = detectNameTerms(doc.name);
  const req = requirementsFor(terms);
  const points: NameCheckPoint[] = [];

  if (req.baseline === null) {
    points.push({
      code: "N0",
      status: "sans_objet",
      title: "Aucun terme ESG ou de durabilité reconnu dans le nom",
      detail:
        "Les exigences liées au nom ne sont pas déclenchées par ce contrôle. Les autres documents commerciaux restent soumis à la doctrine applicable.",
      sources: [],
      limit:
        "Le lexique de ce contrôle est fini : un terme absent du lexique mais qui donne l'impression de caractéristiques ESG reste à apprécier par la conformité.",
    });
    return { fundId: doc.id, name: doc.name, terms, requirements: req, points };
  }

  // N1 — socle d'exclusions
  const missing = missingExclusions(doc, req.baseline);
  const exclusionSources = [
    ...(doc.benchmarkExclusionsReference ? [doc.benchmarkExclusionsReference.source] : []),
    ...doc.declaredExclusions.map((d) => d.source),
  ];
  points.push({
    code: "N1",
    status: missing.length === 0 ? "documente" : "ecart_documentaire",
    title: `Exclusions du socle ${req.baseline} appelées par le nom`,
    detail:
      missing.length === 0
        ? `Les documents fournis portent l'ensemble des exclusions du socle ${req.baseline}.`
        : `Non trouvées dans les documents fournis : ${missing.map((m) => EXCLUSION_LABELS[m]).join(" ; ")}.`,
    sources: exclusionSources,
    limit: LIMIT_DOCS,
  });

  // N2 — seuil de 80 %
  const prop = doc.minAlignedProportionPct;
  points.push({
    code: "N2",
    status:
      prop === null ? "ecart_documentaire" : prop.value >= 80 ? "documente" : "ecart_documentaire",
    title: "Seuil de 80 % d'investissements servant les caractéristiques ou l'objectif",
    detail:
      prop === null
        ? "Aucune part minimale n'a été trouvée dans les documents fournis."
        : prop.value >= 80
          ? `Part minimale déclarée : ${prop.value} %.`
          : `Part minimale déclarée : ${prop.value} %, inférieure au seuil de 80 %.`,
    sources: prop ? [prop.source] : [],
    limit: LIMIT_DOCS,
  });

  // N3 — investissements durables (termes de durabilité)
  if (req.meaningfulSustainable) {
    const si = doc.minSustainableInvestmentPct;
    points.push({
      code: "N3",
      status: si === null || si.value <= 0 ? "ecart_documentaire" : "a_verifier",
      title: "Engagement d'investir de manière significative en investissements durables",
      detail:
        si === null || si.value <= 0
          ? "Aucune part minimale d'investissements durables n'a été trouvée dans les documents fournis."
          : `Part minimale d'investissements durables déclarée : ${si.value} %. Les orientations ne chiffrent pas « significatif » : l'appréciation revient à la conformité.`,
      sources: si ? [si.source] : [],
      limit:
        "Ce point ne dit pas si la part déclarée est « significative » au sens des orientations : le texte ne fixe pas de seuil, Seedow n'en invente pas.",
    });
  }

  // N4 — transition / impact : non vérifiable sur données structurées
  if (req.transitionPath || req.measurableImpact) {
    const what = [
      req.transitionPath ? "une trajectoire de transition claire et mesurable" : null,
      req.measurableImpact ? "un objectif d'impact positif et mesurable" : null,
    ]
      .filter(Boolean)
      .join(" et ");
    points.push({
      code: "N4",
      status: "a_verifier",
      title: "Exigences propres aux termes de transition ou d'impact",
      detail: `Le nom appelle ${what}. Ce point se lit dans l'objectif et la stratégie d'investissement : il est à relire manuellement.`,
      sources: [],
      limit:
        "Ce point ne porte aucune appréciation : il signale une exigence que ce contrôle ne sait pas vérifier sur des champs structurés.",
    });
  }

  // N5 — article 6 avec un nom ESG
  if (doc.sfdrArticle === 6) {
    points.push({
      code: "N5",
      status: "ecart_documentaire",
      title: "Nom ESG sur un produit classé article 6",
      detail:
        "Le nom emploie un terme ESG ou de durabilité alors que la documentation fournie classe le produit article 6 SFDR, qui ne promeut pas de caractéristiques environnementales ou sociales.",
      sources: doc.sfdrSource ? [doc.sfdrSource] : [],
      limit: LIMIT_DOCS,
    });
  }

  // N6 — toujours : limite du contrôle documentaire
  points.push({
    code: "N6",
    status: "a_verifier",
    title: "Respect effectif par les positions",
    detail:
      "Non couvert par ce contrôle documentaire : à vérifier sur les inventaires du fonds avec des données émetteurs.",
    sources: [],
    limit: LIMIT_HOLDINGS,
  });

  return { fundId: doc.id, name: doc.name, terms, requirements: req, points };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendu
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<CheckStatus, string> = {
  documente: "Documenté",
  ecart_documentaire: "Écart documentaire",
  a_verifier: "À vérifier",
  sans_objet: "Sans objet",
};

function cite(s: SourcedStatement): string {
  const where = [s.source_document, s.date].filter(Boolean).join(", ");
  const url = s.source_url ? ` — ${s.source_url}` : "";
  return `« ${s.text} » (${where || "source non précisée"})${url}`;
}

export interface ReportMeta {
  client: string;
  generatedOn: string;
  /** Mention obligatoire si les fonds sont fictifs (démonstration). */
  demo: boolean;
}

/** Rapport Markdown, un bloc par fonds, statuts toujours en toutes lettres. */
export function renderNameCheckReport(checks: readonly FundNameCheck[], meta: ReportMeta): string {
  const lines: string[] = [];
  lines.push(`# Pré-contrôle documentaire des noms de fonds — ${meta.client}`);
  lines.push("");
  if (meta.demo) {
    lines.push(
      "> **DÉMONSTRATION — fonds et documents fictifs.** Aucun de ces fonds n'existe ; ce rapport illustre le format du livrable.",
    );
    lines.push("");
  }
  lines.push(
    `Généré le ${meta.generatedOn}. Référentiel : orientations ESMA sur les noms de fonds (ESMA34-1592494965-657) et position-recommandation AMF DOC-2020-03.`,
  );
  lines.push("");
  lines.push(
    "Ce document est un pré-contrôle documentaire : il confronte le nom de chaque fonds aux engagements que porte la documentation fournie. Il ne vérifie pas les positions et ne constitue pas un avis juridique.",
  );
  lines.push("");

  const counts = { documente: 0, ecart_documentaire: 0, a_verifier: 0, sans_objet: 0 };
  for (const c of checks) for (const p of c.points) counts[p.status]++;
  lines.push("| Fonds contrôlés | Écarts documentaires | Documentés | À vérifier |");
  lines.push("| ---: | ---: | ---: | ---: |");
  lines.push(
    `| ${checks.length} | ${counts.ecart_documentaire} | ${counts.documente} | ${counts.a_verifier} |`,
  );
  lines.push("");

  for (const c of checks) {
    lines.push(`## ${c.name}`);
    lines.push("");
    const terms = c.terms.length ? c.terms.map((t) => `« ${t.term} »`).join(", ") : "aucun";
    lines.push(
      `Termes reconnus : ${terms}. Socle d'exclusions appelé : ${c.requirements.baseline ?? "aucun"}.`,
    );
    lines.push("");
    for (const note of c.requirements.readingNotes) lines.push(`- Point de lecture : ${note}`);
    if (c.requirements.readingNotes.length) lines.push("");
    for (const p of c.points) {
      lines.push(`### ${p.code} — ${p.title} : **${STATUS_LABEL[p.status]}**`);
      lines.push("");
      lines.push(p.detail);
      lines.push("");
      if (p.sources.length) {
        lines.push("Sources :");
        for (const s of p.sources) lines.push(`- ${cite(s)}`);
        lines.push("");
      }
      lines.push(`_Ce que ce point ne dit pas :_ ${p.limit}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
