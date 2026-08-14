import { describe, expect, it } from "vitest";
import {
  computeStaleDays,
  planIngestion,
  scoreCandidate,
  summarizePlan,
  type IngestionCandidate,
} from "../ingestion-plan";

const NOW = new Date("2026-08-14T00:00:00Z");

function cand(over: Partial<IngestionCandidate>): IngestionCandidate {
  return {
    assetId: "a",
    isin: null,
    demandCount: 0,
    completeness: 100,
    lastUpdated: "2026-08-13T00:00:00Z",
    hasSource: true,
    ...over,
  };
}

describe("computeStaleDays", () => {
  it("calcule l'ancienneté, null si absente/illisible", () => {
    expect(computeStaleDays("2026-08-04T00:00:00Z", NOW)).toBeCloseTo(10, 5);
    expect(computeStaleDays(null, NOW)).toBeNull();
    expect(computeStaleDays("pas une date", NOW)).toBeNull();
  });
});

describe("scoreCandidate", () => {
  it("un fonds jamais ingéré passe en tête", () => {
    const item = scoreCandidate(cand({ lastUpdated: null, completeness: null }), {
      now: NOW,
      staleDays: 30,
    });
    expect(item.reasons).toContain("never_ingested");
    expect(item.staleDays).toBeNull();
    expect(item.priority).toBeGreaterThan(400);
  });

  it("données fraîches et complètes → priorité nulle", () => {
    const item = scoreCandidate(cand({}), { now: NOW, staleDays: 30 });
    expect(item.priority).toBe(0);
    expect(item.reasons).toHaveLength(0);
  });

  it("périmé au-delà du seuil ajoute de la priorité", () => {
    const item = scoreCandidate(cand({ lastUpdated: "2026-05-01T00:00:00Z" }), {
      now: NOW,
      staleDays: 30,
    });
    expect(item.reasons).toContain("stale");
    expect(item.priority).toBeGreaterThan(0);
  });

  it("la demande est plafonnée (pas de saturation)", () => {
    const a = scoreCandidate(cand({ demandCount: 10 }), { now: NOW, staleDays: 30 });
    const b = scoreCandidate(cand({ demandCount: 9999 }), { now: NOW, staleDays: 30 });
    expect(b.priority).toBe(a.priority); // au-delà du cap, identique
    expect(a.reasons).toContain("high_demand");
  });
});

describe("planIngestion", () => {
  it("trie par priorité décroissante, tronque à limit, ordre déterministe", () => {
    const plan = planIngestion(
      [
        cand({ assetId: "fresh" }),
        cand({ assetId: "new", lastUpdated: null, completeness: null }),
        cand({ assetId: "stale", lastUpdated: "2026-04-01T00:00:00Z", completeness: 50 }),
      ],
      { now: NOW, staleDays: 30, limit: 2 },
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].assetId).toBe("new"); // jamais ingéré = priorité max
    expect(plan[0].priority).toBeGreaterThanOrEqual(plan[1].priority);
  });

  it("ne mute pas l'entrée", () => {
    const input = [cand({ assetId: "x" }), cand({ assetId: "y", demandCount: 5 })];
    const snapshot = JSON.stringify(input);
    planIngestion(input, { now: NOW });
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("summarizePlan", () => {
  it("compte le total et les raisons (pour le journal cron)", () => {
    const plan = planIngestion(
      [
        cand({ assetId: "new", lastUpdated: null, completeness: null }),
        cand({ assetId: "stale", lastUpdated: "2026-04-01T00:00:00Z", completeness: 50 }),
        cand({ assetId: "demand", demandCount: 4 }),
      ],
      { now: NOW, staleDays: 30 },
    );
    const s = summarizePlan(plan);
    expect(s.total).toBe(3);
    expect(s.byReason.never_ingested).toBe(1);
    expect(s.byReason.high_demand).toBe(1);
    expect(s.byReason.stale).toBeGreaterThanOrEqual(1);
  });

  it("file vide → tout à zéro", () => {
    expect(summarizePlan([])).toEqual({
      total: 0,
      byReason: { never_ingested: 0, no_source: 0, stale: 0, incomplete: 0, high_demand: 0 },
    });
  });
});
