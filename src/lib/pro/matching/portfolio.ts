/**
 * Évaluation au niveau du PORTEFEUILLE (approche admise par les orientations
 * ESMA35-43-3172 §29, 81, 84 et 88 ; rappelée par la synthèse SPOT de l'AMF de
 * février 2026, §3.4.1) : la moyenne pondérée des engagements des lignes doit
 * être au moins égale au minimum demandé par le client. Module pur.
 *
 * - (a) et (b) : moyenne pondérée par les montants. Une ligne art. 6 compte
 *   pour 0 % (aucun engagement) ; une ligne sans donnée rend l'axe
 *   DONNEE_MANQUANTE (on ne complète jamais une moyenne par hypothèse).
 *   Pour (a), chaque ligne contribue par sa valeur la plus basse entre
 *   « avec » et « hors » souverains.
 * - (c) : approche cumulative (bonne pratique AMF) : CHAQUE ligne doit prendre
 *   en compte les PAI et chaque catégorie demandée.
 * - Verdict : mêmes règles que par fonds ; une ligne en attente de revue rend
 *   le portefeuille « à vérifier ».
 */
import { PAI_CATEGORIES } from "../extraction/schema";
import { ENGINE_VERSION, PAI_CATEGORY_LABELS, decideVerdict, formatPct, match } from "./engine";
import type {
  AxisResult,
  ClientPreferences,
  FundData,
  MatchOptions,
  MatchResult,
  Verdict,
} from "./types";

export interface PortfolioLineInput {
  isin: string;
  /** Montant investi sur la ligne (en euros, > 0). */
  amount: number;
  fund: FundData | null;
}

export interface PortfolioLineResult {
  isin: string;
  amount: number;
  /** Part de la ligne dans l'allocation, en %. */
  weight_pct: number;
  /** Évaluation de la ligne prise isolément (pour information). */
  result: MatchResult;
}

export interface PortfolioResult {
  verdict: Verdict;
  verdict_reason: string;
  axes: AxisResult[];
  lines: PortfolioLineResult[];
  total_amount: number;
  engine_version: string;
}

function weightedAxis(
  axis: "a" | "b",
  min: number,
  lines: readonly { isin: string; w: number; fund: FundData | null }[],
  value: (f: FundData) => number | null,
  label: string,
): AxisResult {
  const requested = `≥ ${formatPct(min)} (moyenne pondérée du portefeuille)`;
  const missing: string[] = [];
  let sum = 0;
  for (const l of lines) {
    if (l.fund === null) {
      missing.push(l.isin);
      continue;
    }
    const v = l.fund.sfdr_article === 6 ? 0 : value(l.fund);
    if (v === null) missing.push(l.isin);
    else sum += l.w * v;
  }
  if (missing.length > 0) {
    return {
      axis,
      status: "DONNEE_MANQUANTE",
      requested,
      fund_value: "non calculable",
      detail: `${label} : moyenne non calculable, donnée absente pour ${missing.join(", ")}.`,
      sources: [],
    };
  }
  const pass = sum >= min;
  return {
    axis,
    status: pass ? "PASS" : "FAIL",
    requested,
    fund_value: formatPct(sum),
    detail:
      `${label} : moyenne pondérée par les montants de ${formatPct(sum)}, ` +
      `${pass ? "supérieure ou égale" : "inférieure"} au minimum demandé de ${formatPct(min)}. ` +
      "Les lignes relevant de l'article 6 comptent pour 0 %.",
    sources: [],
  };
}

function paiAxis(
  categories: ClientPreferences["pai_categories"],
  lines: readonly { isin: string; fund: FundData | null }[],
): AxisResult {
  const labels = (cs: readonly string[]) =>
    cs.map((c) => PAI_CATEGORY_LABELS[c as keyof typeof PAI_CATEGORY_LABELS]).join(", ");
  const requested = categories.length
    ? `prise en compte des PAI sur chaque ligne : ${labels(categories)}`
    : "prise en compte des PAI sur chaque ligne";
  const missing = lines
    .filter((l) => l.fund === null || l.fund.considers_pai === null)
    .map((l) => l.isin);
  const refusing = lines.filter((l) => l.fund?.considers_pai === false).map((l) => l.isin);
  if (refusing.length > 0) {
    return {
      axis: "c",
      status: "FAIL",
      requested,
      fund_value: `non pour ${refusing.length} ligne(s)`,
      detail: `Lignes dont l'annexe indique ne pas prendre en considération les principales incidences négatives : ${refusing.join(", ")}.`,
      sources: [],
    };
  }
  if (missing.length > 0) {
    return {
      axis: "c",
      status: "DONNEE_MANQUANTE",
      requested,
      fund_value: "non renseigné",
      detail: `Réponse à la question PAI absente pour ${missing.join(", ")}.`,
      sources: [],
    };
  }
  const unconfirmed = lines.filter((l) =>
    PAI_CATEGORIES.some((c) => categories.includes(c) && !l.fund!.pai_categories.includes(c)),
  );
  if (unconfirmed.length > 0) {
    return {
      axis: "c",
      status: "A_CONFIRMER",
      requested,
      fund_value: "oui, catégories non toutes identifiées",
      detail: `Toutes les lignes prennent en compte les PAI, mais les catégories demandées ne sont pas identifiables dans l'annexe de : ${unconfirmed.map((l) => l.isin).join(", ")}.`,
      sources: [],
    };
  }
  return {
    axis: "c",
    status: "PASS",
    requested,
    fund_value: "oui sur chaque ligne",
    detail: categories.length
      ? `Chaque ligne prend en compte les principales incidences négatives, catégories demandées identifiées : ${labels(categories)}.`
      : "Chaque ligne prend en compte les principales incidences négatives.",
    sources: [],
  };
}

export function matchPortfolio(
  prefs: ClientPreferences,
  input: readonly PortfolioLineInput[],
  opts: MatchOptions,
): PortfolioResult {
  if (input.length === 0) throw new Error("portefeuille vide");
  if (input.some((l) => !(l.amount > 0) || !Number.isFinite(l.amount))) {
    throw new Error("chaque ligne doit avoir un montant strictement positif");
  }
  const total = input.reduce((s, l) => s + l.amount, 0);
  const weighted = input.map((l) => ({ isin: l.isin, fund: l.fund, w: l.amount / total }));

  const axes: AxisResult[] = [];
  if (prefs.taxonomy_min_pct !== null) {
    axes.push(
      weightedAxis(
        "a",
        prefs.taxonomy_min_pct,
        weighted,
        (f) => {
          const vs = [f.min_taxonomy_pct, f.min_taxonomy_pct_excl_sovereign].filter(
            (v): v is number => v !== null,
          );
          return vs.length ? Math.min(...vs) : null;
        },
        "Alignement minimum sur la taxinomie",
      ),
    );
  }
  if (prefs.sfdr_min_pct !== null) {
    axes.push(
      weightedAxis(
        "b",
        prefs.sfdr_min_pct,
        weighted,
        (f) => f.min_sustainable_pct,
        "Proportion minimale d'investissements durables",
      ),
    );
  }
  if (prefs.pai_required) axes.push(paiAxis(prefs.pai_categories, weighted));

  const block = weighted.some((l) => l.fund?.status === "needs_review") ? "needs_review" : null;
  const decided = decideVerdict(axes, block);
  return {
    verdict: decided.verdict,
    verdict_reason:
      block === "needs_review"
        ? "Les données d'au moins une ligne sont en attente de revue humaine."
        : decided.reason.replace("de l'annexe", "des annexes"),
    axes,
    lines: input.map((l) => ({
      isin: l.isin,
      amount: l.amount,
      weight_pct: (100 * l.amount) / total,
      result: match(prefs, l.fund, { ...opts, isin: l.isin }),
    })),
    total_amount: total,
    engine_version: ENGINE_VERSION,
  };
}
