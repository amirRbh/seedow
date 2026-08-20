/**
 * DocumentDownloader + DocumentExtractor (§5) : télécharge un document officiel
 * et en extrait le texte, avec CACHE par URL/empreinte (§14) — on ne retélécharge
 * jamais deux fois le même document. Le backend PDF (`pdfToText`) est INJECTÉ :
 * la lib reste légère et testable ; le script POC câble `unpdf` (pur JS, pas de
 * binaire natif).
 *
 * Résultat DISCRIMINÉ (§12) : on distingue « bloqué » (403/anti-bot), « échec de
 * parsing », « injoignable réseau » et « ok » — jamais un simple null opaque.
 */

import type { ExtractedDocument } from "./types";

/** Backend d'extraction PDF → texte, injecté (ex. unpdf). */
export type PdfToText = (bytes: Uint8Array) => Promise<{ text: string; pages: number | null }>;

/** Empreinte hex du binaire (clé de cache / détection de changement §14, §15). */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  // Copie dans un ArrayBuffer « propre » (évite l'incompat SharedArrayBuffer de la
  // signature BufferSource, et neutralise un éventuel byteOffset).
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ExtractOutcome =
  | { status: "ok"; doc: ExtractedDocument }
  | { status: "blocked"; httpStatus: number }
  | { status: "parse_failed"; reason: string }
  | { status: "network"; reason: string };

/** Cache minimal (in-memory ou adossé à `fund_documents`). */
export interface DocumentCache {
  get(url: string): Promise<ExtractedDocument | null>;
  set(doc: ExtractedDocument): Promise<void>;
}

/** Cache mémoire par défaut (une passe de POC). */
export class MemoryDocumentCache implements DocumentCache {
  private readonly store = new Map<string, ExtractedDocument>();
  async get(url: string): Promise<ExtractedDocument | null> {
    return this.store.get(url) ?? null;
  }
  async set(doc: ExtractedDocument): Promise<void> {
    this.store.set(doc.url, doc);
  }
}

const PDF_MAGIC = "%PDF";

export interface ExtractorDeps {
  fetchImpl?: typeof fetch;
  pdfToText: PdfToText;
  cache?: DocumentCache;
  /** Header User-Agent (courtoisie, jamais de contournement anti-bot §16). */
  userAgent?: string;
  now?: () => string;
}

/**
 * Télécharge `url` et renvoie le texte extrait, ou un échec catégorisé. Ne lève
 * jamais. Respecte les protections : un 403/429 → « blocked »/rate-limit signalé,
 * jamais de retry agressif ni de contournement.
 */
export async function downloadAndExtract(
  url: string,
  deps: ExtractorDeps,
): Promise<ExtractOutcome> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cache = deps.cache;
  const now = deps.now ?? (() => new Date().toISOString());

  const cached = await cache?.get(url);
  if (cached) return { status: "ok", doc: cached };

  let resp: Response;
  try {
    resp = await fetchImpl(url, {
      headers: {
        "User-Agent": deps.userAgent ?? "SeedowBot/1.0 (+https://seedow.app)",
        Accept: "application/pdf,*/*",
      },
      redirect: "follow",
    });
  } catch (e) {
    return { status: "network", reason: e instanceof Error ? e.message : String(e) };
  }

  if (resp.status === 429) return { status: "blocked", httpStatus: 429 };
  if (resp.status === 403 || resp.status === 401)
    return { status: "blocked", httpStatus: resp.status };
  if (!resp.ok) return { status: "network", reason: `HTTP ${resp.status}` };

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    return { status: "network", reason: e instanceof Error ? e.message : String(e) };
  }

  // Doit être un PDF : un HTML d'erreur/consentement renvoyé en 200 n'est pas un doc.
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 8));
  if (!head.startsWith(PDF_MAGIC)) {
    return { status: "parse_failed", reason: `contenu non-PDF (préfixe « ${head.trim()} »)` };
  }

  // Empreinte AVANT extraction : certains backends PDF (pdf.js/unpdf) prennent
  // possession du Uint8Array et DÉTACHENT son ArrayBuffer — après quoi tout
  // accès à `bytes` (dont le hash) lève « Receiver is detached ». On hashe donc
  // pendant que le buffer est encore vivant.
  const documentHash = await hashBytes(bytes);

  let extracted: { text: string; pages: number | null };
  try {
    extracted = await deps.pdfToText(bytes);
  } catch (e) {
    return { status: "parse_failed", reason: e instanceof Error ? e.message : String(e) };
  }
  if (!extracted.text || extracted.text.trim().length < 40) {
    return { status: "parse_failed", reason: "texte extrait vide (PDF image/scanné ?)" };
  }

  const doc: ExtractedDocument = {
    url,
    text: extracted.text,
    documentHash,
    pageCount: extracted.pages,
    retrievedAt: now(),
  };
  await cache?.set(doc);
  return { status: "ok", doc };
}
