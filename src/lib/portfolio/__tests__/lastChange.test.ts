import { describe, it, expect, beforeEach } from "vitest";
import {
  recordComposition,
  readComposition,
  diffCompositions,
  type Composition,
} from "../lastChange";

/** localStorage minimal — l'environnement de test n'en fournit pas toujours un. */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const comp = (portfolioId: string, lines: Array<[string, string, number]>): Composition => ({
  portfolioId,
  at: new Date().toISOString(),
  total: 500,
  lines: lines.map(([id, name, amount]) => ({ id, name, amount, esgScore: 70 })),
});

describe("mémoire du dernier geste", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  it("garde la composition précédente du MÊME portefeuille", () => {
    recordComposition(comp("p1", [["a", "ETF A", 100]]));
    recordComposition(comp("p1", [["a", "ETF A", 200]]));
    const stored = readComposition("p1");
    expect(stored?.previous?.lines[0].amount).toBe(100);
    expect(stored?.current.lines[0].amount).toBe(200);
  });

  it("ne compare jamais deux portefeuilles différents", () => {
    // Sinon Le Fil annoncerait « tu as retiré 1 ligne » pour un geste qui n'a
    // jamais eu lieu — l'utilisateur a simplement changé de portefeuille.
    recordComposition(comp("p1", [["a", "ETF A", 100]]));
    recordComposition(comp("p2", [["b", "ETF B", 300]]));
    expect(readComposition("p2")?.previous).toBeUndefined();
  });

  it("ne rend rien pour un portefeuille dont rien n'est enregistré", () => {
    recordComposition(comp("p1", [["a", "ETF A", 100]]));
    expect(readComposition("p2")).toBeNull();
  });

  it("survit à un stockage indisponible sans lever", () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem() {
        throw new Error("bloqué");
      },
      setItem() {
        throw new Error("bloqué");
      },
    };
    expect(() => recordComposition(comp("p1", [["a", "ETF A", 100]]))).not.toThrow();
    expect(readComposition("p1")).toBeNull();
  });
});

describe("ce qui a bougé", () => {
  it("nomme les quatre mouvements possibles", () => {
    const before = comp("p", [
      ["a", "ETF A", 100],
      ["b", "ETF B", 200],
      ["c", "ETF C", 50],
    ]);
    const after = comp("p", [
      ["a", "ETF A", 300],
      ["b", "ETF B", 100],
      ["d", "ETF D", 25],
    ]);
    const d = diffCompositions(before, after);
    expect(d.map((c) => [c.kind, c.name])).toEqual([
      ["increased", "ETF A"],
      ["decreased", "ETF B"],
      ["removed", "ETF C"],
      ["added", "ETF D"],
    ]);
  });

  it("classe du mouvement le plus gros au plus petit", () => {
    const d = diffCompositions(
      comp("p", []),
      comp("p", [
        ["a", "Petit", 10],
        ["b", "Gros", 400],
      ]),
    );
    expect(d[0].name).toBe("Gros");
  });

  it("ignore une ligne restée à zéro — ce n'est pas un geste", () => {
    const d = diffCompositions(comp("p", []), comp("p", [["a", "ETF A", 0]]));
    expect(d).toEqual([]);
  });

  it("ne bouge pas ce qui n'a pas bougé", () => {
    const same = comp("p", [["a", "ETF A", 100]]);
    expect(diffCompositions(same, same)).toEqual([]);
  });
});
