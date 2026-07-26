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
