import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  INTENT_PRESETS,
  isIntentActive,
  toggleIntent,
  type ScreenerFilters,
} from "../filters";

const preset = (id: (typeof INTENT_PRESETS)[number]["id"]) =>
  INTENT_PRESETS.find((p) => p.id === id)!;

describe("découverte par intentions", () => {
  it("expose les quatre intentions attendues", () => {
    expect(INTENT_PRESETS.map((p) => p.id)).toEqual(["climate", "low_fees", "low_risk", "europe"]);
  });

  it("isIntentActive est faux sur les filtres par défaut", () => {
    for (const p of INTENT_PRESETS) {
      expect(isIntentActive(DEFAULT_FILTERS, p.patch)).toBe(false);
    }
  });

  it("toggleIntent applique puis retire l'intention (retour au défaut)", () => {
    const applied = toggleIntent(DEFAULT_FILTERS, preset("low_fees").patch);
    expect(applied.maxTer).toBe(0.3);
    expect(isIntentActive(applied, preset("low_fees").patch)).toBe(true);

    const removed = toggleIntent(applied, preset("low_fees").patch);
    expect(removed.maxTer).toBe(DEFAULT_FILTERS.maxTer);
    expect(isIntentActive(removed, preset("low_fees").patch)).toBe(false);
  });

  it("gère les intentions à base de tableau (régions)", () => {
    const applied = toggleIntent(DEFAULT_FILTERS, preset("europe").patch);
    expect(applied.regions).toContain("Europe");
    expect(isIntentActive(applied, preset("europe").patch)).toBe(true);

    const removed = toggleIntent(applied, preset("europe").patch);
    expect(removed.regions).toEqual(DEFAULT_FILTERS.regions);
  });

  it("les intentions sont indépendantes (en activer une n'active pas les autres)", () => {
    const withClimate: ScreenerFilters = toggleIntent(DEFAULT_FILTERS, preset("climate").patch);
    expect(isIntentActive(withClimate, preset("climate").patch)).toBe(true);
    expect(isIntentActive(withClimate, preset("low_risk").patch)).toBe(false);
  });
});
