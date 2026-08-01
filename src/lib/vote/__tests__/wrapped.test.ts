import { describe, it, expect } from "vitest";
import { computeWrapped, emptyWrapped, type WrappedVote } from "../wrapped";

const resolutions = [
  { id: "r1", company: "TotalEnergies" },
  { id: "r2", company: "Nestlé" },
  { id: "r3", company: "TotalEnergies" },
];

describe("computeWrapped", () => {
  it("aggregates votes, refusals and distinct companies", () => {
    const votes: WrappedVote[] = [
      { resolutionId: "r1", choice: "against" },
      { resolutionId: "r2", choice: "for" },
      { resolutionId: "r3", choice: "against" },
    ];
    const stats = computeWrapped(votes, resolutions, { r1: 100, r2: 40, r3: 250 });
    expect(stats.totalVotes).toBe(3);
    expect(stats.refusals).toBe(2);
    expect(stats.companiesCount).toBe(2); // TotalEnergies + Nestlé
    expect(stats.biggestBloc).toEqual({ total: 250, company: "TotalEnergies" });
  });

  it("dedupes refused companies and caps them", () => {
    const votes: WrappedVote[] = [
      { resolutionId: "r1", choice: "against" },
      { resolutionId: "r3", choice: "against" }, // same company (TotalEnergies)
      { resolutionId: "r2", choice: "against" },
    ];
    const stats = computeWrapped(votes, resolutions, {}, 5);
    expect(stats.refusedCompanies).toEqual(["TotalEnergies", "Nestlé"]);
  });

  it("honours the maxCompanies cap", () => {
    const many = [
      { id: "a", company: "A" },
      { id: "b", company: "B" },
      { id: "c", company: "C" },
    ];
    const votes: WrappedVote[] = [
      { resolutionId: "a", choice: "against" },
      { resolutionId: "b", choice: "against" },
      { resolutionId: "c", choice: "against" },
    ];
    expect(computeWrapped(votes, many, {}, 2).refusedCompanies).toEqual(["A", "B"]);
  });

  it("counts totalVotes even when a resolution is unknown, but not its company", () => {
    const votes: WrappedVote[] = [
      { resolutionId: "r1", choice: "for" },
      { resolutionId: "gone", choice: "against" },
    ];
    const stats = computeWrapped(votes, resolutions, { r1: 10 });
    expect(stats.totalVotes).toBe(2);
    expect(stats.refusals).toBe(1);
    expect(stats.companiesCount).toBe(1);
    expect(stats.refusedCompanies).toEqual([]); // "gone" has no company
  });

  it("returns a null biggestBloc when there are no votes", () => {
    expect(computeWrapped([], resolutions, {})).toEqual(emptyWrapped());
  });

  it("treats a missing bloc total as zero", () => {
    const votes: WrappedVote[] = [{ resolutionId: "r1", choice: "for" }];
    expect(computeWrapped(votes, resolutions, {}).biggestBloc).toEqual({
      total: 0,
      company: "TotalEnergies",
    });
  });
});
