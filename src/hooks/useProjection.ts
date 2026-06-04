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
}

export interface ProjectionInput {
  initial: number;
  monthly: number;
  years: number;
  annualReturn: number; // ex 0.06 pour 6 %
}

/** Bornes acceptées pour les paramètres utilisateur. */
export const PROJECTION_BOUNDS = {
  initialMin: 0,
  initialMax: 10_000_000,
  monthlyMin: 0,
  monthlyMax: 10_000,
  yearsMin: 1,
  yearsMax: 40,
  annualReturnMin: -0.20,
  annualReturnMax: 0.30,
} as const;

const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;

/** Normalise et borne les paramètres ; renvoie aussi la liste des warnings. */
export function sanitizeProjectionInput(raw: ProjectionInput): {
  input: ProjectionInput;
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

  return { input: { initial, monthly, years, annualReturn }, warnings };
}

/**
 * Projection capital avec versements mensuels en début de mois.
 * Convention financière : taux mensuel équivalent à un rendement annualisé
 * `r_m = (1 + r_a)^(1/12) - 1` (capitalisation composée, pas r_a/12).
 * Gère correctement les rendements négatifs (scénario prudent baissier).
 */
export function useProjection(
  initial: number,
  monthly: number,
  years: number,
  annualReturn: number,
): ProjectionResult {
  return useMemo(() => {
    const { input } = sanitizeProjectionInput({ initial, monthly, years, annualReturn });
    const months = input.years * 12;
    // Taux mensuel équivalent (formule actuarielle standard)
    const r =
      input.annualReturn >= -0.999
        ? Math.pow(1 + input.annualReturn, 1 / 12) - 1
        : -0.999;

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
      // Versement en début de mois, puis capitalisation sur le mois
      valueWith = (valueWith + input.monthly) * (1 + r);
      valueWithout = valueWithout * (1 + r);
      contributions += input.monthly;

      // 1 point tous les 3 mois (ou final) — graph léger
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
    return {
      finalValue: valueWith,
      finalValueWithout: valueWithout,
      totalContributed,
      contributionsOnly: contributions,
      gain: valueWith - totalContributed,
      monthlyRate: r,
      series,
    };
  }, [initial, monthly, years, annualReturn]);
}
