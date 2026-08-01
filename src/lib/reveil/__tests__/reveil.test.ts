import { describe, it, expect } from "vitest";
import { buildReveil, type ReveilSubject, type ReveilVote } from "../reveil";

function subject(over: Partial<ReveilSubject> & { assetId: string; name: string }): ReveilSubject {
  return {
    ticker: over.name.slice(0, 4).toUpperCase(),
    esgScore: 5,
    greenwashingRisk: "low",
    greenwashingReasons: [],
    owned: false,
    ...over,
  };
}

describe("buildReveil", () => {
  it("returns nothing without subjects", () => {
    expect(buildReveil([], [])).toEqual([]);
  });

  it("surfaces an upcoming vote on a company you hold, first", () => {
    const subjects = [
      subject({
        assetId: "a",
        name: "Total",
        ticker: "TTE",
        greenwashingRisk: "high",
        greenwashingReasons: ["art9_low_esg"],
      }),
    ];
    const votes: ReveilVote[] = [
      { resolutionId: "r1", ticker: "TTE", company: "TotalEnergies", daysLeft: 5 },
    ];
    const feed = buildReveil(subjects, votes);
    expect(feed[0].tone).toBe("action");
    expect(feed[0].action).toEqual({ kind: "vote", resolutionId: "r1" });
  });

  it("ignores votes whose ticker isn't in the user's companies", () => {
    const subjects = [subject({ assetId: "a", name: "Ørsted", ticker: "ORSTED" })];
    const votes: ReveilVote[] = [
      { resolutionId: "r1", ticker: "TTE", company: "TotalEnergies", daysLeft: 5 },
    ];
    expect(buildReveil(subjects, votes).some((d) => d.tone === "action")).toBe(false);
  });

  it("orders greenwashing high before medium, owned before watched, and dedupes by company", () => {
    const subjects = [
      subject({
        assetId: "m",
        name: "MediumCo",
        ticker: "MED",
        greenwashingRisk: "medium",
        greenwashingReasons: ["sfdr_low_esg"],
        owned: true,
      }),
      subject({
        assetId: "h1",
        name: "HighCo",
        ticker: "HI1",
        greenwashingRisk: "high",
        greenwashingReasons: ["art9_no_exclusions"],
        owned: false,
      }),
      subject({
        assetId: "h2",
        name: "HighCo",
        ticker: "HI2",
        greenwashingRisk: "high",
        greenwashingReasons: ["art9_low_esg"],
        owned: true,
      }),
    ];
    const feed = buildReveil(subjects, []);
    const cautions = feed.filter((d) => d.tone === "caution");
    expect(cautions[0].company).toBe("HighCo"); // high before medium
    expect(cautions.map((c) => c.company)).toEqual(["HighCo", "MediumCo"]); // deduped
  });

  it("uses the first greenwashing reason as the body key", () => {
    const subjects = [
      subject({
        assetId: "a",
        name: "Claimy",
        greenwashingRisk: "high",
        greenwashingReasons: ["green_theme_low_climate", "art9_low_esg"],
      }),
    ];
    const [card] = buildReveil(subjects, []);
    expect(card.bodyKey).toBe("reveil.reason.green_theme_low_climate");
  });

  it("adds a bright card only for low-risk, high-ESG holdings", () => {
    const subjects = [
      subject({
        assetId: "good",
        name: "Clean",
        esgScore: 8.2,
        greenwashingRisk: "low",
        owned: true,
      }),
      subject({ assetId: "mid", name: "Meh", esgScore: 6.0, greenwashingRisk: "low" }),
    ];
    const feed = buildReveil(subjects, []);
    const bright = feed.filter((d) => d.tone === "bright");
    expect(bright).toHaveLength(1);
    expect(bright[0].company).toBe("Clean");
  });

  it("caps the number of cards", () => {
    const subjects = Array.from({ length: 10 }, (_, i) =>
      subject({
        assetId: `a${i}`,
        name: `Co${i}`,
        ticker: `T${i}`,
        greenwashingRisk: "high",
        greenwashingReasons: ["art9_low_esg"],
      }),
    );
    expect(buildReveil(subjects, [], { maxCards: 4 })).toHaveLength(4);
  });
});
