import { describe, it, expect } from "vitest";
import { normalizeTo100, setShare, removeShare, addBalanced, totalPct } from "../allocation";

const sum = (rows: { pct: number }[]) => rows.reduce((s, r) => s + r.pct, 0);

describe("normalizeTo100", () => {
  it("scales proportional weights to sum 100", () => {
    const out = normalizeTo100([
      { id: "a", pct: 1 },
      { id: "b", pct: 3 },
    ]);
    expect(sum(out)).toBeCloseTo(100, 9);
    expect(out[0].pct).toBeCloseTo(25, 9);
    expect(out[1].pct).toBeCloseTo(75, 9);
  });
  it("splits equally when everything is zero", () => {
    const out = normalizeTo100([
      { id: "a", pct: 0 },
      { id: "b", pct: 0 },
      { id: "c", pct: 0 },
    ]);
    expect(out.every((r) => Math.abs(r.pct - 100 / 3) < 1e-9)).toBe(true);
  });
});

describe("setShare", () => {
  it("keeps the total at 100 and rebalances the others proportionally", () => {
    const rows = [
      { id: "a", pct: 25 },
      { id: "b", pct: 25 },
      { id: "c", pct: 50 },
    ];
    const out = setShare(rows, "a", 40);
    expect(sum(out)).toBeCloseTo(100, 9);
    expect(out.find((r) => r.id === "a")!.pct).toBe(40);
    // b et c gardent leur ratio 1:2 sur les 60 restants → 20 / 40
    expect(out.find((r) => r.id === "b")!.pct).toBeCloseTo(20, 9);
    expect(out.find((r) => r.id === "c")!.pct).toBeCloseTo(40, 9);
  });

  it("clamps to [0,100]", () => {
    const rows = [
      { id: "a", pct: 50 },
      { id: "b", pct: 50 },
    ];
    expect(setShare(rows, "a", 150).find((r) => r.id === "a")!.pct).toBe(100);
    expect(setShare(rows, "a", -10).find((r) => r.id === "a")!.pct).toBe(0);
    expect(sum(setShare(rows, "a", 150))).toBeCloseTo(100, 9);
  });

  it("forces 100 on the only line", () => {
    const out = setShare([{ id: "a", pct: 40 }], "a", 40);
    expect(out[0].pct).toBe(100);
  });

  it("splits the remainder equally when the others are all at 0", () => {
    const rows = [
      { id: "a", pct: 100 },
      { id: "b", pct: 0 },
      { id: "c", pct: 0 },
    ];
    const out = setShare(rows, "a", 40);
    expect(out.find((r) => r.id === "b")!.pct).toBeCloseTo(30, 9);
    expect(out.find((r) => r.id === "c")!.pct).toBeCloseTo(30, 9);
    expect(sum(out)).toBeCloseTo(100, 9);
  });
});

describe("removeShare", () => {
  it("removes a line and renormalises the rest to 100", () => {
    const rows = [
      { id: "a", pct: 50 },
      { id: "b", pct: 30 },
      { id: "c", pct: 20 },
    ];
    const out = removeShare(rows, "a");
    expect(out.map((r) => r.id)).toEqual(["b", "c"]);
    expect(sum(out)).toBeCloseTo(100, 9);
    // b:c gardent 3:2 → 60 / 40
    expect(out.find((r) => r.id === "b")!.pct).toBeCloseTo(60, 9);
    expect(out.find((r) => r.id === "c")!.pct).toBeCloseTo(40, 9);
  });
});

describe("addBalanced", () => {
  it("gives the new line 1/n and keeps the total at 100", () => {
    const rows = [
      { id: "a", pct: 60 },
      { id: "b", pct: 40 },
    ];
    const out = addBalanced(rows, { id: "c", pct: 0 });
    expect(sum(out)).toBeCloseTo(100, 9);
    expect(out.find((r) => r.id === "c")!.pct).toBeCloseTo(100 / 3, 9);
    // a:b gardent 3:2 sur les 2/3 restants
    expect(out.find((r) => r.id === "a")!.pct).toBeCloseTo((2 / 3) * 100 * 0.6, 9);
  });

  it("gives 100% to the first line added from empty", () => {
    const out = addBalanced([], { id: "a", pct: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].pct).toBe(100);
  });

  it("equal-splits when adding to equal existing lines", () => {
    const out = addBalanced([{ id: "a", pct: 100 }], { id: "b", pct: 0 });
    expect(out.every((r) => Math.abs(r.pct - 50) < 1e-9)).toBe(true);
  });

  it("is a no-op when the id already exists", () => {
    const rows = [{ id: "a", pct: 100 }];
    expect(addBalanced(rows, { id: "a", pct: 0 })).toBe(rows);
  });
});

describe("totalPct", () => {
  it("sums the weights", () => {
    expect(
      totalPct([
        { id: "a", pct: 30 },
        { id: "b", pct: 70 },
      ]),
    ).toBe(100);
  });
});
