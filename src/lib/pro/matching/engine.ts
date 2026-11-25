/**
 * Moteur de matching préférences de durabilité ↔ engagements de l'annexe SFDR.
 * Module PUR : aucune I/O, aucune horloge (la date de référence est passée
 * en option), même entrée → même sortie. Versionné : tout changement de règle
 * incrémente `ENGINE_VERSION`, archivée dans chaque rapport.
 *
 * Axes (un par préférence exprimée par le client) :
 *   (a) taxinomie   PASS si engagement ≥ minimum demandé ; on retient la valeur
 *                   la plus conservatrice entre « avec » et « hors » souverains
 *   (b) SFDR 2(17)  PASS si proportion minimale durable ≥ minimum demandé
 *   (c) PAI         PASS si le fonds prend en compte les PAI ; si le client a
 *                   choisi des catégories non identifiables → A_CONFIRMER
 *   Donnée absente → DONNEE_MANQUANTE, jamais PASS. Fonds art. 6 → (a) et (b) FAIL.
 *
 * Verdict : NEUTRE (aucune préférence) ; A_VERIFIER (fonds sans données,
 * donnée manquante, extraction `needs_review`, ou seul un axe reste à
 * confirmer) ; ADEQUAT (tous les axes PASS) ; NON_ADEQUAT (tous FAIL) ;
 * PARTIEL (sinon).
 *
 * Les alertes constatent un écart entre le document et un seuil ; elles ne
 * prêtent aucune intention au gérant et ne changent pas le verdict.
 */
import { PAI_CATEGORIES, type PaiCategory } from "../extraction/schema";
import {
  ESMA_CATEGORY_LABELS,
  EXCLUSION_LABELS,
  esmaRequirements,
  esmaTermsInName,
  exclusionsSatisfy,
} from "./esma-names";
import type {
  Alert,
  AxisResult,
  AxisSource,
  ClientPreferences,
  FundData,
  MatchOptions,
  MatchResult,
  Verdict,
} from "./types";

/**
 * 1.0.0 : axes (a), (b), (c), verdicts, alertes.
 * 1.1.0 : alertes de nom alignées sur les orientations ESMA (familles de
 *         termes, exclusions PAB/CTB) ; évaluation au niveau du portefeuille.
 */
export const ENGINE_VERSION = "1.1.0";

/** Seuil des orientations de l'ESMA sur les noms de fonds utilisant des termes ESG ou de durabilité. */
export const ESMA_NAME_THRESHOLD_PCT = 80;
/** Ancienneté au-delà de laquelle un document est signalé. */
export const DOC_MAX_AGE_MONTHS = 12;

export const PAI_CATEGORY_LABELS: Record<PaiCategory, string> = {
  ghg: "GES",
  biodiversity: "biodiversité",
  water: "eau",
  waste: "déchets",
  social: "social",
};

export function formatPct(v: number): string {
  return `${String(Math.round(v * 100) / 100).replace(".", ",")} %`;
}

/** `doc_date` + 12 mois est-il antérieur à `asOf` ? (comparaison de dates ISO) */
export function isOlderThanMonths(docDate: string, asOf: string, months: number): boolean {
  const [y, m, d] = docDate.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const limit = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return asOf > limit;
}

function src(fund: FundData, field: string): AxisSource {
  const e = fund.evidence[field];
  return { field, page: e?.page ?? null, quote: e?.quote ?? null };
}

const NOT_DISCLOSED = "non renseigné";

function axisTaxonomy(min: number, fund: FundData): AxisResult {
  const requested = `≥ ${formatPct(min)}`;
  const incl = fund.min_taxonomy_pct;
  const excl = fund.min_taxonomy_pct_excl_sovereign;
  const base = { axis: "a" as const, requested };
  if (fund.sfdr_article === 6) {
    return {
      ...base,
      status: "FAIL",
      fund_value: "article 6",
      detail:
        "Fonds relevant de l'article 6 SFDR : pas d'annexe précontractuelle, aucun engagement d'alignement sur la taxinomie.",
      sources: [],
    };
  }
  const candidates: { field: string; value: number }[] = [];
  if (incl !== null) candidates.push({ field: "min_taxonomy_pct", value: incl });
  if (excl !== null) candidates.push({ field: "min_taxonomy_pct_excl_sovereign", value: excl });
  if (candidates.length === 0) {
    return {
      ...base,
      status: "DONNEE_MANQUANTE",
      fund_value: NOT_DISCLOSED,
      detail: "Proportion minimale alignée sur la taxinomie non trouvée dans l'annexe.",
      sources: [],
    };
  }
  const retained = candidates.reduce((lo, c) => (c.value < lo.value ? c : lo));
  const both = candidates.length === 2;
  const scope =
    retained.field === "min_taxonomy_pct"
      ? "obligations souveraines comprises"
      : "hors obligations souveraines";
  const pass = retained.value >= min;
  return {
    ...base,
    status: pass ? "PASS" : "FAIL",
    fund_value: formatPct(retained.value),
    detail:
      `Engagement minimum d'alignement sur la taxinomie : ${formatPct(retained.value)} (${scope}` +
      (both ? ", valeur la plus basse des deux graphiques" : "") +
      `), ${pass ? "supérieur ou égal" : "inférieur"} au minimum demandé de ${formatPct(min)}.`,
    sources: candidates.map((c) => src(fund, c.field)),
  };
}

function axisSfdr(min: number, fund: FundData): AxisResult {
  const requested = `≥ ${formatPct(min)}`;
  const base = { axis: "b" as const, requested };
  if (fund.sfdr_article === 6) {
    return {
      ...base,
      status: "FAIL",
      fund_value: "article 6",
      detail:
        "Fonds relevant de l'article 6 SFDR : pas d'annexe précontractuelle, aucun engagement d'investissements durables.",
      sources: [],
    };
  }
  const v = fund.min_sustainable_pct;
  if (v === null) {
    return {
      ...base,
      status: "DONNEE_MANQUANTE",
      fund_value: NOT_DISCLOSED,
      detail: "Proportion minimale d'investissements durables non trouvée dans l'annexe.",
      sources: [],
    };
  }
  const pass = v >= min;
  return {
    ...base,
    status: pass ? "PASS" : "FAIL",
    fund_value: formatPct(v),
    detail: `Proportion minimale d'investissements durables (art. 2(17) SFDR) : ${formatPct(v)}, ${
      pass ? "supérieure ou égale" : "inférieure"
    } au minimum demandé de ${formatPct(min)}.`,
    sources: [src(fund, "min_sustainable_pct")],
  };
}

function axisPai(categories: readonly PaiCategory[], fund: FundData): AxisResult {
  const labels = (cs: readonly PaiCategory[]) => cs.map((c) => PAI_CATEGORY_LABELS[c]).join(", ");
  const requested = categories.length
    ? `prise en compte des PAI : ${labels(categories)}`
    : "prise en compte des PAI";
  const base = { axis: "c" as const, requested };
  if (fund.considers_pai === null) {
    return {
      ...base,
      status: "DONNEE_MANQUANTE",
      fund_value: NOT_DISCLOSED,
      detail:
        "Réponse à la question sur les principales incidences négatives non trouvée dans l'annexe.",
      sources: [],
    };
  }
  if (!fund.considers_pai) {
    return {
      ...base,
      status: "FAIL",
      fund_value: "non",
      detail:
        "L'annexe indique que le produit ne prend pas en considération les principales incidences négatives.",
      sources: [src(fund, "considers_pai")],
    };
  }
  const sources = [src(fund, "considers_pai")];
  const missing = PAI_CATEGORIES.filter(
    (c) => categories.includes(c) && !fund.pai_categories.includes(c),
  );
  if (missing.length > 0) {
    const found = PAI_CATEGORIES.filter(
      (c) => categories.includes(c) && fund.pai_categories.includes(c),
    );
    return {
      ...base,
      status: "A_CONFIRMER",
      fund_value: fund.pai_categories.length
        ? `oui (identifiées : ${labels(fund.pai_categories)})`
        : "oui",
      detail:
        `L'annexe indique une prise en compte des principales incidences négatives, mais ne permet pas d'identifier la ou les catégories : ${labels(missing)}.` +
        (found.length ? ` Catégories identifiées : ${labels(found)}.` : "") +
        " À confirmer à partir des autres documents du fonds.",
      sources: [...sources, ...found.map((c) => src(fund, `pai_category:${c}`))],
    };
  }
  return {
    ...base,
    status: "PASS",
    fund_value: categories.length ? `oui (${labels(categories)})` : "oui",
    detail: categories.length
      ? `L'annexe indique une prise en compte des principales incidences négatives, catégories demandées identifiées : ${labels(categories)}.`
      : "L'annexe indique une prise en compte des principales incidences négatives.",
    sources: [...sources, ...categories.map((c) => src(fund, `pai_category:${c}`))],
  };
}

function alertsFor(fund: FundData, opts: MatchOptions): Alert[] {
  const alerts: Alert[] = [];
  const matches = esmaTermsInName(fund.name);
  const req = esmaRequirements(matches);
  const quoted = (ts: string[]) => [...new Set(ts)].map((t) => `« ${t} »`).join(", ");
  const families = req.categories.map((c) => ESMA_CATEGORY_LABELS[c]).join(", ");
  const nameIntro =
    matches.length === 0
      ? ""
      : `Le nom du fonds contient ${matches.length > 1 ? "les termes" : "le terme"} ${quoted(
          matches.map((m) => m.term),
        )} (famille${req.categories.length > 1 ? "s" : ""} ESMA : ${families}${
          matches.some((m) => m.interpreted) ? ", rattachement interprété par Seedow" : ""
        }). `;

  if (
    matches.length > 0 &&
    fund.min_es_aligned_pct !== null &&
    fund.min_es_aligned_pct < ESMA_NAME_THRESHOLD_PCT
  ) {
    alerts.push({
      code: "NOM_ESG_ALLOCATION_FAIBLE",
      level: "attention",
      message:
        nameIntro +
        `L'annexe prévoit une proportion minimale de ${formatPct(fund.min_es_aligned_pct)} d'investissements de la catégorie #1, ` +
        `en dessous du seuil de ${ESMA_NAME_THRESHOLD_PCT} % retenu par les orientations de l'ESMA sur les noms de fonds.`,
      sources: [src(fund, "min_es_aligned_pct")],
    });
  }
  const declared = fund.benchmark_exclusions;
  if (req.exclusions && declared) {
    const satisfied = declared !== "not_stated" && exclusionsSatisfy(declared, req.exclusions);
    if (!satisfied) {
      alerts.push({
        code: "NOM_EXCLUSIONS_NON_MENTIONNEES",
        level: "attention",
        message:
          nameIntro +
          `Les orientations de l'ESMA prévoient alors les ${EXCLUSION_LABELS[req.exclusions]}. ` +
          (declared === "not_stated"
            ? "L'annexe, telle que lue par Seedow, ne mentionne pas ces exclusions."
            : `L'annexe mentionne seulement les ${EXCLUSION_LABELS[declared]}.`),
        sources: [src(fund, "benchmark_exclusions")],
      });
    }
  }
  if (req.meaningfulSustainableInvestment && fund.min_sustainable_pct === 0) {
    alerts.push({
      code: "NOM_DURABLE_SANS_ID",
      level: "attention",
      message:
        nameIntro +
        "Les orientations de l'ESMA attendent alors un engagement significatif en investissements durables ; " +
        "l'annexe prévoit une proportion minimale d'investissements durables de 0 %.",
      sources: [src(fund, "min_sustainable_pct")],
    });
  }
  if (fund.sfdr_article === 8 && fund.min_sustainable_pct === 0) {
    alerts.push({
      code: "ART8_ZERO_INVEST_DURABLE",
      level: "info",
      message:
        "Fonds article 8 sans engagement minimum d'investissements durables : il promeut des caractéristiques E/S sans s'engager sur une part d'investissements durables.",
      sources: [src(fund, "min_sustainable_pct")],
    });
  }
  const taxoZero = (["min_taxonomy_pct", "min_taxonomy_pct_excl_sovereign"] as const).filter(
    (f) => fund[f] === 0,
  );
  if (taxoZero.length > 0) {
    alerts.push({
      code: "TAXO_ZERO",
      level: "info",
      message:
        "L'annexe prévoit une proportion minimale d'investissements alignés sur la taxinomie de 0 %.",
      sources: taxoZero.map((f) => src(fund, f)),
    });
  }
  if (fund.considers_pai === false) {
    alerts.push({
      code: "PAI_NON",
      level: "attention",
      message:
        "L'annexe indique que le produit ne prend pas en considération les principales incidences négatives.",
      sources: [src(fund, "considers_pai")],
    });
  }
  if (fund.doc_date !== null && isOlderThanMonths(fund.doc_date, opts.asOf, DOC_MAX_AGE_MONTHS)) {
    alerts.push({
      code: "DOC_ANCIEN",
      level: "attention",
      message: `L'annexe utilisée est datée du ${fund.doc_date}, soit plus de ${DOC_MAX_AGE_MONTHS} mois avant le ${opts.asOf}. Une version plus récente peut exister.`,
      sources: [],
    });
  }
  if (fund.status !== "validated") {
    alerts.push({
      code: "NON_VALIDE",
      level: "attention",
      message:
        fund.status === "needs_review"
          ? "Données extraites en attente de revue humaine (citation non vérifiée, valeur ambiguë ou manquante)."
          : "Données extraites automatiquement, citations vérifiées, mais non encore revues par une personne.",
      sources: [],
    });
  }
  return alerts;
}

/** Ce qui empêche de conclure, quels que soient les axes. */
export type VerdictBlock = "no_data" | "needs_review" | null;

/**
 * Règle de verdict, partagée par l'évaluation par fonds et par portefeuille.
 * `block` : aucune donnée (fonds inconnu) ou données en attente de revue.
 */
export function decideVerdict(
  axes: readonly Pick<AxisResult, "status">[],
  block: VerdictBlock,
): { verdict: Verdict; reason: string } {
  if (axes.length === 0) {
    return { verdict: "NEUTRE", reason: "Aucune préférence de durabilité exprimée par le client." };
  }
  if (block === "no_data") {
    return { verdict: "A_VERIFIER", reason: "Aucune donnée disponible pour ce fonds." };
  }
  if (block === "needs_review") {
    return {
      verdict: "A_VERIFIER",
      reason: "Les données extraites de l'annexe sont en attente de revue humaine.",
    };
  }
  if (axes.some((a) => a.status === "DONNEE_MANQUANTE")) {
    return {
      verdict: "A_VERIFIER",
      reason: "Au moins une donnée nécessaire à la comparaison est absente de l'annexe.",
    };
  }
  const pass = axes.filter((a) => a.status === "PASS").length;
  const fail = axes.filter((a) => a.status === "FAIL").length;
  if (pass === axes.length) {
    return {
      verdict: "ADEQUAT",
      reason: "Chaque préférence exprimée est satisfaite par un engagement de l'annexe.",
    };
  }
  if (fail === axes.length) {
    return {
      verdict: "NON_ADEQUAT",
      reason: "Aucune des préférences exprimées n'est satisfaite par les engagements de l'annexe.",
    };
  }
  if (fail === 0) {
    return {
      verdict: "A_VERIFIER",
      reason: "Une catégorie d'incidences négatives demandée reste à confirmer.",
    };
  }
  return {
    verdict: "PARTIEL",
    reason:
      "Une partie seulement des préférences exprimées est satisfaite par les engagements de l'annexe.",
  };
}

function verdictOf(axes: readonly AxisResult[], fund: FundData | null) {
  return decideVerdict(
    axes,
    fund === null ? "no_data" : fund.status === "needs_review" ? "needs_review" : null,
  );
}

const verdictFields = (v: { verdict: Verdict; reason: string }) => ({
  verdict: v.verdict,
  verdict_reason: v.reason,
});

/**
 * Confronte les préférences d'un client aux engagements d'un fonds.
 * `fund = null` : aucune donnée pour cet ISIN (passer alors `opts.isin`).
 */
export function match(
  profile: ClientPreferences,
  fund: FundData | null,
  opts: MatchOptions & { isin?: string },
): MatchResult {
  const axes: AxisResult[] = [];
  if (fund === null) {
    const missing = (axis: AxisResult["axis"], requested: string): AxisResult => ({
      axis,
      status: "DONNEE_MANQUANTE",
      requested,
      fund_value: NOT_DISCLOSED,
      detail: "Aucune annexe précontractuelle SFDR ingérée pour ce fonds.",
      sources: [],
    });
    if (profile.taxonomy_min_pct !== null)
      axes.push(missing("a", `≥ ${formatPct(profile.taxonomy_min_pct)}`));
    if (profile.sfdr_min_pct !== null)
      axes.push(missing("b", `≥ ${formatPct(profile.sfdr_min_pct)}`));
    if (profile.pai_required) axes.push(missing("c", "prise en compte des PAI"));
    return {
      isin: opts.isin ?? "",
      fund_name: null,
      ...verdictFields(verdictOf(axes, null)),
      axes,
      alerts: [],
      engine_version: ENGINE_VERSION,
    };
  }
  if (profile.taxonomy_min_pct !== null) axes.push(axisTaxonomy(profile.taxonomy_min_pct, fund));
  if (profile.sfdr_min_pct !== null) axes.push(axisSfdr(profile.sfdr_min_pct, fund));
  if (profile.pai_required) axes.push(axisPai(profile.pai_categories, fund));
  return {
    isin: fund.isin,
    fund_name: fund.name,
    ...verdictFields(verdictOf(axes, fund)),
    axes,
    alerts: alertsFor(fund, opts),
    engine_version: ENGINE_VERSION,
  };
}
