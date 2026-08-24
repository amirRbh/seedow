/**
 * `analyzePortfolio` — le moteur explicable de Seedow.
 *
 * Il ne construit RIEN. Il prend une composition déjà faite par l'utilisateur et
 * répond aux questions que le produit doit savoir traiter : est-ce aligné sur mes
 * convictions, mes exclusions sont-elles tenues, quel risque, cohérent avec mon
 * horizon, suis-je trop concentré, combien ça coûte, et quelle confiance
 * accorder aux données qui servent à le dire.
 *
 * Trois principes tiennent tout le fichier :
 *
 *  1. **Il ne modifie jamais les poids.** Ni copie corrigée, ni renormalisation
 *     silencieuse. Un test le vérifie sur l'objet d'entrée lui-même.
 *  2. **Valeurs, finance et qualité des données ne se mélangent pas.**
 *     L'horizon ne déplace pas le score ESG ; une donnée manquante ne dégrade
 *     pas l'alignement, elle est signalée comme manquante.
 *  3. **Une donnée absente vaut `null`, jamais une valeur de repli.** Un score
 *     inventé serait pire que pas de score.
 *
 * Les explications sortent en CODES stables, pas en phrases : la traduction vit
 * en i18n, comme pour `plain-language` et `rationale`.
 */

import type { Asset, CauseTag, ExclusionTag, PortfolioMetrics } from "../types";
import { classifyDataQuality } from "../data-quality";
import { herfindahl } from "../consequences";
import { sumWeights, unallocatedShare } from "../weights";

// ── Entrées ──────────────────────────────────────────────────────────────

/** Une ligne composée : l'actif, et la part que l'utilisateur lui a donnée. */
export interface AnalyzedLine {
  asset: Asset;
  /** Part du montant déclaré (0..1), telle que saisie. */
  weight: number;
}

export interface AnalyzePortfolioInput {
  lines: AnalyzedLine[];
  /** Convictions déclarées au questionnaire. */
  causes: CauseTag[];
  /** Exclusions déclarées — des filtres durs, pas des pénalités. */
  exclusions: ExclusionTag[];
  /** Horizon en années. Absent → la cohérence financière reste `unknown`. */
  horizonYears?: number | null;
  /** Métriques déjà mesurées (`computeMetrics`). Absentes → risque/frais `unknown`. */
  metrics?: PortfolioMetrics | null;
}

// ── Sortie ───────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high" | "unknown";
export type HorizonFit = "good" | "acceptable" | "weak" | "unknown";
export type ConcentrationLevel = "low" | "moderate" | "high" | "unknown";
export type DataQualityLevel = "high" | "medium" | "low" | "unknown";
export type TradeoffSeverity = "info" | "warning" | "critical";

export interface Tradeoff {
  type: string;
  severity: TradeoffSeverity;
  /** Code i18n stable ; les variables d'interpolation vivent dans `vars`. */
  code: string;
  vars?: Record<string, number | string>;
}

export interface PortfolioAnalysis {
  alignment: {
    /** 0..100 sur la part allouée, ou null si aucune conviction déclarée. */
    overall: number | null;
    byConviction: Partial<Record<CauseTag, number | null>>;
    exclusionsRespected: boolean;
    /** Exclusions effectivement enfreintes — vide quand tout est tenu. */
    breaches: ExclusionTag[];
    explanation: string[];
  };
  risk: {
    level: RiskLevel;
    /** Volatilité annualisée du portefeuille (fraction), ou null. */
    volatility: number | null;
    explanation: string[];
  };
  horizon: {
    fit: HorizonFit;
    years: number | null;
    explanation: string[];
  };
  diversification: {
    /** 1 − HHI sur la part allouée (0..1), ou null si rien n'est alloué. */
    score: number | null;
    positionCount: number;
    concentration: ConcentrationLevel;
    /** Poids de la plus grosse ligne (0..1), ou null. */
    largestPosition: number | null;
    explanation: string[];
  };
  allocation: {
    /** Somme des poids saisis (0..1+). */
    allocatedShare: number;
    /** Ce qui n'est placé sur aucune ligne (0..1). */
    unallocatedShare: number;
    explanation: string[];
  };
  exposure: {
    byAssetClass: Record<string, number>;
    byRegion: Record<string, number>;
    topHoldings: Array<{ id: string; name: string; weight: number }>;
    /** Look-through entreprise — null tant que les holdings ne sont pas ingérés. */
    byCompany: null;
  };
  costs: {
    /** TER pondéré (fraction annuelle), ou null. */
    weightedTer: number | null;
    explanation: string[];
  };
  dataQuality: {
    overall: DataQualityLevel;
    /** Part du portefeuille (en poids alloué) dont les stats sont fiables. */
    coverage: number | null;
    /** Part dont le score ESG vient d'une source externe, jamais estimé maison. */
    esgSourcedShare: number | null;
    explanation: string[];
  };
  tradeoffs: Tradeoff[];
}

// ── Seuils ───────────────────────────────────────────────────────────────

/** Alignés sur `plain-language` pour que l'écran et l'analyse disent pareil. */
const VOLATILITY_LOW = 0.08;
const VOLATILITY_HIGH = 0.15;
/** Au-delà, une ligne domine le portefeuille (cf. `CONCENTRATION_ALERT`). */
const CONCENTRATION_HIGH = 0.4;
const CONCENTRATION_MODERATE = 0.25;
/** En deçà, l'horizon est trop court pour encaisser cette volatilité. */
const SHORT_HORIZON_YEARS = 3;
const LONG_HORIZON_YEARS = 8;
const TOP_HOLDINGS = 5;

// ── Moteur ───────────────────────────────────────────────────────────────

/**
 * Analyse une composition. Fonction pure : aucune écriture, aucun effet de bord,
 * et l'entrée n'est jamais mutée.
 */
export function analyzePortfolio(input: AnalyzePortfolioInput): PortfolioAnalysis {
  const lines = input.lines.filter((l) => Number.isFinite(l.weight) && l.weight > 0);
  const weights: Record<string, number> = {};
  for (const l of lines) weights[l.asset.id] = l.weight;

  const allocated = sumWeights(weights);
  const unallocated = unallocatedShare(weights);
  const hasLines = lines.length > 0 && allocated > 0;

  const alignment = analyzeAlignment(lines, input.causes, input.exclusions, allocated);
  const risk = analyzeRisk(input.metrics);
  const horizon = analyzeHorizon(input.horizonYears, input.metrics);
  const diversification = analyzeDiversification(lines, allocated);
  const dataQuality = analyzeDataQuality(lines, allocated);

  return {
    alignment,
    risk,
    horizon,
    diversification,
    allocation: {
      allocatedShare: allocated,
      unallocatedShare: unallocated,
      explanation: unallocated > 0 ? ["allocation.partial"] : hasLines ? ["allocation.full"] : [],
    },
    exposure: analyzeExposure(lines),
    costs: analyzeCosts(lines, allocated),
    dataQuality,
    tradeoffs: buildTradeoffs({ alignment, diversification, horizon, dataQuality, unallocated }),
  };
}

/**
 * « Quels compromis ai-je créés ? » — constats dérivés de l'analyse, jamais des
 * injonctions. Seedow nomme la conséquence ; la décision reste à l'utilisateur.
 */
function buildTradeoffs(a: {
  alignment: PortfolioAnalysis["alignment"];
  diversification: PortfolioAnalysis["diversification"];
  horizon: PortfolioAnalysis["horizon"];
  dataQuality: PortfolioAnalysis["dataQuality"];
  unallocated: number;
}): Tradeoff[] {
  const out: Tradeoff[] = [];

  // Une exclusion enfreinte est le seul cas critique : c'est une promesse rompue.
  if (!a.alignment.exclusionsRespected) {
    out.push({
      type: "exclusion_breached",
      severity: "critical",
      code: "tradeoff.exclusion_breached",
      vars: { count: a.alignment.breaches.length },
    });
  }

  if (a.diversification.concentration === "high" && a.diversification.largestPosition != null) {
    out.push({
      type: "concentration",
      severity: "warning",
      code: "tradeoff.concentration",
      vars: { pct: Math.round(a.diversification.largestPosition * 100) },
    });
  }

  if (a.horizon.fit === "weak") {
    out.push({ type: "horizon_mismatch", severity: "warning", code: "tradeoff.horizon_weak" });
  }

  if (a.dataQuality.overall === "low") {
    out.push({ type: "data_gap", severity: "warning", code: "tradeoff.data_low" });
  }

  // Part non attribuée : une information, pas un reproche — d'où `info`.
  if (a.unallocated > 0) {
    out.push({
      type: "unallocated",
      severity: "info",
      code: "tradeoff.unallocated",
      vars: { pct: Math.round(a.unallocated * 100) },
    });
  }

  return out;
}

// ── A. Compatibilité avec les valeurs ────────────────────────────────────

function analyzeAlignment(
  lines: AnalyzedLine[],
  causes: CauseTag[],
  exclusions: ExclusionTag[],
  allocated: number,
): PortfolioAnalysis["alignment"] {
  const explanation: string[] = [];

  // Exclusions : filtre DUR. Un actif touché est une infraction, pas une nuance.
  const excluded = new Set<ExclusionTag>(exclusions);
  const breaches = new Set<ExclusionTag>();
  for (const l of lines) {
    for (const sector of l.asset.excluded_sectors ?? []) {
      if (excluded.has(sector)) breaches.add(sector);
    }
  }
  const exclusionsRespected = breaches.size === 0;
  if (exclusions.length === 0) explanation.push("alignment.no_exclusions");
  else if (exclusionsRespected) explanation.push("alignment.exclusions_ok");
  else explanation.push("alignment.exclusions_breached");

  // Convictions : moyenne pondérée de l'exposition réelle, sur la part allouée.
  // Un actif sans donnée d'exposition ne compte pas comme un zéro — il est retiré
  // du calcul, sinon l'absence de donnée se lirait comme un désalignement.
  const byConviction: Partial<Record<CauseTag, number | null>> = {};
  for (const cause of causes) {
    let numerator = 0;
    let covered = 0;
    for (const l of lines) {
      const exposure = l.asset.cause_exposure?.[cause];
      if (typeof exposure === "number" && Number.isFinite(exposure)) {
        numerator += l.weight * exposure;
        covered += l.weight;
      }
    }
    byConviction[cause] = covered > 0 ? Math.round((numerator / covered) * 100) : null;
  }

  const scored = causes.map((c) => byConviction[c]).filter((v): v is number => v != null);
  const overall =
    scored.length > 0 ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;

  if (causes.length === 0) explanation.push("alignment.no_causes");
  else if (overall == null) explanation.push("alignment.no_exposure_data");
  else if (allocated > 0) explanation.push("alignment.measured");

  return { overall, byConviction, exclusionsRespected, breaches: [...breaches], explanation };
}

// ── B. Compatibilité financière — jamais mêlée à l'ESG ───────────────────

function analyzeRisk(metrics?: PortfolioMetrics | null): PortfolioAnalysis["risk"] {
  const volatility = metrics?.volatility ?? null;
  if (volatility == null || !Number.isFinite(volatility) || volatility <= 0) {
    return { level: "unknown", volatility: null, explanation: ["risk.unknown"] };
  }
  const level: RiskLevel =
    volatility < VOLATILITY_LOW ? "low" : volatility < VOLATILITY_HIGH ? "moderate" : "high";
  return { level, volatility, explanation: [`risk.${level}`] };
}

function analyzeHorizon(
  years: number | null | undefined,
  metrics?: PortfolioMetrics | null,
): PortfolioAnalysis["horizon"] {
  const volatility = metrics?.volatility ?? null;
  if (years == null || !Number.isFinite(years) || volatility == null || volatility <= 0) {
    return { fit: "unknown", years: years ?? null, explanation: ["horizon.unknown"] };
  }
  // Un portefeuille volatil demande du temps ; un horizon long tolère la secousse.
  // Le jugement porte sur la finance seule — il ne touche pas au score ESG.
  let fit: HorizonFit;
  if (years < SHORT_HORIZON_YEARS) {
    fit = volatility < VOLATILITY_LOW ? "good" : volatility < VOLATILITY_HIGH ? "weak" : "weak";
  } else if (years < LONG_HORIZON_YEARS) {
    fit = volatility < VOLATILITY_HIGH ? "good" : "acceptable";
  } else {
    fit = "good";
  }
  return { fit, years, explanation: [`horizon.${fit}`] };
}

// ── Diversification & concentration ──────────────────────────────────────

function analyzeDiversification(
  lines: AnalyzedLine[],
  allocated: number,
): PortfolioAnalysis["diversification"] {
  if (lines.length === 0 || allocated <= 0) {
    return {
      score: null,
      positionCount: 0,
      concentration: "unknown",
      largestPosition: null,
      explanation: ["diversification.empty"],
    };
  }
  // Lecture sur la part ALLOUÉE : laisser de l'argent de côté ne diversifie pas.
  const shares = lines.map((l) => l.weight / allocated);
  const score = 1 - herfindahl(shares);
  const largestPosition = shares.reduce((m, w) => Math.max(m, w), 0);
  const concentration: ConcentrationLevel =
    largestPosition >= CONCENTRATION_HIGH
      ? "high"
      : largestPosition >= CONCENTRATION_MODERATE
        ? "moderate"
        : "low";
  return {
    score,
    positionCount: lines.length,
    concentration,
    largestPosition,
    explanation: [`diversification.${concentration}`],
  };
}

// ── Expositions réelles ──────────────────────────────────────────────────

function analyzeExposure(lines: AnalyzedLine[]): PortfolioAnalysis["exposure"] {
  const byAssetClass: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const l of lines) {
    byAssetClass[l.asset.asset_class] = (byAssetClass[l.asset.asset_class] ?? 0) + l.weight;
    const region = l.asset.region ?? "world";
    byRegion[region] = (byRegion[region] ?? 0) + l.weight;
  }
  const topHoldings = [...lines]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_HOLDINGS)
    .map((l) => ({ id: l.asset.id, name: l.asset.name, weight: l.weight }));

  // `byCompany` reste null tant que `fund_holdings` n'est pas peuplée : annoncer
  // un look-through sans holdings fiables serait exactement la promesse creuse
  // que Seedow s'interdit.
  return { byAssetClass, byRegion, topHoldings, byCompany: null };
}

// ── Coûts ────────────────────────────────────────────────────────────────

function analyzeCosts(lines: AnalyzedLine[], allocated: number): PortfolioAnalysis["costs"] {
  if (lines.length === 0 || allocated <= 0) {
    return { weightedTer: null, explanation: ["costs.unknown"] };
  }
  // Frais rapportés au montant total : la part non attribuée ne coûte rien.
  const weightedTer = lines.reduce((s, l) => s + l.weight * l.asset.ter, 0);
  return { weightedTer, explanation: ["costs.measured"] };
}

// ── C. Qualité des données — distincte de la qualité de l'actif ──────────

function analyzeDataQuality(
  lines: AnalyzedLine[],
  allocated: number,
): PortfolioAnalysis["dataQuality"] {
  if (lines.length === 0 || allocated <= 0) {
    return {
      overall: "unknown",
      coverage: null,
      esgSourcedShare: null,
      explanation: ["data.unknown"],
    };
  }

  // Couverture : part du poids alloué dont les stats de marché sont estimées sur
  // un historique réel suffisant (`full`), et non extrapolées.
  let fullWeight = 0;
  let partialWeight = 0;
  let esgSourcedWeight = 0;
  for (const l of lines) {
    const tier = classifyDataQuality(l.asset);
    if (tier === "full") fullWeight += l.weight;
    else if (tier === "partial") partialWeight += l.weight;
    if (l.asset.esg_score_source && !l.asset.esg_score_source.startsWith("seedow-internal")) {
      esgSourcedWeight += l.weight;
    }
  }
  const coverage = fullWeight / allocated;
  const partialShare = partialWeight / allocated;

  const overall: DataQualityLevel =
    coverage >= 0.7 ? "high" : coverage + partialShare >= 0.5 ? "medium" : "low";

  return {
    overall,
    coverage,
    esgSourcedShare: esgSourcedWeight / allocated,
    explanation: [`data.${overall}`],
  };
}
