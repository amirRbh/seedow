import { describe, expect, it } from "vitest";
import {
  addItem,
  concentrationFeedback,
  effectiveWeights,
  hasItem,
  herfindahl,
  manualWeightSum,
  removeItem,
  type CollectionItem,
} from "../model";

const items = (arr: Array<Partial<CollectionItem> & { assetId: string }>): CollectionItem[] =>
  arr.map((a) => ({ weightPct: null, amount: null, note: null, ...a }));

describe("effectiveWeights", () => {
  it("mode equal : parts égales sommant à 1", () => {
    const w = effectiveWeights(
      items([{ assetId: "a" }, { assetId: "b" }, { assetId: "c" }]),
      "equal",
    );
    expect(w.a).toBeCloseTo(1 / 3, 10);
    expect(Object.values(w).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  });
  it("mode manual : normalise les poids saisis", () => {
    const w = effectiveWeights(
      items([
        { assetId: "a", weightPct: 25 },
        { assetId: "b", weightPct: 75 },
      ]),
      "manual",
    );
    expect(w.a).toBeCloseTo(0.25, 10);
    expect(w.b).toBeCloseTo(0.75, 10);
  });
  it("mode amount : dérive les poids des montants", () => {
    const w = effectiveWeights(
      items([
        { assetId: "a", amount: 100 },
        { assetId: "b", amount: 300 },
      ]),
      "amount",
    );
    expect(w.a).toBeCloseTo(0.25, 10);
    expect(w.b).toBeCloseTo(0.75, 10);
  });
  it("repli equal si aucune valeur exploitable dans le mode", () => {
    const w = effectiveWeights(items([{ assetId: "a" }, { assetId: "b" }]), "manual");
    expect(w.a).toBeCloseTo(0.5, 10);
  });
  it("collection vide → objet vide", () => {
    expect(effectiveWeights([], "equal")).toEqual({});
  });
});

describe("manualWeightSum (révèle l'écart à 100 %, ne corrige pas)", () => {
  it("somme les poids saisis en mode manual", () => {
    expect(
      manualWeightSum(
        items([
          { assetId: "a", weightPct: 40 },
          { assetId: "b", weightPct: 40 },
        ]),
        "manual",
      ),
    ).toBe(80);
  });
  it("null hors mode manual", () => {
    expect(manualWeightSum(items([{ assetId: "a" }]), "equal")).toBeNull();
  });
});

describe("herfindahl / concentrationFeedback", () => {
  it("HHI = 1 pour une seule ligne, 1/n pour n lignes égales", () => {
    expect(herfindahl({ a: 1 })).toBeCloseTo(1, 10);
    expect(herfindahl({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 })).toBeCloseTo(0.25, 10);
  });
  it("effectiveLines = équivalent-N", () => {
    const fb = concentrationFeedback(
      items([{ assetId: "a" }, { assetId: "b" }, { assetId: "c" }, { assetId: "d" }]),
      "equal",
    );
    expect(fb?.effectiveLines).toBeCloseTo(4, 6);
    expect(fb?.topWeight).toBeCloseTo(0.25, 6);
  });
  it("signale une forte concentration et reste étiqueté fund-level", () => {
    const fb = concentrationFeedback(
      items([
        { assetId: "a", weightPct: 90 },
        { assetId: "b", weightPct: 10 },
      ]),
      "manual",
    );
    expect(fb?.topWeight).toBeCloseTo(0.9, 6);
    expect(fb?.fundLevelOnly).toBe(true);
  });
  it("collection vide → null", () => {
    expect(concentrationFeedback([], "equal")).toBeNull();
  });
});

describe("opérations immuables", () => {
  const base = items([{ assetId: "a" }]);
  it("addItem est idempotent et n'altère pas l'entrée", () => {
    const next = addItem(base, { assetId: "b" });
    expect(next.map((i) => i.assetId)).toEqual(["a", "b"]);
    expect(addItem(next, { assetId: "b" })).toHaveLength(2);
    expect(base).toHaveLength(1);
  });
  it("removeItem retire par id", () => {
    expect(
      removeItem(items([{ assetId: "a" }, { assetId: "b" }]), "a").map((i) => i.assetId),
    ).toEqual(["b"]);
  });
  it("hasItem détecte la présence", () => {
    expect(hasItem(base, "a")).toBe(true);
    expect(hasItem(base, "z")).toBe(false);
  });
});
