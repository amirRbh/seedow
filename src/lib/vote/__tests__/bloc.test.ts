import { describe, it, expect } from "vitest";
import {
  tallyVotes,
  emptyTally,
  blocShare,
  dominantChoice,
  blocPosition,
  isVotable,
  daysUntilClose,
  isVoteChoice,
  soonestClosingOpen,
} from "../bloc";

describe("isVoteChoice", () => {
  it("accepts only the three known choices", () => {
    expect(isVoteChoice("for")).toBe(true);
    expect(isVoteChoice("against")).toBe(true);
    expect(isVoteChoice("abstain")).toBe(true);
    expect(isVoteChoice("maybe")).toBe(false);
    expect(isVoteChoice(null)).toBe(false);
    expect(isVoteChoice(undefined)).toBe(false);
  });
});

describe("tallyVotes", () => {
  it("counts each choice and the total", () => {
    const t = tallyVotes([
      { choice: "for" },
      { choice: "against" },
      { choice: "against" },
      { choice: "abstain" },
    ]);
    expect(t).toEqual({ for: 1, against: 2, abstain: 1, total: 4 });
  });

  it("ignores corrupted rows without inflating the total", () => {
    const t = tallyVotes([{ choice: "against" }, { choice: "garbage" }, { choice: null }]);
    expect(t).toEqual({ for: 0, against: 1, abstain: 0, total: 1 });
  });

  it("returns an empty tally for no rows", () => {
    expect(tallyVotes([])).toEqual(emptyTally());
  });
});

describe("blocShare", () => {
  it("returns the fraction of a camp", () => {
    const t = { for: 1, against: 3, abstain: 0, total: 4 };
    expect(blocShare(t, "against")).toBeCloseTo(0.75, 9);
    expect(blocShare(t, "for")).toBeCloseTo(0.25, 9);
  });

  it("never divides by zero", () => {
    expect(blocShare(emptyTally(), "for")).toBe(0);
  });
});

describe("dominantChoice", () => {
  it("returns the leading camp", () => {
    expect(dominantChoice({ for: 2, against: 5, abstain: 1, total: 8 })).toBe("against");
  });

  it("returns null on an empty tally", () => {
    expect(dominantChoice(emptyTally())).toBeNull();
  });

  it("returns null on a tie between the top two camps", () => {
    expect(dominantChoice({ for: 3, against: 3, abstain: 0, total: 6 })).toBeNull();
  });
});

describe("blocPosition", () => {
  it("reports the user's camp size, others, and honest rank", () => {
    const t = { for: 0, against: 12, abstain: 0, total: 12 };
    expect(blocPosition(t, "against")).toEqual({
      choice: "against",
      sameChoice: 12,
      others: 11,
      rank: 12,
    });
  });

  it("handles being the very first voter without going negative", () => {
    const t = { for: 1, against: 0, abstain: 0, total: 1 };
    expect(blocPosition(t, "for")).toEqual({
      choice: "for",
      sameChoice: 1,
      others: 0,
      rank: 1,
    });
  });
});

describe("isVotable", () => {
  const now = new Date("2026-05-01T00:00:00Z");

  it("is votable when open and before the deadline", () => {
    expect(isVotable({ status: "open", closesAt: "2026-05-10T00:00:00Z" }, now)).toBe(true);
  });

  it("is not votable once closed", () => {
    expect(isVotable({ status: "closed", closesAt: "2026-05-10T00:00:00Z" }, now)).toBe(false);
  });

  it("is not votable past the deadline even if still flagged open", () => {
    expect(isVotable({ status: "open", closesAt: "2026-04-01T00:00:00Z" }, now)).toBe(false);
  });
});

describe("daysUntilClose", () => {
  const now = new Date("2026-05-01T00:00:00Z");

  it("rounds up to whole days", () => {
    expect(daysUntilClose("2026-05-06T12:00:00Z", now)).toBe(6);
  });

  it("clamps past deadlines to 0", () => {
    expect(daysUntilClose("2026-04-20T00:00:00Z", now)).toBe(0);
  });

  it("returns null for an unparseable date", () => {
    expect(daysUntilClose("not-a-date", now)).toBeNull();
  });
});

describe("soonestClosingOpen", () => {
  const now = new Date("2026-05-01T00:00:00Z");

  it("picks the open resolution closing soonest", () => {
    const items = [
      { id: "a", status: "open" as const, closesAt: "2026-05-20T00:00:00Z" },
      { id: "b", status: "open" as const, closesAt: "2026-05-05T00:00:00Z" },
      { id: "c", status: "open" as const, closesAt: "2026-06-01T00:00:00Z" },
    ];
    expect(soonestClosingOpen(items, now)?.id).toBe("b");
  });

  it("ignores closed and past-deadline resolutions", () => {
    const items = [
      { id: "past", status: "open" as const, closesAt: "2026-04-01T00:00:00Z" },
      { id: "closed", status: "closed" as const, closesAt: "2026-05-03T00:00:00Z" },
      { id: "live", status: "open" as const, closesAt: "2026-05-10T00:00:00Z" },
    ];
    expect(soonestClosingOpen(items, now)?.id).toBe("live");
  });

  it("returns null when nothing is votable", () => {
    const items = [{ id: "x", status: "closed" as const, closesAt: "2026-05-10T00:00:00Z" }];
    expect(soonestClosingOpen(items, now)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(soonestClosingOpen([], now)).toBeNull();
  });
});
