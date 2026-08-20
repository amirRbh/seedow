import { describe, expect, it } from "vitest";
import { runSfdrForIsin, type DocumentResolver, type PipelineDeps } from "../pipeline";
import type { ExtractOutcome } from "../document-extractor";
import type { CandidateDocument, ExtractedDocument, ResolvedFund } from "../types";

const ISIN = "IE00B4L5Y983";

function doc(
  url: string,
  canonicalType: CandidateDocument["canonicalType"] = "kid",
): CandidateDocument {
  return {
    docType: canonicalType.toUpperCase(),
    canonicalType,
    url,
    documentDate: "2026-05-01",
    language: "en",
  };
}

function gecoFund(documents: CandidateDocument[]): ResolvedFund {
  return {
    sourceKey: "amf_geco",
    sourceName: "AMF — base GECO",
    sourceTier: "PRIMARY",
    sourceUrl: "https://geco.amf-france.org/…",
    fundName: "Test Fund",
    managementCompany: "Test AM",
    documents,
  };
}

/** Resolver factice renvoyant un fonds fixe (ou null). */
function fakeResolver(fund: ResolvedFund | null, sourceKey = "amf_geco"): DocumentResolver {
  return {
    sourceKey,
    sourceName: "fake",
    sourceTier: "PRIMARY",
    resolve: async () => fund,
  };
}

function okText(text: string): ExtractOutcome {
  const d: ExtractedDocument = {
    url: "u",
    text,
    documentHash: "hash123",
    pageCount: 3,
    retrievedAt: "2026-08-20T00:00:00Z",
  };
  return { status: "ok", doc: d };
}

function deps(resolver: DocumentResolver, extract: PipelineDeps["extract"]): PipelineDeps {
  return { resolvers: [resolver], extract, now: () => "2026-08-20T00:00:00Z" };
}

describe("runSfdrForIsin — succès", () => {
  it("GECO + KID Article 8 → observation PRIMARY/VERIFIED avec preuve", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () =>
      okText("The Fund is classified as an Article 8 product under Regulation (EU) 2019/2088."),
    );
    const r = await runSfdrForIsin(ISIN, d);
    expect(r.ok).toBe(true);
    expect(r.observation?.value).toBe(8);
    expect(r.observation?.sourceTier).toBe("PRIMARY");
    expect(r.observation?.verificationStatus).toBe("VERIFIED");
    expect(r.observation?.evidenceText).toContain("Article 8");
    expect(r.observation?.documentHash).toBe("hash123");
    expect(r.observation?.parserVersion).toBeGreaterThanOrEqual(1);
    expect(r.observation?.documentDate).toBe("2026-05-01");
  });

  it("essaie le KID avant le prospectus (ordre de préférence)", async () => {
    const tried: string[] = [];
    const d = deps(
      fakeResolver(
        gecoFund([doc("http://x/prosp.pdf", "prospectus"), doc("http://x/kid.pdf", "kid")]),
      ),
      async (url) => {
        tried.push(url);
        return okText("The Fund is classified as an Article 9 product.");
      },
    );
    const r = await runSfdrForIsin(ISIN, d);
    expect(r.ok).toBe(true);
    expect(tried[0]).toContain("kid"); // KID d'abord
    expect(r.observation?.value).toBe(9);
  });
});

describe("runSfdrForIsin — échecs catégorisés (§12)", () => {
  it("ISIN inconnu de GECO → NO_GECO_MATCH", async () => {
    const r = await runSfdrForIsin(
      ISIN,
      deps(fakeResolver(null), async () => okText("x")),
    );
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe("NO_GECO_MATCH");
  });

  it("fonds résolu mais 0 document → NO_DOCUMENT", async () => {
    const r = await runSfdrForIsin(
      ISIN,
      deps(fakeResolver(gecoFund([])), async () => okText("x")),
    );
    expect(r.failureReason).toBe("NO_DOCUMENT");
  });

  it("document 403 → DOCUMENT_BLOCKED", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () => ({
      status: "blocked",
      httpStatus: 403,
    }));
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("DOCUMENT_BLOCKED");
  });

  it("document 429 → RATE_LIMIT", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () => ({
      status: "blocked",
      httpStatus: 429,
    }));
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("RATE_LIMIT");
  });

  it("PDF illisible → PDF_PARSE_FAILED", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () => ({
      status: "parse_failed",
      reason: "image",
    }));
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("PDF_PARSE_FAILED");
  });

  it("egress bloqué → NETWORK_RESTRICTION", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () => ({
      status: "network",
      reason: "ECONNREFUSED",
    }));
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("NETWORK_RESTRICTION");
  });

  it("texte lu, aucune mention SFDR → NO_SFDR_MENTION", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () =>
      okText("This fund tracks a broad global equity index. No sustainability info here."),
    );
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("NO_SFDR_MENTION");
  });

  it("SFDR mentionné mais deux articles affirmés → AMBIGUOUS_SFDR", async () => {
    const d = deps(fakeResolver(gecoFund([doc("http://x/kid.pdf")])), async () =>
      okText(
        [
          "The Fund is classified as an Article 8 product.",
          "The Fund is classified as an Article 9 product.",
          "See Article 8 of Regulation (EU) 2019/2088 and Article 9 of Regulation (EU) 2019/2088.",
        ].join("\n"),
      ),
    );
    expect((await runSfdrForIsin(ISIN, d)).failureReason).toBe("AMBIGUOUS_SFDR");
  });

  it("resolver non-GECO qui échoue → ISSUER_NOT_RESOLVED", async () => {
    const r = await runSfdrForIsin(
      ISIN,
      deps(fakeResolver(null, "issuer_generic"), async () => okText("x")),
    );
    expect(r.failureReason).toBe("ISSUER_NOT_RESOLVED");
  });
});
