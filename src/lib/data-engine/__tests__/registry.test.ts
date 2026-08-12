import { describe, expect, it } from "vitest";
import {
  SOURCE_BY_KEY,
  SOURCE_REGISTRY,
  preferredSource,
  priorityForType,
} from "../sources/registry";

describe("source registry", () => {
  it("clés uniques et lookup cohérent", () => {
    const keys = SOURCE_REGISTRY.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(SOURCE_BY_KEY.size).toBe(SOURCE_REGISTRY.length);
  });

  it("chaque source a une priorité 1..4 cohérente avec son type (§4)", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.priority).toBe(priorityForType(s.type));
      expect(s.priority).toBeGreaterThanOrEqual(1);
      expect(s.priority).toBeLessThanOrEqual(4);
    }
  });

  it("documente le légal : chaque source a des notes et un provides non vide (§23)", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.provides.length).toBeGreaterThan(0);
      expect(s.notes.length).toBeGreaterThan(0);
      expect(s.homeUrl).toMatch(/^https?:\/\//);
    }
  });

  it("preferredSource choisit la priorité la plus forte", () => {
    // amf_geco (P1) l'emporte sur yahoo_finance (P3)
    expect(preferredSource("amf_geco", "yahoo_finance")).toBe("amf_geco");
    expect(preferredSource("yahoo_finance", "ishares_factsheet")).toBe("ishares_factsheet");
  });

  it("aucune source commerciale n'est au cœur du MVP (§22)", () => {
    expect(SOURCE_REGISTRY.some((s) => s.type === "commercial")).toBe(false);
  });
});
