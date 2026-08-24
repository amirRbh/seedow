import { describe, it, expect } from "vitest";
import { buildCovariance } from "../covariance";
import { makeAsset } from "./fixtures";

/**
 * Cette règle de repli est désormais partagée par la persistance et par
 * l'analyse. Si elle divergeait, un même portefeuille afficherait deux
 * volatilités selon l'écran qui le regarde — d'où ces tests.
 */
describe("sous-matrice de covariance", () => {
  const a = makeAsset({ id: "a", volatility: 0.2 });
  const b = makeAsset({ id: "b", volatility: 0.1 });

  it("utilise les covariances observées quand elles existent", () => {
    const cov = buildCovariance([a, b], new Map([["a|b", 0.008]]));
    expect(cov[0][1]).toBe(0.008);
  });

  it("retombe sur volatility² en diagonale — jamais 0", () => {
    const cov = buildCovariance([a, b], new Map());
    expect(cov[0][0]).toBeCloseTo(0.04, 9);
    expect(cov[1][1]).toBeCloseTo(0.01, 9);
    // Un actif a toujours un risque propre : une diagonale nulle ferait passer
    // un portefeuille pour sans risque.
    expect(cov[0][0]).toBeGreaterThan(0);
  });

  it("suppose la non-corrélation hors diagonale, faute de mesure", () => {
    const cov = buildCovariance([a, b], new Map());
    expect(cov[0][1]).toBe(0);
    expect(cov[1][0]).toBe(0);
  });

  it("rend une matrice de la bonne taille, même pour un seul actif", () => {
    expect(buildCovariance([a], new Map())).toHaveLength(1);
    expect(buildCovariance([], new Map())).toEqual([]);
  });
});
