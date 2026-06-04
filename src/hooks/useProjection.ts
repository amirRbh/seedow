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
  contributed: number;
  gain: number;
  series: ProjectionPoint[];
}

/**
 * Projection capital avec versements mensuels (intérêts composés).
 * @param initial capital de départ (€)
 * @param monthly versement mensuel (€)
 * @param years horizon en années
 * @param annualReturn rendement annualisé (ex: 0.06 pour 6%)
 */
export function useProjection(
  initial: number,
  monthly: number,
  years: number,
  annualReturn: number,
): ProjectionResult {
  return useMemo(() => {
    const months = Math.max(0, Math.round(years * 12));
    const r = annualReturn / 12;
    const series: ProjectionPoint[] = [];

    let valueWith = initial;
    let valueWithout = initial;
    let contributed = 0;

    series.push({
      monthIndex: 0,
      year: 0,
      withContrib: valueWith,
      withoutContrib: valueWithout,
      contributed: 0,
    });

    for (let m = 1; m <= months; m++) {
      valueWith = valueWith * (1 + r) + monthly;
      valueWithout = valueWithout * (1 + r);
      contributed += monthly;

      // 1 point par 3 mois pour limiter la taille du graph
      if (m % 3 === 0 || m === months) {
        series.push({
          monthIndex: m,
          year: m / 12,
          withContrib: valueWith,
          withoutContrib: valueWithout,
          contributed,
        });
      }
    }

    return {
      finalValue: valueWith,
      finalValueWithout: valueWithout,
      contributed: initial + contributed,
      gain: valueWith - initial - contributed,
      series,
    };
  }, [initial, monthly, years, annualReturn]);
}
