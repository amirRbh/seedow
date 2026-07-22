import { describe, it, expect } from "vitest";
import { runSimulation, formatSimulation, type SimulationInput } from "../simulation";

const baseInput: SimulationInput = {
  initial: 1000,
  monthly: 100,
  years: 10,
  annualReturnLow: 0.03,
  annualReturnHigh: 0.07,
};

describe("runSimulation", () => {
  it("sums contributions as initial + monthly × months", () => {
    const out = runSimulation({ ...baseInput, years: 10 });
    expect(out.contributions).toBe(1000 + 100 * 120);
  });

  it("returns the raw contributions when the rate is zero (no growth)", () => {
    const out = runSimulation({
      initial: 1000,
      monthly: 100,
      years: 1,
      annualReturnLow: 0,
      annualReturnHigh: 0,
    });
    expect(out.low).toBeCloseTo(1000 + 100 * 12, 6);
    expect(out.high).toBeCloseTo(1000 + 100 * 12, 6);
    expect(out.mid).toBeCloseTo(1000 + 100 * 12, 6);
    expect(out.shocked).toBeNull();
  });

  it("keeps low ≤ mid ≤ high and beats contributions with positive rates", () => {
    const out = runSimulation(baseInput);
    expect(out.low).toBeLessThanOrEqual(out.mid);
    expect(out.mid).toBeLessThanOrEqual(out.high);
    expect(out.mid).toBeGreaterThan(out.contributions);
  });

  it("applies an end-of-horizon shock multiplicatively to mid", () => {
    const out = runSimulation({ ...baseInput, shockPct: -0.2 });
    expect(out.shocked).toBeCloseTo(out.mid * 0.8, 6);
  });
});

// ── Conformité CLAUDE.md §5.2 / §5.6 / §1.5 ────────────────────────────
// Ethi ne recommande jamais d'investir, ne fabrique pas d'urgence et ne
// fait pas de growth. Ce verrou empêche la réintroduction d'une clôture
// impérative dans la sortie déterministe de la simulation.
describe("formatSimulation — garde-fous de neutralité", () => {
  const forbidden = [
    /d[eè]s maintenant/i,
    /programme ce versement/i,
    /tu devrais/i,
    /you should/i,
    /set up the (monthly )?transfer now/i,
    /chaque mois saut[eé]/i,
    /every month skipped/i,
  ];

  for (const lang of ["fr", "en"] as const) {
    it(`ne contient aucun impératif d'investissement (${lang})`, () => {
      const out = runSimulation({ ...baseInput, shockPct: -0.2 });
      const text = formatSimulation({ ...baseInput, shockPct: -0.2 }, out, lang);
      for (const pattern of forbidden) {
        expect(text).not.toMatch(pattern);
      }
    });

    it(`clôture par une piste d'exploration neutre et rappelle le risque (${lang})`, () => {
      const out = runSimulation(baseInput);
      const text = formatSimulation(baseInput, out, lang);
      expect(text).toContain(lang === "en" ? "Worth exploring." : "Piste à explorer.");
      expect(text).not.toContain("Action.");
      // Disclaimer capital non garanti / performances passées.
      expect(text).toMatch(lang === "en" ? /not guaranteed/i : /pas garanti/i);
    });
  }
});
