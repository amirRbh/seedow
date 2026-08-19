import { describe, expect, it } from "vitest";
import {
  answersToParams,
  objectiveToRiskHorizon,
  loadDraft,
  saveDraft,
  clearDraft,
  isDraftExpired,
  DRAFT_KEY,
  DRAFT_MAX_AGE_MS,
  DEFAULT_AMOUNT,
  CAUSE_INTENSITY,
  applyRiskAppetite,
  rankedCauseIntensity,
  RISK_TARGET_MAX,
  type Answers,
  type DraftStorage,
  type OnboardingDraft,
} from "../params";

/** Fake Storage en mémoire pour tester la persistance en environnement Node. */
function fakeStorage(seed: Record<string, string> = {}): DraftStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("objectiveToRiskHorizon", () => {
  it("maps each objective to its risk/horizon", () => {
    expect(objectiveToRiskHorizon("retraite")).toEqual({ risk: 0.13, horizon: 25 });
    expect(objectiveToRiskHorizon("maison")).toEqual({ risk: 0.1, horizon: 8 });
    expect(objectiveToRiskHorizon("court")).toEqual({ risk: 0.06, horizon: 2 });
    expect(objectiveToRiskHorizon("epargne")).toEqual({ risk: 0.09, horizon: 10 });
  });
  it("falls back to the balanced profile for unknown/undefined", () => {
    expect(objectiveToRiskHorizon(undefined)).toEqual({ risk: 0.09, horizon: 10 });
    expect(objectiveToRiskHorizon("n'importe quoi")).toEqual({ risk: 0.09, horizon: 10 });
  });
});

describe("answersToParams", () => {
  it("returns safe defaults for empty answers", () => {
    const p = answersToParams({});
    expect(p.causes).toEqual([]);
    expect(p.exclusions).toEqual([]);
    expect(p.cause_intensity).toEqual({});
    expect(p.risk_target).toBe(0.09);
    expect(p.horizon_years).toBe(10);
    expect(p.initial_amount).toBe(DEFAULT_AMOUNT);
  });

  it("maps a full questionnaire faithfully", () => {
    const answers: Answers = {
      values: ["climat", "humain"],
      exclusions: ["fossiles", "armes"],
      objective: ["retraite"],
      amount: ["100"],
    };
    const p = answersToParams(answers);
    expect(p.causes).toEqual(["climat", "humain"]);
    expect(p.exclusions).toEqual(["fossiles", "armes"]);
    expect(p.cause_intensity).toEqual({ climat: CAUSE_INTENSITY, humain: CAUSE_INTENSITY });
    expect(p.risk_target).toBe(0.13);
    expect(p.horizon_years).toBe(25);
    expect(p.initial_amount).toBe(100);
  });

  it("caps causes and exclusions at 6", () => {
    const seven = ["a", "b", "c", "d", "e", "f", "g"];
    const p = answersToParams({ values: seven, exclusions: seven });
    expect(p.causes).toHaveLength(6);
    expect(p.exclusions).toHaveLength(6);
  });

  it("falls back to the default amount when the value is not numeric", () => {
    expect(answersToParams({ amount: ["abc"] }).initial_amount).toBe(DEFAULT_AMOUNT);
    expect(answersToParams({ amount: ["0"] }).initial_amount).toBe(DEFAULT_AMOUNT); // 0 → default
    expect(answersToParams({ amount: ["500"] }).initial_amount).toBe(500);
  });
});

describe("X2 — appétence au risque", () => {
  it("is a no-op when no risk appetite is answered (backward compatible)", () => {
    expect(answersToParams({ objective: ["retraite"] }).risk_target).toBe(0.13);
    expect(applyRiskAppetite(0.13, undefined)).toBe(0.13);
  });

  it("lowers risk for prudent, raises it for dynamique", () => {
    expect(applyRiskAppetite(0.13, "prudent")).toBeCloseTo(0.091, 6);
    expect(applyRiskAppetite(0.06, "dynamique")).toBeCloseTo(0.081, 6);
    const p = answersToParams({ objective: ["court"], risk: ["dynamique"] });
    expect(p.risk_target).toBeCloseTo(0.06 * 1.35, 9);
  });

  it("clamps the final risk target to the safe bounds", () => {
    expect(applyRiskAppetite(0.13, "dynamique")).toBeLessThanOrEqual(RISK_TARGET_MAX);
    expect(applyRiskAppetite(0.13, "dynamique")).toBe(RISK_TARGET_MAX); // 0.1755 → 0.16
  });
});

describe("X2 — intensité de cause relative", () => {
  it("keeps uniform intensity by default (rankedIntensity off)", () => {
    const p = answersToParams({ values: ["climat", "humain"] });
    expect(p.cause_intensity).toEqual({ climat: CAUSE_INTENSITY, humain: CAUSE_INTENSITY });
  });

  it("ranks intensity by selection order when enabled", () => {
    const ri = rankedCauseIntensity(["climat", "humain", "tech"]);
    expect(ri.climat).toBeCloseTo(0.9, 9);
    expect(ri.humain).toBeCloseTo(0.78, 9);
    expect(ri.tech).toBeCloseTo(0.66, 9);
    const p = answersToParams({ values: ["climat", "humain"] }, { rankedIntensity: true });
    expect(p.cause_intensity.climat).toBeCloseTo(0.9, 9);
    expect(p.cause_intensity.humain).toBeCloseTo(0.78, 9);
  });

  it("never drops below the floor for long priority lists", () => {
    const ri = rankedCauseIntensity(["climat", "humain", "tech", "egalite", "biodiversite", "circulaire"]);
    for (const v of Object.values(ri)) expect(v).toBeGreaterThanOrEqual(0.45);
  });
});

describe("isDraftExpired", () => {
  it("is true only past the max age", () => {
    expect(isDraftExpired(1000, 1000 + DRAFT_MAX_AGE_MS - 1)).toBe(false);
    expect(isDraftExpired(1000, 1000 + DRAFT_MAX_AGE_MS + 1)).toBe(true);
    expect(isDraftExpired(undefined, 999999)).toBe(false); // no timestamp → not expired
  });
});

describe("draft persistence", () => {
  const draft: OnboardingDraft = {
    phase: "preview",
    stepIndex: 2,
    answers: { values: ["climat"] },
    portfolioName: "Mon PF",
    isAdditive: false,
  };

  it("round-trips a draft for the same context", () => {
    const s = fakeStorage();
    saveDraft(draft, 1_000, s);
    expect(loadDraft(false, 1_500, s)).toEqual(draft);
  });

  it("does NOT restore a draft from the other context (additive mismatch)", () => {
    const s = fakeStorage();
    saveDraft(draft, 1_000, s); // isAdditive:false
    expect(loadDraft(true, 1_500, s)).toBeNull();
  });

  it("purges and returns null when the draft is expired", () => {
    const s = fakeStorage();
    saveDraft(draft, 1_000, s);
    expect(loadDraft(false, 1_000 + DRAFT_MAX_AGE_MS + 1, s)).toBeNull();
    expect(s.map.has(DRAFT_KEY)).toBe(false); // purgé
  });

  it("returns null for corrupt JSON without throwing", () => {
    const s = fakeStorage({ [DRAFT_KEY]: "{not json" });
    expect(loadDraft(false, 1_000, s)).toBeNull();
  });

  it("returns null when there is no draft", () => {
    expect(loadDraft(false, 1_000, fakeStorage())).toBeNull();
  });

  it("degrades safely when storage is unavailable (no throw)", () => {
    expect(loadDraft(false, 1_000, null)).toBeNull();
    expect(() => saveDraft(draft, 1_000, null)).not.toThrow();
    expect(() => clearDraft(null)).not.toThrow();
  });

  it("fills missing fields with safe defaults", () => {
    const s = fakeStorage({
      [DRAFT_KEY]: JSON.stringify({ phase: "steps", isAdditive: false, savedAt: 1_000 }),
    });
    expect(loadDraft(false, 1_100, s)).toEqual({
      phase: "steps",
      stepIndex: 0,
      answers: {},
      portfolioName: "",
      isAdditive: false,
    });
  });
});
