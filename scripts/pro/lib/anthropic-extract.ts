/**
 * Appel du modèle d'extraction : le PDF part en bloc `document`, la réponse est
 * contrainte par le JSON Schema (`output_config.format`), puis revalidée par zod.
 *
 * Modèle : env `EXTRACTION_MODEL` (défaut `claude-sonnet-5-5`). Le modèle qui a
 * réellement servi la réponse (`response.model`) est celui qu'on archive : en
 * cas de refus, le repli serveur (`fallbacks: "default"`) peut en changer.
 *
 * Script local — jamais importé par le Worker. Clé via ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
} from "../../../src/lib/pro/extraction/prompt.v1";
import {
  extractionJsonSchema,
  extractionSchema,
  type Extraction,
} from "../../../src/lib/pro/extraction/schema";

export const DEFAULT_EXTRACTION_MODEL = "claude-sonnet-5-5";

export interface ModelExtraction {
  extraction: Extraction;
  /** Modèle ayant servi la réponse. */
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class ExtractionError extends Error {}

export async function extractWithModel(
  pdf: Uint8Array,
  opts: { client?: Anthropic; model?: string } = {},
): Promise<ModelExtraction> {
  const client = opts.client ?? new Anthropic();
  const model = opts.model ?? process.env.EXTRACTION_MODEL ?? DEFAULT_EXTRACTION_MODEL;

  const stream = client.beta.messages.stream({
    model,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: EXTRACTION_SYSTEM_PROMPT,
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: extractionJsonSchema },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: Buffer.from(pdf).toString("base64"),
            },
          },
          { type: "text", text: EXTRACTION_USER_PROMPT },
        ],
      },
    ],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new ExtractionError(
      `refus du modèle (${response.stop_details?.category ?? "sans catégorie"})`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError("réponse tronquée (max_tokens atteint)");
  }
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ExtractionError("réponse non JSON");
  }
  const parsed = extractionSchema.safeParse(json);
  if (!parsed.success) {
    throw new ExtractionError(`réponse hors schéma : ${parsed.error.issues[0]?.message}`);
  }
  return {
    extraction: parsed.data,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
