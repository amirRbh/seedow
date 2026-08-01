import { describe, it, expect } from "vitest";
import { detectEsgDrop } from "../esg-alert";

describe("detectEsgDrop", () => {
  it("does not alert when there is no previous score", () => {
    expect(detectEsgDrop(50, null).dropped).toBe(false);
    expect(detectEsgDrop(50, undefined).dropped).toBe(false);
  });

  it("does not alert on a non-positive previous score", () => {
    expect(detectEsgDrop(50, 0).dropped).toBe(false);
    expect(detectEsgDrop(50, -10).dropped).toBe(false);
  });

  it("alerts when the relative drop meets the threshold", () => {
    // 80 → 60 = −25 %
    const r = detectEsgDrop(60, 80);
    expect(r.dropped).toBe(true);
    expect(r.relativeDropPct).toBeCloseTo(25, 6);
  });

  it("alerts exactly at the threshold boundary (−20 %)", () => {
    // 100 → 80 = −20 %
    expect(detectEsgDrop(80, 100).dropped).toBe(true);
  });

  it("does not alert on a drop below the threshold", () => {
    // 100 → 85 = −15 %
    const r = detectEsgDrop(85, 100);
    expect(r.dropped).toBe(false);
    expect(r.relativeDropPct).toBeCloseTo(15, 6);
  });

  it("does not alert when the score increases", () => {
    expect(detectEsgDrop(90, 70).dropped).toBe(false);
    expect(detectEsgDrop(90, 70).relativeDropPct).toBe(0);
  });

  it("honours a custom threshold", () => {
    // −10 % with a 5 % threshold → alert
    expect(detectEsgDrop(90, 100, 5).dropped).toBe(true);
    // −10 % with a 30 % threshold → no alert
    expect(detectEsgDrop(90, 100, 30).dropped).toBe(false);
  });
});

import {
  buildGreenwashingAlertCandidates,
  sortAlertsByPriority,
  type OwnedHoldingExposure,
  type GreenwashingSignalInput,
} from "../esg-alert";

describe("buildGreenwashingAlertCandidates", () => {
  const holdings: OwnedHoldingExposure[] = [
    { id: "a", name: "Total", allocationPct: 12 },
    { id: "b", name: "Unknown Corp", allocationPct: null },
    { id: "c", name: "CleanCo", allocationPct: 5 },
    { id: "d", name: "ZeroWeight", allocationPct: 0 },
  ];

  it("excludes low risk and unknown assets", () => {
    const signals = new Map<string, GreenwashingSignalInput>([
      ["a", { assetId: "a", risk: "low", reasonKey: null }],
      ["c", { assetId: "c", risk: "high", reasonKey: "art9_low_esg" }],
    ]);
    const out = buildGreenwashingAlertCandidates(holdings, signals);
    expect(out.map((o) => o.holdingId)).toEqual(["c"]);
  });

  it("never fabricates an unknown exposure", () => {
    const signals = new Map<string, GreenwashingSignalInput>([
      ["b", { assetId: "b", risk: "high", reasonKey: "art9_low_esg" }],
      ["d", { assetId: "d", risk: "high", reasonKey: "art9_low_esg" }],
    ]);
    expect(buildGreenwashingAlertCandidates(holdings, signals)).toEqual([]);
  });

  it("sorts high risk first, then by real weight descending", () => {
    const signals = new Map<string, GreenwashingSignalInput>([
      ["a", { assetId: "a", risk: "medium", reasonKey: "sfdr_low_esg" }],
      ["c", { assetId: "c", risk: "high", reasonKey: "art9_low_esg" }],
    ]);
    const out = buildGreenwashingAlertCandidates(holdings, signals);
    expect(out.map((o) => o.holdingId)).toEqual(["c", "a"]);
  });
});

describe("sortAlertsByPriority", () => {
  it("puts greenwashing alerts on real holdings before other kinds, regardless of severity", () => {
    const out = sortAlertsByPriority([
      { kind: "concentration", severity: "alert", createdAt: "2026-01-02T00:00:00Z" },
      { kind: "greenwashing", severity: "warn", createdAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(out[0].kind).toBe("greenwashing");
  });

  it("falls back to severity then recency within the same kind tier", () => {
    const out = sortAlertsByPriority([
      { kind: "esg_drift", severity: "info", createdAt: "2026-01-01T00:00:00Z" },
      { kind: "esg_drift", severity: "alert", createdAt: "2026-01-01T00:00:00Z" },
      { kind: "esg_drift", severity: "alert", createdAt: "2026-01-03T00:00:00Z" },
    ]);
    expect(out.map((o) => o.createdAt)).toEqual([
      "2026-01-03T00:00:00Z",
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z",
    ]);
  });
});
