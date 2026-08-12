import { describe, expect, it } from "vitest";
import { needsReview, publishableObservations, runConnector } from "../engine";
import type { Connector, Observation, RawData } from "../connectors/types";
import type { SourceDefinition } from "../sources/registry";

const DEF = { key: "test_source", priority: 1 } as unknown as SourceDefinition;

function makeObs(field: string, status: Observation["validation"]["status"]): Observation {
  return {
    field,
    value: 1,
    sourceKey: "test_source",
    sourceUrl: "http://x",
    referenceDate: "2026-07-31",
    retrievedAt: "2026-08-12T00:00:00Z",
    confidence: "high",
    method: "test",
    validation: { status, reason: null },
  };
}

class FakeConnector implements Connector {
  definition = DEF;
  constructor(
    private raw: RawData | null,
    private obs: Observation[] = [],
    private throwOnExtract = false,
  ) {}
  async fetch() {
    return this.raw;
  }
  extract(): Observation[] {
    if (this.throwOnExtract) throw new Error("boom");
    return this.obs;
  }
}

const RAW: RawData = {
  sourceKey: "test_source",
  sourceUrl: "http://x",
  content: "x",
  contentType: "pdf_text",
  retrievedAt: "2026-08-12T00:00:00Z",
};

describe("engine.runConnector", () => {
  it("collecte les observations et horodate", async () => {
    const obs = [makeObs("ter", "valid")];
    const r = await runConnector(
      new FakeConnector(RAW, obs),
      "IE00B4L5Y983",
      () => "2026-08-12T10:00:00Z",
    );
    expect(r.observations).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
    expect(r.startedAt).toBe("2026-08-12T10:00:00Z");
    expect(r.finishedAt).toBe("2026-08-12T10:00:00Z");
  });

  it("source indisponible → erreur, pas d'exception (§17)", async () => {
    const r = await runConnector(new FakeConnector(null), "X");
    expect(r.observations).toHaveLength(0);
    expect(r.errors[0]).toMatch(/fetch/);
  });

  it("extract qui lève est capturé", async () => {
    const r = await runConnector(new FakeConnector(RAW, [], true), "X");
    expect(r.errors[0]).toMatch(/extract: boom/);
  });

  it("aucune observation extraite → signalé", async () => {
    const r = await runConnector(new FakeConnector(RAW, []), "X");
    expect(r.errors[0]).toMatch(/aucune observation/);
  });
});

describe("engine filtres de publication", () => {
  const obs = [makeObs("a", "valid"), makeObs("b", "review_required"), makeObs("c", "rejected")];
  it("publishable exclut les rejetées", () => {
    expect(publishableObservations(obs).map((o) => o.field)).toEqual(["a", "b"]);
  });
  it("needsReview isole les review_required", () => {
    expect(needsReview(obs).map((o) => o.field)).toEqual(["b"]);
  });
});
