/**
 * Downloader HTTP réel pour le Data Engine (server-only) — le maillon qui manque
 * pour que les connecteurs (dont le `fetch` est injecté) ingèrent VRAIMENT des
 * sources JSON/texte officielles (ex. API open data, endpoint régulateur).
 *
 * Contrat §17 (ne jamais casser) : toute erreur réseau/HTTP → `null`, jamais
 * d'exception propagée ni de donnée fabriquée. Garde-fous : timeout, plafond de
 * taille. Les documents PDF ne sont PAS gérés ici (extraction texte = service
 * dédié hors runtime edge) — ce downloader couvre JSON, texte, CSV, XML, HTML.
 */

import type { RawData } from "./connectors/types";

export type DownloadKind = "json" | "text" | "csv" | "xml" | "html";

const KIND_TO_CONTENT_TYPE: Record<DownloadKind, RawData["contentType"]> = {
  json: "json",
  text: "html", // texte brut assimilé au canal "html" (contenu non structuré)
  csv: "csv",
  xml: "xml",
  html: "html",
};

export interface DownloadOptions {
  kind?: DownloadKind;
  /** Délai max avant abandon (ms). */
  timeoutMs?: number;
  /** Taille max acceptée (octets) — au-delà, on abandonne (null). */
  maxBytes?: number;
  /** Horloge injectable pour les tests. */
  now?: () => string;
  /** `fetch` injectable (tests) ; défaut = global. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 5_000_000; // 5 Mo : large pour un doc, borne les abus

/**
 * Télécharge une URL en `RawData`, ou `null` si indisponible/illisible/trop gros.
 * Ne lève jamais.
 */
export async function httpDownload(
  sourceKey: string,
  url: string,
  opts: DownloadOptions = {},
): Promise<RawData | null> {
  const kind = opts.kind ?? "json";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date().toISOString());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await doFetch(url, {
      signal: controller.signal,
      headers: { Accept: kind === "json" ? "application/json" : "text/plain,*/*" },
    });
    if (!resp.ok) return null;

    const content = await resp.text();
    // Plafond de taille (approx octets via longueur UTF-16 bytes) : garde-fou.
    if (content.length > maxBytes) return null;
    if (content.trim().length === 0) return null;

    return {
      sourceKey,
      sourceUrl: url,
      content,
      contentType: KIND_TO_CONTENT_TYPE[kind],
      retrievedAt: now(),
    };
  } catch {
    // Réseau/timeout/abort → null (§17), l'appelant journalise l'échec.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
