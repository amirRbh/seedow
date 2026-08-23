import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { writePoolHandoff, readPoolHandoff, clearPoolHandoff } from "../poolHandoff";

// Environnement de test `node` : on fournit un `localStorage` minimal en mémoire.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const hadLocalStorage = "localStorage" in globalThis;
const assets = [{ id: "a1", ticker: "AAA", name: "Fonds A", esgScore: 72 }];

describe("poolHandoff", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = makeStorage();
  });
  afterAll(() => {
    if (!hadLocalStorage) delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("retourne null quand rien n'est stocké", () => {
    expect(readPoolHandoff()).toBeNull();
  });

  it("préserve actifs + intention (mode/causes/exclusions/nom), et purge à la lecture", () => {
    writePoolHandoff(assets, {
      mode: "create",
      causes: ["climat"],
      exclusions: ["fossiles"],
      name: "Mon 2ᵉ portefeuille",
    });
    const got = readPoolHandoff();
    expect(got).not.toBeNull();
    expect(got!.assets).toHaveLength(1);
    expect(got!.mode).toBe("create");
    expect(got!.causes).toEqual(["climat"]);
    expect(got!.exclusions).toEqual(["fossiles"]);
    expect(got!.name).toBe("Mon 2ᵉ portefeuille");
    // Usage unique : la 2ᵉ lecture est vide.
    expect(readPoolHandoff()).toBeNull();
  });

  it("garde l'intention même sans actif (page blanche additive : mode create conservé)", () => {
    writePoolHandoff([], { mode: "create", causes: [], exclusions: [] });
    const got = readPoolHandoff();
    expect(got).not.toBeNull();
    expect(got!.assets).toHaveLength(0);
    expect(got!.mode).toBe("create");
  });

  it("défaut sûr : mode 'replace' quand l'intention est absente/illisible", () => {
    // Écrit une charge brute sans champ mode.
    globalThis.localStorage.setItem(
      "seedow_pool_handoff",
      JSON.stringify({ assets, savedAt: Date.now() }),
    );
    const got = readPoolHandoff();
    expect(got!.mode).toBe("replace");
    expect(got!.causes).toEqual([]);
  });

  it("transporte le cadre chiffré du questionnaire (montant, risque, horizon)", () => {
    writePoolHandoff(assets, {
      mode: "replace",
      causes: [],
      exclusions: [],
      initialAmount: 500,
      riskTarget: 0.13,
      horizonYears: 25,
    });
    const got = readPoolHandoff();
    expect(got!.initialAmount).toBe(500);
    expect(got!.riskTarget).toBe(0.13);
    expect(got!.horizonYears).toBe(25);
  });

  it("ignore un cadre chiffré hors bornes ou corrompu plutôt que de le transmettre", () => {
    globalThis.localStorage.setItem(
      "seedow_pool_handoff",
      JSON.stringify({
        assets,
        mode: "replace",
        causes: [],
        exclusions: [],
        initialAmount: 99_000_000, // > plafond serveur
        riskTarget: "0.13", // pas un nombre
        horizonYears: 120, // > 40 ans
        savedAt: Date.now(),
      }),
    );
    const got = readPoolHandoff();
    // Repli sur les défauts serveur : l'enregistrement n'échoue jamais sur un seed corrompu.
    expect(got!.initialAmount).toBeUndefined();
    expect(got!.riskTarget).toBeUndefined();
    expect(got!.horizonYears).toBeUndefined();
  });

  it("expire au-delà du TTL", () => {
    writePoolHandoff(assets, { mode: "replace", causes: [], exclusions: [] });
    // 1 h + 1 min plus tard.
    expect(readPoolHandoff(Date.now() + 61 * 60 * 1000)).toBeNull();
  });

  it("clearPoolHandoff efface un seed en attente", () => {
    writePoolHandoff(assets, { mode: "replace", causes: [], exclusions: [] });
    clearPoolHandoff();
    expect(readPoolHandoff()).toBeNull();
  });
});
