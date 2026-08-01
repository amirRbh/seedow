import { describe, expect, it } from "vitest";
import { computeCourseStatuses } from "../status";

const SLUGS = ["a", "b", "c", "d"];

describe("computeCourseStatuses", () => {
  it("marks everything not_started with no history", () => {
    const result = computeCourseStatuses(SLUGS, [], []);
    expect(result.map((r) => r.status)).toEqual([
      "not_started",
      "not_started",
      "not_started",
      "not_started",
    ]);
  });

  it("flags the first non-completed course as start-here", () => {
    const result = computeCourseStatuses(SLUGS, ["a"], []);
    expect(result.find((r) => r.slug === "a")?.isStartHere).toBe(false);
    expect(result.find((r) => r.slug === "b")?.isStartHere).toBe(true);
    expect(result.filter((r) => r.isStartHere)).toHaveLength(1);
  });

  it("marks opened-but-not-completed courses as in_progress", () => {
    const result = computeCourseStatuses(SLUGS, [], ["b"]);
    expect(result.find((r) => r.slug === "b")?.status).toBe("in_progress");
  });

  it("completed takes precedence over opened", () => {
    const result = computeCourseStatuses(SLUGS, ["b"], ["b"]);
    expect(result.find((r) => r.slug === "b")?.status).toBe("completed");
  });

  it("no start-here entry once everything is completed", () => {
    const result = computeCourseStatuses(SLUGS, SLUGS, []);
    expect(result.some((r) => r.isStartHere)).toBe(false);
  });
});
