import { useMemo } from "react";

export interface ProjectionPoint {
  monthIndex: number;
  year: number;
  withContrib: number;
  withoutContrib: number;
  contributed: number;
}

export interface ProjectionResult {
  finalValue: number;
  finalValueWithout: number;
  totalContributed: number; // initial + versements
  contributionsOnly: number; // versements uniquement
  gain: number; // plus-value (intérêts composés)
  monthlyRate: number; // taux mensuel équivalent
  series: ProjectionPoint[];
  /** Valeur finale ajustée de l'inflation (pouvoir d'achat d'aujourd'hui). */
  finalValueReal: number;
}

export type Envelope = "pea" | "av" | "cto";

export interface StressEvent {
  /** Krach ponctuel : choc multiplicatif appliqué au mois donné. ex -0.30 = -30 %. */
  shockYear?: number;
  shockPct?: number; // ex -0.30
  /** Pause des versements : intervalle [startYear, endYear[ pendant lequel `monthly` = 0. */
  pauseStartYear?: number;
  pauseEndYear?: number;
  /** Inflation choc : remplace l'inflation utilisée pour le pouvoir d'achat. */
  inflationOverride?: number;
}

export interface ProjectionInput {
  initial: number;
  monthly: number;
  years: number;
  annualReturn: number; // ex 0.06 pour 6 %
  inflation?: number; // ex 0.02
  stress?: StressEvent;
}

/** Bornes acceptées pour les paramètres utilisateur. */
export const PROJECTION_BOUNDS = {
  initialMin: 0,
  initialMax: 10_000_000,
  monthlyMin: 0,
  monthlyMax: 10_000,
  yearsMin: 1,
  yearsMax: 40,
  annualReturnMin: -0.2,
  annualReturnMax: 0.3,
  inflationMin: -0.05,
  inflationMax: 0.15,
} as const;

const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;

/** Normalise et borne les paramètres ; renvoie aussi la liste des warnings. */
export function sanitizeProjectionInput(raw: ProjectionInput): {
  input: Required<
    Pick<ProjectionInput, "initial" | "monthly" | "years" | "annualReturn" | "inflation">
  > & {
    stress?: StressEvent;
  };
  warnings: string[];
} {
  const warnings: string[] = [];
  const b = PROJECTION_BOUNDS;

  const initial = clamp(raw.initial, b.initialMin, b.initialMax);
  if (initial !== raw.initial) warnings.push("Capital initial ajusté.");

  const monthly = clamp(raw.monthly, b.monthlyMin, b.monthlyMax);
  if (monthly !== raw.monthly) warnings.push("Versement mensuel ajusté.");

  const years = clamp(Math.round(raw.years), b.yearsMin, b.yearsMax);
  if (years !== raw.years) warnings.push("Horizon ajusté.");

  const annualReturn = clamp(raw.annualReturn, b.annualReturnMin, b.annualReturnMax);
  if (annualReturn !== raw.annualReturn) warnings.push("Rendement annualisé borné.");

  const inflation = clamp(raw.inflation ?? 0.02, b.inflationMin, b.inflationMax);

  return {
    input: { initial, monthly, years, annualReturn, inflation, stress: raw.stress },
    warnings,
  };
}

/**
 * Projection capital avec versements mensuels en début de mois.
 * Capitalisation composée — taux mensuel équivalent r_m = (1+r_a)^(1/12) - 1.
 * Support des événements de stress : krach ponctuel, pause des versements.
 * Calcule également la valeur réelle (pouvoir d'achat) ajustée de l'inflation.
 */
export function computeProjection(raw: ProjectionInput): ProjectionResult {
  const { input } = sanitizeProjectionInput(raw);
  const months = input.years * 12;
  const r = input.annualReturn >= -0.999 ? Math.pow(1 + input.annualReturn, 1 / 12) - 1 : -0.999;
  const stress = input.stress ?? {};
  const shockMonth = stress.shockYear && stress.shockPct ? Math.round(stress.shockYear * 12) : null;
  const pauseStartM = stress.pauseStartYear ? stress.pauseStartYear * 12 : null;
  const pauseEndM = stress.pauseEndYear ? stress.pauseEndYear * 12 : null;
  const inflationUsed = stress.inflationOverride ?? input.inflation;

  const series: ProjectionPoint[] = [];
  let valueWith = input.initial;
  let valueWithout = input.initial;
  let contributions = 0;

  series.push({
    monthIndex: 0,
    year: 0,
    withContrib: valueWith,
    withoutContrib: valueWithout,
    contributed: 0,
  });

  for (let m = 1; m <= months; m++) {
    const paused = pauseStartM !== null && pauseEndM !== null && m > pauseStartM && m <= pauseEndM;
    const monthlyAmt = paused ? 0 : input.monthly;

    // Versement en début de mois, puis capitalisation sur le mois
    valueWith = (valueWith + monthlyAmt) * (1 + r);
    valueWithout = valueWithout * (1 + r);
    contributions += monthlyAmt;

    // Choc ponctuel appliqué en fin de mois
    if (shockMonth !== null && m === shockMonth) {
      valueWith *= 1 + (stress.shockPct ?? 0);
      valueWithout *= 1 + (stress.shockPct ?? 0);
    }

    if (m % 3 === 0 || m === months) {
      series.push({
        monthIndex: m,
        year: m / 12,
        withContrib: valueWith,
        withoutContrib: valueWithout,
        contributed: contributions,
      });
    }
  }

  const totalContributed = input.initial + contributions;
  const inflationFactor = Math.pow(1 + inflationUsed, input.years);
  return {
    finalValue: valueWith,
    finalValueWithout: valueWithout,
    totalContributed,
    contributionsOnly: contributions,
    gain: valueWith - totalContributed,
    monthlyRate: r,
    finalValueReal: valueWith / inflationFactor,
    series,
  };
}

/** Hook mémoïsé — back-compat (signature 4 args) + variante objet avec inflation/stress. */
export function useProjection(
  initialOrInput: number | ProjectionInput,
  monthly?: number,
  years?: number,
  annualReturn?: number,
): ProjectionResult {
  return useMemo(() => {
    const input: ProjectionInput =
      typeof initialOrInput === "number"
        ? {
            initial: initialOrInput,
            monthly: monthly ?? 0,
            years: years ?? 1,
            annualReturn: annualReturn ?? 0,
          }
        : initialOrInput;
    return computeProjection(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    typeof initialOrInput === "number" ? initialOrInput : JSON.stringify(initialOrInput),
    monthly,
    years,
    annualReturn,
  ]);
}

// ────────────────────────────────────────────────────────────────────────────────
// Fiscalité par enveloppe (France, simplifié — paramètres 2024)
// ────────────────────────────────────────────────────────────────────────────────

const SOCIAL_TAX = 0.172; // Prélèvements sociaux PEA / AV (volet PS)
const PFU = 0.3; // Flat tax CTO
const AV_IR_BEFORE_8Y = 0.128; // IR forfaitaire AV < 8 ans (PFU 12.8 % + 17.2 % PS = 30 %)
const AV_IR_AFTER_8Y = 0.075; // IR forfaitaire AV > 8 ans après abattement
const AV_ABATEMENT_SINGLE = 4_600;

export interface TaxBreakdown {
  envelope: Envelope;
  gross: number; // plus-value brute
  tax: number; // impôt + PS prélevés
  net: number; // plus-value nette
  netFinalValue: number; // capital final net après fiscalité sur la PV
  rate: number; // taux effectif d'imposition de la PV
  note: string;
}

/**
 * Calcule l'impôt sur la plus-value selon l'enveloppe et la durée de détention.
 * Hypothèses : retrait total en fin de période, contribuable célibataire,
 * pas de moins-values reportables. Indicatif — pas un conseil fiscal.
 */
export function computeTax(
  gross: number,
  finalValue: number,
  years: number,
  envelope: Envelope,
): TaxBreakdown {
  const gain = Math.max(0, gross);
  let tax = 0;
  let note = "";

  if (envelope === "pea") {
    if (years >= 5) {
      tax = gain * SOCIAL_TAX;
      note = "PEA après 5 ans : prélèvements sociaux uniquement (17,2 %).";
    } else {
      // PFU + PS, pénalité de clôture anticipée simplifiée à 30 %
      tax = gain * PFU;
      note = "PEA avant 5 ans : flat tax 30 % (clôture anticipée).";
    }
  } else if (envelope === "av") {
    if (years >= 8) {
      const taxable = Math.max(0, gain - AV_ABATEMENT_SINGLE);
      tax = taxable * AV_IR_AFTER_8Y + gain * SOCIAL_TAX;
      note = `AV > 8 ans : 7,5 % après abattement ${AV_ABATEMENT_SINGLE.toLocaleString("fr-FR")} € + 17,2 % PS.`;
    } else {
      tax = gain * (AV_IR_BEFORE_8Y + SOCIAL_TAX);
      note = "AV < 8 ans : flat tax 30 % (12,8 % IR + 17,2 % PS).";
    }
  } else {
    tax = gain * PFU;
    note = "CTO : flat tax 30 % (12,8 % IR + 17,2 % PS).";
  }

  return {
    envelope,
    gross,
    tax,
    net: gain - tax,
    netFinalValue: finalValue - tax,
    rate: gain > 0 ? tax / gain : 0,
    note,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Objectif inversé — résolution dichotomique du versement mensuel requis
// ────────────────────────────────────────────────────────────────────────────────

export interface GoalSeekInput {
  targetCapital: number;
  initial: number;
  years: number;
  annualReturn: number;
  inflation?: number;
  /** Si vrai, la cible est exprimée en € d'aujourd'hui (ajustés inflation). */
  targetIsReal?: boolean;
}

export interface GoalSeekResult {
  monthlyRequired: number;
  feasible: boolean;
  finalValue: number;
  /** Cible en € nominaux (après ajustement inflation si targetIsReal). */
  nominalTarget: number;
}

/** Résolution par bissection. O(log) en quelques dizaines d'itérations. */
export function solveMonthlyForGoal(input: GoalSeekInput): GoalSeekResult {
  const inflation = input.inflation ?? 0.02;
  const nominalTarget = input.targetIsReal
    ? input.targetCapital * Math.pow(1 + inflation, input.years)
    : input.targetCapital;

  const project = (monthly: number) =>
    computeProjection({
      initial: input.initial,
      monthly,
      years: input.years,
      annualReturn: input.annualReturn,
      inflation,
    }).finalValue;

  // Cible déjà atteinte sans versement ?
  if (project(0) >= nominalTarget) {
    return {
      monthlyRequired: 0,
      feasible: true,
      finalValue: project(0),
      nominalTarget,
    };
  }

  let lo = 0;
  let hi: number = PROJECTION_BOUNDS.monthlyMax;
  // Pas atteignable même au plafond ?
  if (project(hi) < nominalTarget) {
    return {
      monthlyRequired: hi,
      feasible: false,
      finalValue: project(hi),
      nominalTarget,
    };
  }

  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (project(mid) >= nominalTarget) hi = mid;
    else lo = mid;
    if (hi - lo < 0.5) break;
  }
  const monthlyRequired = Math.ceil(hi);
  return {
    monthlyRequired,
    feasible: true,
    finalValue: project(monthlyRequired),
    nominalTarget,
  };
}
