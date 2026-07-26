import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { READING_KEY, getReadingState, markCourseOpened, hasStartedCourses } from "../reading";

// Environnement de test `node` : stub minimal de window.localStorage en mémoire.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const hadWindow = "window" in globalThis;

describe("course reading tracking", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { localStorage: makeStorage() };
  });
  afterAll(() => {
    if (!hadWindow) delete (globalThis as { window?: unknown }).window;
  });

  it("starts empty", () => {
    expect(getReadingState().opened).toEqual([]);
    expect(hasStartedCourses()).toBe(false);
  });

  it("records opened courses in first-open order and tracks the resume point", () => {
    markCourseOpened("a");
    markCourseOpened("b");
    const s = getReadingState();
    expect(s.opened).toEqual(["a", "b"]);
    expect(s.lastOpened).toBe("b");
    expect(hasStartedCourses()).toBe(true);
  });

  it("does not duplicate a re-opened course but updates the resume point", () => {
    markCourseOpened("a");
    markCourseOpened("b");
    markCourseOpened("a");
    const s = getReadingState();
    expect(s.opened).toEqual(["a", "b"]);
    expect(s.lastOpened).toBe("a");
  });

  it("ignores empty slugs", () => {
    markCourseOpened("");
    expect(getReadingState().opened).toEqual([]);
  });

  it("returns empty state on malformed storage", () => {
    window.localStorage.setItem(READING_KEY, "{bad json");
    expect(getReadingState().opened).toEqual([]);
  });
});
