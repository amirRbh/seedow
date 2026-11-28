/**
 * Garde-fous de l'appel d'extraction, sans réseau : un faux client remplace le SDK.
 */
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  ExtractionError,
  FatalExtractionError,
  MAX_PDF_PAGES,
  classifyApiError,
  extractWithModel,
  extractionClient,
} from "../../../../../scripts/pro/lib/anthropic-extract";
import { CostBudget } from "../cost";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function fakeClient(response: Record<string, unknown>, inputTokens = 10_000) {
  const calls = { count: 0, stream: 0 };
  const client = {
    messages: {
      countTokens: async () => {
        calls.count++;
        return { input_tokens: inputTokens };
      },
    },
    beta: {
      messages: {
        stream: () => {
          calls.stream++;
          return { finalMessage: async () => response };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const usage = { input_tokens: 10_000, output_tokens: 2_000 };
const ok = (text: string, extra: Record<string, unknown> = {}) => ({
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  stop_details: null,
  usage,
  content: [{ type: "text", text }],
  ...extra,
});

describe("appel d'extraction", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  });

  it("sans clé : erreur de run, pas de document", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => extractionClient()).toThrow(FatalExtractionError);
  });

  it("refuse avant l'appel un document au-delà de la limite de pages", async () => {
    const { client, calls } = fakeClient(ok("{}"));
    await expect(
      extractWithModel(PDF, { client, pageCount: MAX_PDF_PAGES + 1 }),
    ).rejects.toBeInstanceOf(ExtractionError);
    expect(calls.stream).toBe(0);
  });

  it("n'appelle pas le modèle si le plafond ne le permet pas", async () => {
    const { client, calls } = fakeClient(ok("{}"), 200_000);
    const budget = new CostBudget(0.5); // 200k × 4 $ + 32k × 20 $ ≈ 1,44 $
    await expect(extractWithModel(PDF, { client, budget })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(calls.count).toBe(1);
    expect(calls.stream).toBe(0);
    expect(budget.spentUsd).toBe(0);
  });

  it("impute le coût d'un refus et le signale comme erreur de document", async () => {
    const { client } = fakeClient(
      ok("", { stop_reason: "refusal", stop_details: { category: "cyber" } }),
    );
    const budget = new CostBudget(10);
    await expect(extractWithModel(PDF, { client, budget })).rejects.toThrow(/refus du modèle/);
    expect(budget.spentUsd).toBeGreaterThan(0);
  });

  it("signale une réponse tronquée ou hors schéma", async () => {
    await expect(
      extractWithModel(PDF, { client: fakeClient(ok("{}", { stop_reason: "max_tokens" })).client }),
    ).rejects.toThrow(/tronquée/);
    await expect(
      extractWithModel(PDF, { client: fakeClient(ok("pas du json")).client }),
    ).rejects.toThrow(/non JSON/);
    await expect(
      extractWithModel(PDF, { client: fakeClient(ok('{"language":"fr"}')).client }),
    ).rejects.toThrow(/hors schéma/);
  });

  it("classe les erreurs du SDK : compte → arrêt du run, requête → document", () => {
    const make = <T extends object>(C: { prototype: T }, props: Record<string, unknown> = {}) =>
      Object.assign(Object.create(C.prototype) as T, { message: "x", ...props });
    expect(classifyApiError(make(Anthropic.AuthenticationError))).toBeInstanceOf(
      FatalExtractionError,
    );
    expect(classifyApiError(make(Anthropic.PermissionDeniedError))).toBeInstanceOf(
      FatalExtractionError,
    );
    expect(classifyApiError(make(Anthropic.NotFoundError))).toBeInstanceOf(FatalExtractionError);
    expect(classifyApiError(make(Anthropic.RateLimitError))).toBeInstanceOf(FatalExtractionError);
    const bad = classifyApiError(make(Anthropic.BadRequestError));
    expect(bad).toBeInstanceOf(ExtractionError);
    expect(bad).not.toBeInstanceOf(FatalExtractionError);
    expect(classifyApiError(make(Anthropic.InternalServerError, { status: 500 }))).toBeInstanceOf(
      ExtractionError,
    );
    expect(classifyApiError(make(Anthropic.APIConnectionError))).toBeInstanceOf(ExtractionError);
  });
});
