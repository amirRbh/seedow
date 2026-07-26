import { describe, it, expect } from "vitest";
import { recommendCourseSlugs } from "../recommend";
import { getCourse } from "@/content/courses";

const CAUSES = ["climat", "biodiversite", "humain", "egalite", "tech", "circulaire"];

describe("recommendCourseSlugs", () => {
  it("returns 2 real courses for each known cause", () => {
    for (const cause of CAUSES) {
      const slugs = recommendCourseSlugs(cause);
      expect(slugs, cause).toHaveLength(2);
      for (const slug of slugs) {
        expect(getCourse(slug), `${cause} → ${slug}`).toBeTruthy();
      }
    }
  });

  it("falls back to a resolving default for unknown/absent causes", () => {
    for (const cause of [undefined, null, "unknown-cause"]) {
      const slugs = recommendCourseSlugs(cause);
      expect(slugs).toHaveLength(2);
      for (const slug of slugs) expect(getCourse(slug)).toBeTruthy();
    }
  });
});
