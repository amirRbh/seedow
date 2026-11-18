import { describe, expect, it } from "vitest";
import { MAX_REPORT, parseReportSelection, topExposures, topWeight } from "../report";

describe("sélection du rapport", () => {
  it("ISIN valides, majuscules, dédoublonnés, bornés", () => {
    expect(parseReportSelection("ie00b4l5y983, IE00B4L5Y983,nope,US4642882249")).toEqual([
      "IE00B4L5Y983",
      "US4642882249",
    ]);
    expect(parseReportSelection(undefined)).toEqual([]);
    const many = Array.from({ length: 10 }, (_, i) => `IE00B4L5Y98${i}`).join(",");
    expect(parseReportSelection(many)).toHaveLength(MAX_REPORT);
  });
});

describe("expositions principales", () => {
  it("trie, coupe, et laisse liquidités et « autres » dans le reste", () => {
    const rows = [
      { label: "Cash and/or Derivatives", weightPct: 40 },
      { label: "Other", weightPct: 30 },
      { label: "Japan", weightPct: 5 },
      { label: "United States", weightPct: 20 },
      { label: "France", weightPct: 5.5 },
    ];
    expect(topExposures(rows, 2).map((r) => r.label)).toEqual(["United States", "France"]);
  });

  it("poids des 10 premières lignes ; liste vide → null", () => {
    expect(topWeight([{ weightPct: 5.555 }, { weightPct: 1 }], 10)).toBe(6.56);
    expect(topWeight([])).toBeNull();
  });
});
