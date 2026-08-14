import { describe, expect, it } from "vitest";
import { trimHistory, MAX_HISTORY_MESSAGES, type EthiMessage } from "../cost";

function convo(n: number): EthiMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `m${i}`,
  }));
}

describe("trimHistory", () => {
  it("garde les N derniers messages (recency)", () => {
    const kept = trimHistory(convo(30), 12);
    expect(kept).toHaveLength(12);
    expect(kept[0].content).toBe("m18"); // 30 - 12
    expect(kept[11].content).toBe("m29"); // dernier
  });

  it("renvoie tel quel si déjà assez court", () => {
    const c = convo(5);
    expect(trimHistory(c, 12)).toEqual(c);
  });

  it("ne mute pas l'entrée", () => {
    const c = convo(20);
    const snap = JSON.stringify(c);
    trimHistory(c, 12);
    expect(JSON.stringify(c)).toBe(snap);
  });

  it("max <= 0 → historique vide (garde-fou)", () => {
    expect(trimHistory(convo(5), 0)).toEqual([]);
  });

  it("utilise le défaut MAX_HISTORY_MESSAGES", () => {
    expect(trimHistory(convo(100))).toHaveLength(MAX_HISTORY_MESSAGES);
  });
});
