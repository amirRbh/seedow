import { describe, it, expect } from "vitest";
import {
  allocatedShare,
  isOverAllocated,
  normalizedForAverages,
  sanitizeWeights,
  sumWeights,
  unallocatedShare,
} from "../weights";

/**
 * La règle produit tient en une phrase : le poids que l'utilisateur saisit est
 * le poids qui est enregistré. Ces tests la verrouillent.
 */
describe("weights — la composition de l'utilisateur n'est jamais réécrite", () => {
  const partial = { a: 0.5, b: 0.2, c: 0.1 }; // 80 %

  it("80 % reste 80 % — aucune renormalisation", () => {
    const clean = sanitizeWeights(partial);
    expect(clean).toEqual({ a: 0.5, b: 0.2, c: 0.1 });
    expect(sumWeights(clean)).toBeCloseTo(0.8, 9);
    expect(allocatedShare(clean)).toBeCloseTo(0.8, 9);
  });

  it("expose la part non attribuée plutôt que de la combler", () => {
    expect(unallocatedShare(partial)).toBeCloseTo(0.2, 9);
  });

  it("un portefeuille complet ne change pas de comportement (non-régression)", () => {
    const full = { a: 0.6, b: 0.4 };
    expect(sanitizeWeights(full)).toEqual(full);
    expect(unallocatedShare(full)).toBe(0);
    expect(isOverAllocated(full)).toBe(false);
  });

  it("écarte le bruit sans toucher aux lignes valides", () => {
    const noisy = { a: 0.5, b: 0, c: -0.2, d: Number.NaN, e: 0.3 };
    expect(sanitizeWeights(noisy)).toEqual({ a: 0.5, e: 0.3 });
  });

  it("écarte les actifs inconnus de l'univers", () => {
    const clean = sanitizeWeights({ known: 0.4, ghost: 0.4 }, (id) => id === "known");
    expect(clean).toEqual({ known: 0.4 });
    // La ligne fantôme est retirée, pas redistribuée sur les autres.
    expect(sumWeights(clean)).toBeCloseTo(0.4, 9);
  });

  it("signale une sur-allocation au lieu de la rattraper", () => {
    const over = { a: 0.7, b: 0.5 }; // 120 %
    expect(isOverAllocated(over)).toBe(true);
    expect(sanitizeWeights(over)).toEqual(over);
    // La part non attribuée ne devient jamais négative.
    expect(unallocatedShare(over)).toBe(0);
  });

  it("tolère l'arrondi : 100 % pile n'est pas une sur-allocation", () => {
    expect(isOverAllocated({ a: 1 / 3, b: 1 / 3, c: 1 / 3 })).toBe(false);
  });

  it("tolère l'arrondi de douze lignes fractionnaires (flux « Personnaliser »)", () => {
    // Douze parts égales arrondies à 6 décimales, chacune vers le haut.
    const rounded = Math.ceil((1 / 12) * 1e6) / 1e6;
    const twelve = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`a${i}`, rounded]),
    ) as Record<string, number>;
    expect(sumWeights(twelve)).toBeGreaterThan(1);
    expect(isOverAllocated(twelve)).toBe(false);
  });

  it("borne une ligne à 100 % du montant", () => {
    expect(sanitizeWeights({ a: 1.4 })).toEqual({ a: 1 });
  });

  it("normalise seulement pour les MOYENNES, sans jamais modifier la source", () => {
    const source = { ...partial };
    const norm = normalizedForAverages(source);
    expect(sumWeights(norm)).toBeCloseTo(1, 9);
    expect(norm.a).toBeCloseTo(0.625, 9);
    // L'objet d'origine est intact : la normalisation est une lecture, pas un effet.
    expect(source).toEqual(partial);
  });

  it("rend un objet vide quand rien n'est alloué", () => {
    expect(normalizedForAverages({})).toEqual({});
    expect(unallocatedShare({})).toBe(1);
  });
});
