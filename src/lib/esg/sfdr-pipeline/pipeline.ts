/**
 * Orchestrateur du pipeline SFDR (§5) — assemble les briques génériques :
 *
 *   ISIN → DocumentResolver(s) → CandidateDocument → downloadAndExtract →
 *   extractSfdrEvidence → EvidenceValidator → PipelineResult
 *
 * Générique et injecté : les resolvers (GECO primaire, asset-manager en
 * fallback) et l'extracteur sont passés en dépendances → testable sans réseau,
 * et extensible SANS toucher le cœur (§5 « pas 20 scrapers »). Chaque échec est
 * catégorisé (§12) ; un succès porte sa preuve complète (§7).
 */

import { downloadAndExtract, type ExtractOutcome } from "./document-extractor";
import { extractSfdrEvidence, hasSfdrSignal, SFDR_PARSER_VERSION } from "./sfdr-parser";
import type {
  CandidateDocument,
  EsgObservation,
  FailureReason,
  PipelineResult,
  ResolvedFund,
  SourceTier,
  VerificationStatus,
} from "./types";

/** Un resolver = une source qui, pour un ISIN, liste des documents officiels. */
export interface DocumentResolver {
  sourceKey: string;
  sourceName: string;
  sourceTier: SourceTier;
  resolve(isin: string): Promise<ResolvedFund | null>;
}

export interface PipelineDeps {
  /** Resolvers ORDONNÉS par priorité (§2) : primaire d'abord. */
  resolvers: DocumentResolver[];
  /** Télécharge + extrait le texte d'un document (injecté ; défaut réel possible). */
  extract: (url: string) => Promise<ExtractOutcome>;
  now?: () => string;
  /** Nb max de documents essayés par fonds (courtoisie source §14/§16). Défaut 4. */
  maxDocsPerFund?: number;
}

/** Ordre de préférence des documents pour trouver le SFDR au moindre coût. */
const DOC_PRIORITY: Record<CandidateDocument["canonicalType"], number> = {
  kid: 0,
  sfdr: 1,
  dici: 2,
  prospectus: 3,
  factsheet: 4,
  annual_report: 5,
  other: 6,
};

function rankDocuments(docs: CandidateDocument[]): CandidateDocument[] {
  return [...docs].sort((a, b) => DOC_PRIORITY[a.canonicalType] - DOC_PRIORITY[b.canonicalType]);
}

/** PRIMARY + preuve extraite d'un document officiel ⇒ VERIFIED (§2, §10). */
function verificationFor(tier: SourceTier): VerificationStatus {
  return tier === "PRIMARY" ? "VERIFIED" : tier === "SECONDARY" ? "UNVERIFIED" : "UNKNOWN";
}

function fail(
  isin: string,
  reason: FailureReason,
  detail: string,
  trace: PipelineResult["trace"],
): PipelineResult {
  return { isin, ok: false, observation: null, failureReason: reason, detail, trace };
}

/**
 * Exécute le pipeline pour un ISIN. Ne lève jamais : renvoie soit une observation
 * traçable, soit un échec catégorisé (§12).
 */
export async function runSfdrForIsin(isin: string, deps: PipelineDeps): Promise<PipelineResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const maxDocs = deps.maxDocsPerFund ?? 4;
  const trace: PipelineResult["trace"] = {
    resolvedBy: null,
    documentsFound: 0,
    documentTried: null,
    textExtracted: false,
  };

  // ── 1) Résolution du fonds (resolvers ordonnés) ───────────────────────────
  let resolved: ResolvedFund | null = null;
  let anyResolved = false;
  let gecoTried = false;
  for (const r of deps.resolvers) {
    if (r.sourceKey === "amf_geco") gecoTried = true;
    let fund: ResolvedFund | null = null;
    try {
      fund = await r.resolve(isin);
    } catch {
      fund = null;
    }
    if (fund) {
      anyResolved = true;
      if (fund.documents.length > 0) {
        resolved = fund;
        trace.resolvedBy = r.sourceKey;
        break;
      }
    }
  }

  if (!resolved) {
    if (!anyResolved) {
      return gecoTried
        ? fail(
            isin,
            "NO_GECO_MATCH",
            "ISIN introuvable dans GECO (fonds probablement non FR)",
            trace,
          )
        : fail(isin, "ISSUER_NOT_RESOLVED", "aucun resolver n'a identifié le fonds", trace);
    }
    return fail(isin, "NO_DOCUMENT", "fonds résolu mais aucun document officiel listé", trace);
  }

  const docs = rankDocuments(resolved.documents).slice(0, maxDocs);
  trace.documentsFound = resolved.documents.length;

  // ── 2) Téléchargement + extraction + parsing SFDR, doc par doc ─────────────
  let sawText = false;
  let sawSignal = false;
  let lastBlocked: { httpStatus: number } | null = null;
  let sawNetwork = false;
  let sawParseFail = false;

  for (const doc of docs) {
    trace.documentTried = doc.url;
    const outcome = await deps.extract(doc.url);

    if (outcome.status === "blocked") {
      lastBlocked = { httpStatus: outcome.httpStatus };
      continue;
    }
    if (outcome.status === "network") {
      sawNetwork = true;
      continue;
    }
    if (outcome.status === "parse_failed") {
      sawParseFail = true;
      continue;
    }

    // outcome.status === "ok"
    sawText = true;
    trace.textExtracted = true;
    const text = outcome.doc.text;
    if (hasSfdrSignal(text)) sawSignal = true;

    const evidence = extractSfdrEvidence(text);
    if (evidence) {
      const observation: EsgObservation = {
        isin,
        metric: "sfdr_article",
        value: evidence.article,
        sourceTier: resolved.sourceTier,
        sourceKey: resolved.sourceKey,
        sourceName: resolved.sourceName,
        sourceUrl: resolved.sourceUrl,
        documentUrl: doc.url,
        documentDate: doc.documentDate,
        documentHash: outcome.doc.documentHash,
        retrievedAt: now(),
        evidenceText: evidence.evidenceText,
        regulationReference: evidence.regulationReference,
        confidence: evidence.confidence,
        verificationStatus: verificationFor(resolved.sourceTier),
        parserVersion: SFDR_PARSER_VERSION,
      };
      return { isin, ok: true, observation, failureReason: null, detail: null, trace };
    }
  }

  // ── 3) Aucun article affirmé : catégoriser l'échec (§12) ──────────────────
  if (sawText) {
    return sawSignal
      ? fail(
          isin,
          "AMBIGUOUS_SFDR",
          "SFDR mentionné mais aucun article unique affirmé/exploitable",
          trace,
        )
      : fail(isin, "NO_SFDR_MENTION", "document lu, aucune mention SFDR affirmée", trace);
  }
  if (lastBlocked)
    return lastBlocked.httpStatus === 429
      ? fail(isin, "RATE_LIMIT", "téléchargement throttlé (HTTP 429)", trace)
      : fail(
          isin,
          "DOCUMENT_BLOCKED",
          `téléchargement refusé (HTTP ${lastBlocked.httpStatus})`,
          trace,
        );
  if (sawNetwork)
    return fail(isin, "NETWORK_RESTRICTION", "document injoignable (réseau/egress)", trace);
  if (sawParseFail)
    return fail(isin, "PDF_PARSE_FAILED", "extraction texte impossible (PDF image ?)", trace);
  return fail(isin, "OTHER", "échec non catégorisé", trace);
}

export interface BatchOptions extends PipelineDeps {
  /** Pause entre ISIN (ms) — courtoisie source (§16). Défaut 300. */
  delayMs?: number;
  /** Callback progressif (rapport live). */
  onResult?: (r: PipelineResult, index: number, total: number) => void;
}

/** Exécute le pipeline sur une liste d'ISIN, séquentiellement et poliment. */
export async function runSfdrBatch(isins: string[], opts: BatchOptions): Promise<PipelineResult[]> {
  const delay = opts.delayMs ?? 300;
  const results: PipelineResult[] = [];
  for (let i = 0; i < isins.length; i++) {
    const r = await runSfdrForIsin(isins[i], opts);
    results.push(r);
    opts.onResult?.(r, i, isins.length);
    if (delay > 0 && i < isins.length - 1) await new Promise((res) => setTimeout(res, delay));
  }
  return results;
}
