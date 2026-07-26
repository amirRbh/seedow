import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  GUEST_STORAGE_KEY,
  GUEST_SIMULATION_TTL_MS,
  readGuestSimulation,
  writeGuestSimulation,
  clearGuestSimulation,
  hasGuestSimulation,
} from "../guest";

// L'environnement de test est `node` : on fournit un `window.localStorage`
// minimal en mémoire, sans dépendance (jsdom/happy-dom non requis).
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

const hadWindow = "window" in globalThis;

const sample = {
  cause: "climat",
  amount: 10000,
  allocation: [{ ticker: "IWDA", name: "ETF Monde", allocationPct: 60 }],
};

describe("guest simulation storage", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: makeStorage() };
  });

  afterAll(() => {
    if (!hadWindow) delete (globalThis as { window?: unknown }).window;
  });

  it("returns null when nothing is stored", () => {
    expect(readGuestSimulation()).toBeNull();
    expect(hasGuestSimulation()).toBe(false);
  });

  it("round-trips a written simulation and stamps createdAt", () => {
    writeGuestSimulation(sample);
    const read = readGuestSimulation();
    expect(read).not.toBeNull();
    expect(read?.cause).toBe("climat");
    expect(read?.amount).toBe(10000);
    expect(read?.allocation[0].ticker).toBe("IWDA");
    expect(typeof read?.createdAt).toBe("number");
    expect(hasGuestSimulation()).toBe(true);
  });

  it("treats an expired simulation as absent and clears it", () => {
    writeGuestSimulation(sample);
    const raw = JSON.parse(window.localStorage.getItem(GUEST_STORAGE_KEY) as string);
    raw.createdAt = Date.now() - GUEST_SIMULATION_TTL_MS - 1;
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(raw));

    expect(readGuestSimulation()).toBeNull();
    expect(window.localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
  });

  it("returns null on malformed JSON without throwing", () => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, "{not json");
    expect(readGuestSimulation()).toBeNull();
  });

  it("clearGuestSimulation removes the entry", () => {
    writeGuestSimulation(sample);
    clearGuestSimulation();
    expect(hasGuestSimulation()).toBe(false);
  });
});
