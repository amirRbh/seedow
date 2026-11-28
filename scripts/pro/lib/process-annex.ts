/**
 * Traitement d'UNE annexe : texte page par page → extraction par le modèle →
 * vérification des citations. Sans base de données : partagé par l'ingestion
 * et par l'évaluation sur fixtures.
 */
import { createHash } from "node:crypto";
import { EXTRACTION_VERSION } from "../../../src/lib/pro/extraction/prompt";
import { extractionSchema, type Extraction } from "../../../src/lib/pro/extraction/schema";
import { verifyExtraction, type VerificationResult } from "../../../src/lib/pro/extraction/verify";
import type { CostBudget } from "../../../src/lib/pro/extraction/cost";
import { extractWithModel } from "./anthropic-extract";
import { pdfPagesText } from "./pdf-text";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertPdf(bytes: Uint8Array, label: string): void {
  const magic = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  if (!magic.startsWith("%PDF")) throw new Error(`${label} : ce n'est pas un PDF`);
}

/** Sortie brute du modèle, telle qu'on la met en cache pour rejouer la vérification. */
export interface CachedExtraction {
  sha256: string;
  extraction_version: string;
  model: string;
  extracted_at: string;
  usage: { input_tokens: number; output_tokens: number };
  /** Coût de l'appel, en dollars (absent des caches antérieurs). */
  cost_usd?: number;
  extraction: Extraction;
}

export interface ProcessedAnnex {
  sha256: string;
  pages: string[];
  cached: CachedExtraction;
  verification: VerificationResult;
}

export async function processAnnex(
  bytes: Uint8Array,
  opts: { label: string; cache?: CachedExtraction | null; budget?: CostBudget },
): Promise<ProcessedAnnex> {
  assertPdf(bytes, opts.label);
  const sha256 = sha256Hex(bytes);
  const pages = await pdfPagesText(bytes);

  let cached = opts.cache ?? null;
  if (cached && (cached.sha256 !== sha256 || cached.extraction_version !== EXTRACTION_VERSION)) {
    cached = null; // document ou prompt changé : on ré-extrait
  }
  if (!cached) {
    const r = await extractWithModel(bytes, { budget: opts.budget, pageCount: pages.length });
    cached = {
      sha256,
      extraction_version: EXTRACTION_VERSION,
      model: r.model,
      extracted_at: new Date().toISOString(),
      usage: { input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens },
      cost_usd: r.cost_usd,
      extraction: r.extraction,
    };
  } else {
    cached = { ...cached, extraction: extractionSchema.parse(cached.extraction) };
  }
  return { sha256, pages, cached, verification: verifyExtraction(cached.extraction, pages) };
}
