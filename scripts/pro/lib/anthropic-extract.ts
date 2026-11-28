/**
 * Appel du modèle d'extraction : le PDF part en bloc `document`, la réponse est
 * contrainte par le JSON Schema (`output_config.format`), puis revalidée par zod.
 *
 * Script hors ligne (poste de travail ou GitHub Actions) — jamais importé par le
 * Worker ni par le navigateur (verrouillé par `secrets-boundary.test.ts`).
 * Clé : variable d'environnement ANTHROPIC_API_KEY, jamais dans le repo.
 *
 * Modèle : env `EXTRACTION_MODEL` (défaut `claude-opus-5-5`). Le modèle qui a
 * réellement servi la réponse (`response.model`) est celui qu'on archive : en
 * cas de refus, le repli serveur (`fallbacks: "default"`) peut en changer.
 *
 * Garde-fous :
 *   - erreurs typées : une erreur de compte (clé invalide, droits, modèle
 *     inconnu) arrête tout le run (`FatalExtractionError`) ; une erreur propre au
 *     document (PDF refusé, réponse hors schéma) n'arrête que ce document ;
 *   - limites de l'API : le SDK réessaie 408/409/429/5xx avec attente
 *     exponentielle (`maxRetries`), et respecte `retry-after` ;
 *   - coût : avant l'appel, les tokens d'entrée sont comptés (gratuit) et
 *     l'appel n'est lancé que si le plafond du run (`CostBudget`) le permet ;
 *   - taille : au-delà de MAX_PDF_PAGES pages, le document est refusé — une
 *     annexe SFDR fait quelques pages, un prospectus entier n'a rien à faire ici.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CostBudget, costUsd, formatUsd } from "../../../src/lib/pro/extraction/cost";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
} from "../../../src/lib/pro/extraction/prompt";
import {
  extractionJsonSchema,
  extractionSchema,
  type Extraction,
} from "../../../src/lib/pro/extraction/schema";

export const DEFAULT_EXTRACTION_MODEL = "claude-opus-5-5";
export const MAX_OUTPUT_TOKENS = 32000;
export const MAX_PDF_PAGES = 60;
/** 32 Mo par requête : base64 grossit de 4/3, on garde une marge. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export interface ModelExtraction {
  extraction: Extraction;
  /** Modèle ayant servi la réponse. */
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
  cost_usd: number;
}

/** Erreur propre à un document : le run continue avec les suivants. */
export class ExtractionError extends Error {}
/** Erreur de compte ou de configuration : inutile de continuer le run. */
export class FatalExtractionError extends Error {}
/** Plafond de dépense atteint : le run s'arrête proprement. */
export class BudgetExceededError extends FatalExtractionError {}

export function extractionModel(): string {
  return process.env.EXTRACTION_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL;
}

/** Plafond du run : env EXTRACTION_MAX_COST_USD, 10 $ par défaut. */
export function runBudget(): CostBudget {
  const raw = process.env.EXTRACTION_MAX_COST_USD?.trim();
  return new CostBudget(raw ? Number(raw) : 10);
}

let sharedClient: Anthropic | null = null;
export function extractionClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new FatalExtractionError(
      "ANTHROPIC_API_KEY absente : définir la variable d'environnement (secret GitHub Actions ou shell local), jamais dans le repo.",
    );
  }
  sharedClient ??= new Anthropic({ maxRetries: 4, timeout: 15 * 60 * 1000 });
  return sharedClient;
}

/** Traduit une erreur du SDK en erreur de document ou de run. */
export function classifyApiError(e: unknown): Error {
  if (e instanceof ExtractionError || e instanceof FatalExtractionError) return e;
  if (e instanceof Anthropic.AuthenticationError) {
    return new FatalExtractionError("clé API refusée (401) : vérifier ANTHROPIC_API_KEY");
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new FatalExtractionError("accès refusé (403) : droits du compte ou du modèle");
  }
  if (e instanceof Anthropic.NotFoundError) {
    return new FatalExtractionError(`modèle introuvable (404) : ${extractionModel()}`);
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new FatalExtractionError(
      "limite de débit atteinte malgré les nouvelles tentatives (429) : relancer plus tard",
    );
  }
  if (e instanceof Anthropic.BadRequestError) {
    return new ExtractionError(`requête refusée (400) : ${e.message}`);
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new ExtractionError(`connexion à l'API impossible : ${e.message}`);
  }
  if (e instanceof Anthropic.APIError) {
    return new ExtractionError(`erreur API ${e.status ?? "?"} : ${e.message}`);
  }
  return e instanceof Error ? e : new Error(String(e));
}

function documentMessage(pdf: Uint8Array): Anthropic.MessageParam {
  return {
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
  };
}

export async function extractWithModel(
  pdf: Uint8Array,
  opts: { client?: Anthropic; model?: string; budget?: CostBudget; pageCount?: number } = {},
): Promise<ModelExtraction> {
  if (pdf.byteLength > MAX_PDF_BYTES) {
    throw new ExtractionError(`PDF trop volumineux (${Math.round(pdf.byteLength / 1e6)} Mo)`);
  }
  if (opts.pageCount !== undefined && opts.pageCount > MAX_PDF_PAGES) {
    throw new ExtractionError(
      `${opts.pageCount} pages : au-delà de ${MAX_PDF_PAGES}, ce n'est pas une annexe seule (isoler l'annexe du prospectus)`,
    );
  }
  const client = opts.client ?? extractionClient();
  const model = opts.model ?? extractionModel();
  const message = documentMessage(pdf);

  try {
    if (opts.budget) {
      const counted = await client.messages.countTokens({
        model,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [message],
      });
      const estimate = opts.budget.estimate(model, counted.input_tokens, MAX_OUTPUT_TOKENS);
      if (!opts.budget.canAfford(estimate)) {
        throw new BudgetExceededError(
          `plafond atteint : ${formatUsd(opts.budget.spentUsd)} dépensés sur ${formatUsd(opts.budget.limitUsd)}, ` +
            `cet appel peut coûter jusqu'à ${formatUsd(estimate)}`,
        );
      }
    }

    const stream = client.beta.messages.stream({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: EXTRACTION_SYSTEM_PROMPT,
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: extractionJsonSchema },
      },
      messages: [message],
    });
    const response = await stream.finalMessage();

    const usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
    };
    // Imputé avant toute vérification : un refus ou une réponse tronquée est facturé.
    const cost_usd = opts.budget
      ? opts.budget.record(response.model, usage)
      : costUsd(response.model, usage);

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
    return { extraction: parsed.data, model: response.model, usage, cost_usd };
  } catch (e) {
    throw classifyApiError(e);
  }
}
