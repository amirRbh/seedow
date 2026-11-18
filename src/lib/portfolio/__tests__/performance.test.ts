import { describe, expect, it } from "vitest";
import snapshots from "@/content/demo/fund-snapshots.json";
import {
  annualizedMonthlyVolatility,
  blendSeries,
  annualizedReturn,
  annualizedVolatility,
  cumulativeReturn,
  maxDrawdown,
  performanceReport,
  rebaseForChart,
  sampleStdDev,
  seriesFrequency,
  sharpeRatio,
  shiftYears,
  trackingError,
  trailingWindow,
  type SeriesPoint,
} from "../performance";

const s = (pairs: [string, number][]): SeriesPoint[] =>
  pairs.map(([date, value]) => ({ date, value }));

describe("rendements — cas calculés à la main", () => {
  it("cumulé : 100 → 121 = +21 %", () => {
    expect(
      cumulativeReturn(
        s([
          ["2020-01-01", 100],
          ["2022-01-01", 121],
        ]),
      ),
    ).toBeCloseTo(0.21, 10);
  });

  it("CAGR : 100 → 121 sur deux années calendaires ≈ +10 %/an", () => {
    // 731 jours (2020 est bissextile) : 1,21^(365,25/731) − 1.
    const expected = 1.21 ** (365.25 / 731) - 1;
    expect(
      annualizedReturn(
        s([
          ["2020-01-01", 100],
          ["2022-01-01", 121],
        ]),
      ),
    ).toBeCloseTo(expected, 12);
    expect(expected).toBeCloseTo(0.0999, 3);
  });

  it("moins de deux points : non calculable", () => {
    expect(cumulativeReturn(s([["2020-01-01", 100]]))).toBeNull();
    expect(annualizedReturn([])).toBeNull();
  });
});

describe("volatilité", () => {
  it("écart-type échantillon (n − 1)", () => {
    // [1,2,3,4] : moyenne 2,5 ; somme des carrés 5 ; variance 5/3.
    expect(sampleStdDev([1, 2, 3, 4])).toBeCloseTo(Math.sqrt(5 / 3), 12);
  });

  it("série à rendement constant : volatilité nulle", () => {
    const pts: SeriesPoint[] = Array.from({ length: 40 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`.replace(/-(\d{2})$/, (m) => m),
      value: 100 * 1.001 ** i,
    })).map((p, i) => ({
      ...p,
      date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
    }));
    expect(annualizedVolatility(pts)).toBeCloseTo(0, 10);
  });

  it("alternance ±1 % : σ quotidien connu, annualisé × √252", () => {
    const pts: SeriesPoint[] = [{ date: "2024-01-01", value: 100 }];
    for (let i = 1; i <= 40; i++) {
      const prev = pts[i - 1].value;
      pts.push({
        date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
        value: prev * (i % 2 ? 1.01 : 0.99),
      });
    }
    const daily = sampleStdDev(Array.from({ length: 40 }, (_, i) => ((i + 1) % 2 ? 0.01 : -0.01)))!;
    expect(annualizedVolatility(pts)).toBeCloseTo(daily * Math.sqrt(252), 12);
  });

  it("moins de 20 rendements : non calculable plutôt qu'une estimation bruitée", () => {
    expect(
      annualizedVolatility(
        s([
          ["2024-01-01", 100],
          ["2024-01-02", 101],
        ]),
      ),
    ).toBeNull();
  });
});

describe("perte maximale", () => {
  it("100 → 120 → 90 → 130 : −25 % du plus-haut 120, retrouvé ensuite", () => {
    const dd = maxDrawdown(
      s([
        ["2024-01-01", 100],
        ["2024-01-02", 120],
        ["2024-01-03", 90],
        ["2024-01-04", 130],
      ]),
    )!;
    expect(dd.depth).toBeCloseTo(-0.25, 12);
    expect(dd.peakDate).toBe("2024-01-02");
    expect(dd.troughDate).toBe("2024-01-03");
    expect(dd.recoveryDate).toBe("2024-01-04");
  });

  it("série toujours croissante : 0, pas de creux", () => {
    expect(
      maxDrawdown(
        s([
          ["2024-01-01", 1],
          ["2024-01-02", 2],
        ]),
      )!.depth,
    ).toBe(0);
  });
});

describe("fenêtres glissantes", () => {
  it("décale les années, 29 février compris", () => {
    expect(shiftYears("2024-02-29", 1)).toBe("2023-02-28");
    expect(shiftYears("2026-11-17", 5)).toBe("2021-11-17");
  });

  it("série trop courte pour la fenêtre : null, jamais raccourcie en silence", () => {
    const pts = s([
      ["2025-06-01", 100],
      ["2026-06-01", 110],
    ]);
    expect(trailingWindow(pts, 3)).toBeNull();
    const report = performanceReport(pts, { windows: [3] });
    expect(report.windows[0].available).toBe(false);
    expect(report.windows[0].annualizedReturn).toBeNull();
  });
});

describe("Sharpe", () => {
  it("non calculé sans taux sans risque fourni", () => {
    expect(sharpeRatio(0.08, 0.15, null)).toBeNull();
    expect(sharpeRatio(0.08, 0.15, undefined)).toBeNull();
  });

  it("(8 % − 2 %) / 15 % = 0,4", () => {
    expect(sharpeRatio(0.08, 0.15, 0.02)).toBeCloseTo(0.4, 12);
  });
});

describe("rebase pour graphique", () => {
  it("commence à 100 et finit sur la vraie dernière valeur", () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({
      date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
      value: 50 + i,
    }));
    const out = rebaseForChart(pts, 100);
    expect(out[0].value).toBe(100);
    expect(out.at(-1)!.date).toBe(pts.at(-1)!.date);
    expect(out.at(-1)!.value).toBeCloseTo((1049 / 50) * 100, 10);
    expect(out.length).toBeLessThanOrEqual(101);
  });
});

/**
 * Contrôle INDÉPENDANT : les rendements annualisés recalculés par Seedow à
 * partir de la série « croissance de 10 000 » publiée doivent retrouver ceux
 * que l'émetteur publie lui-même dans le même document, à la même date.
 * L'émetteur calcule sur sa propre VL de clôture de mois : on tolère 0,15 pt.
 */
describe("validation croisée avec les rendements publiés par l'émetteur", () => {
  for (const fund of snapshots.funds) {
    const series = fund.history.dates.map((date, i) => ({ date, value: fund.history.fund[i] }));
    const asOf = fund.publishedReturns.asOf;
    if (!asOf) continue;
    for (const key of ["1y", "3y", "5y"] as const) {
      const published = (fund.publishedReturns.fund as Record<string, number | undefined>)[key];
      if (published === undefined) continue;
      it(`${fund.name} — ${key} au ${asOf} : ${published} % publié`, () => {
        const years = Number(key.replace("y", ""));
        const window = trailingWindow(series, years, asOf);
        expect(window).not.toBeNull();
        const ann = annualizedReturn(window!)!;
        expect(Math.abs(ann * 100 - published)).toBeLessThan(0.15);
      });
    }
  }
});

/** Même contrôle pour la volatilité : l'émetteur publie l'écart-type 3 ans (mensuel × √12). */
describe("validation croisée de la volatilité 3 ans publiée par l'émetteur", () => {
  for (const fund of snapshots.funds) {
    const asOf = fund.publishedReturns.asOf;
    if (!asOf || fund.publishedStdDev3y == null) continue;
    it(`${fund.name} — σ 3 ans : ${fund.publishedStdDev3y} % publié`, () => {
      const series = fund.history.dates.map((date, i) => ({ date, value: fund.history.fund[i] }));
      const window = trailingWindow(series, 3, asOf)!;
      const vol = annualizedMonthlyVolatility(window)!;
      expect(Math.abs(vol * 100 - fund.publishedStdDev3y!)).toBeLessThan(0.02);
    });
  }
});

describe("panier simulé à poids constants", () => {
  const a = s([
    ["2024-01-01", 100],
    ["2024-01-02", 110],
    ["2024-01-03", 121],
  ]);
  const b = s([
    ["2024-01-01", 50],
    ["2024-01-02", 50],
    ["2024-01-03", 50],
  ]);

  it("50/50 entre +10 %/jour et 0 % : +5 % par jour, rééquilibré", () => {
    const out = blendSeries([a, b], [1, 1]);
    expect(out.map((p) => p.value)).toEqual([100, 105, 110.25]);
  });

  it("ne garde que les dates communes, sans interpoler", () => {
    const c = s([
      ["2024-01-01", 10],
      ["2024-01-03", 12],
    ]);
    expect(blendSeries([a, c], [1, 1]).map((p) => p.date)).toEqual(["2024-01-01", "2024-01-03"]);
  });

  it("poids incohérents : série vide plutôt qu'un calcul faux", () => {
    expect(blendSeries([a, b], [1])).toEqual([]);
    expect(blendSeries([a, b], [0, 0])).toEqual([]);
  });
});

/** Série mensuelle de fins de mois, à partir d'une liste de rendements. */
function monthly(start: [number, number], returns: number[], base = 100): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let v = base;
  let [y, m] = start;
  for (let i = 0; i <= returns.length; i++) {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); // dernier jour du mois m (1..12)
    out.push({ date: `${y}-${String(m).padStart(2, "0")}-${last}`, value: v });
    if (i < returns.length) v *= 1 + returns[i];
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

describe("fréquence de série", () => {
  it("quotidienne (jours ouvrés), mensuelle (fins de mois), irrégulière", () => {
    const daily = s([
      ["2026-01-05", 1],
      ["2026-01-06", 1],
      ["2026-01-07", 1],
      ["2026-01-08", 1],
      ["2026-01-09", 1],
      ["2026-01-12", 1],
    ]);
    expect(seriesFrequency(daily)).toBe("daily");
    expect(seriesFrequency(monthly([2025, 1], [0.01, 0.02, -0.01, 0.0]))).toBe("monthly");
    expect(
      seriesFrequency(
        s([
          ["2020-01-01", 1],
          ["2021-01-01", 1],
          ["2022-01-01", 1],
        ]),
      ),
    ).toBe("irregular");
    expect(seriesFrequency([])).toBe("irregular");
  });
});

describe("rapport sur une série MENSUELLE (ETF américain)", () => {
  const rets = Array.from({ length: 72 }, (_, i) =>
    i % 3 === 0 ? 0.03 : i % 3 === 1 ? -0.01 : 0.005,
  );
  const fund = monthly([2020, 10], rets);
  const bench = monthly(
    [2020, 10],
    rets.map((r) => r - 0.001),
  );
  const report = performanceReport(fund, { benchmark: bench });

  it("déclare sa fréquence", () => {
    expect(report.frequency).toBe("monthly");
  });

  it("pas de volatilité « quotidienne » sur des points mensuels", () => {
    for (const w of report.windows) expect(w.dailyVolatility).toBeNull();
  });

  it("volatilité mensuelle × √12 et écart de suivi annualisé sur 12 périodes", () => {
    const w3 = report.windows.find((w) => w.years === 3)!;
    expect(w3.available).toBe(true);
    expect(w3.annualizedVolatility).not.toBeNull();
    // Écart constant de 0,1 pt par mois → écart-type ≈ 0 : l'écart de suivi est quasi nul.
    expect(w3.trackingError).not.toBeNull();
    expect(w3.trackingError!).toBeLessThan(1e-3);
  });

  it("écart de suivi : facteur d'annualisation explicite", () => {
    const f = monthly(
      [2024, 1],
      [0.02, -0.01, 0.03, 0.0, 0.01, -0.02, 0.02, 0.01, 0.0, -0.01, 0.02, 0.01, 0.0],
    );
    const b = monthly(
      [2024, 1],
      [0.01, -0.01, 0.02, 0.01, 0.01, -0.01, 0.02, 0.0, 0.0, -0.02, 0.02, 0.0, 0.01],
    );
    const diff = f
      .slice(1)
      .map((p, i) => p.value / f[i].value - 1 - (b[i + 1].value / b[i].value - 1));
    const expected = sampleStdDev(diff)! * Math.sqrt(12);
    expect(trackingError(f, b, 12)).toBeCloseTo(expected, 12);
    // Moins de 12 rendements mensuels : non calculable.
    expect(trackingError(f.slice(0, 8), b.slice(0, 8), 12)).toBeNull();
  });
});
