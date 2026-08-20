/**
 * POC ESG/SFDR — mesure la COUVERTURE réelle du pipeline officiel (§3, §11-13).
 *
 *   ISIN → GECO (source primaire AMF) → document officiel → extraction PDF →
 *   parser SFDR → preuve → confiance → (persistance opt-in) → rapport
 *
 * Ce script NE transforme PAS le catalogue (§19 « pas de big bang ») : il
 * sélectionne un échantillon représentatif d'ETF, exécute le pipeline en
 * lecture, et PRODUIT UN RAPPORT MESURÉ (couverture officielle, taxonomie
 * d'échecs §12). La persistance (data_observations + fund_documents) est
 * OPT-IN (`SEEDOW_PERSIST=1`) et n'écrit QUE des faits sourcés (§1, §7).
 *
 * ⚠️ Réseau : GECO n'est joignable QUE depuis un runner GitHub Actions (egress
 * ouvert). Depuis le sandbox agent, GECO répond 403 — lancer via le workflow
 * `.github/workflows/esg-sfdr-poc.yml`.
 *
 * Usage :
 *   bun run scripts/esg-sfdr-poc.ts                 (mesure seule, échantillon Supabase)
 *   POC_SEED_ONLY=1 bun run scripts/esg-sfdr-poc.ts (échantillon graine intégré)
 *   SEEDOW_PERSIST=1 bun run scripts/esg-sfdr-poc.ts (mesure + persiste les succès)
 * Env :
 *   POC_LIMIT       taille de l'échantillon (défaut 100)
 *   POC_DELAY_MS    pause entre ISIN (défaut 350, courtoisie source §16)
 */

import { GecoResolver } from "../src/lib/esg/sfdr-pipeline/geco-resolver";
import {
  downloadAndExtract,
  MemoryDocumentCache,
  type PdfToText,
} from "../src/lib/esg/sfdr-pipeline/document-extractor";
import { runSfdrBatch } from "../src/lib/esg/sfdr-pipeline/pipeline";
import type { FailureReason, PipelineResult } from "../src/lib/esg/sfdr-pipeline/types";

// Client Supabase non typé (les tables du Data Engine n'entrent dans les types
// auto-générés qu'après régénération) — même approche que scripts/enrich-*.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

// ── Échantillon graine (fallback hors Supabase) : ETF UCITS grand public,
// domiciles variés, émetteurs variés, ESG et non-ESG. ISIN réels, non inventés.
const SEED_ISINS: string[] = [
  // IE
  "IE00B4L5Y983", // iShares Core MSCI World
  "IE00B5BMR087", // iShares Core S&P 500
  "IE00BKM4GZ66", // iShares Core MSCI EM IMI
  "IE00BFNM3P36", // iShares MSCI World ESG Enhanced
  "IE00BYX2JD69", // iShares MSCI World SRI
  // LU
  "LU1681043599", // Amundi MSCI World
  "LU0908500753", // Lyxor Core STOXX Europe 600
  "LU1437016972", // Amundi Index MSCI Emerging Markets
  "LU0629459743", // UBS MSCI World SRI
  // FR (GECO faisant-foi)
  "FR0010315770", // Lyxor CAC 40
  "FR0011871128", // Amundi ETF (FR-domicilié)
  "FR0010296061", // Lyxor ETF (FR)
];

interface CandidateEtf {
  isin: string;
  name: string | null;
  country: string | null;
}

/** Domicile = 2 premières lettres de l'ISIN (pays d'émission juridique). */
function domicileOf(isin: string): string {
  return /^[A-Z]{2}/.test(isin) ? isin.slice(0, 2) : "??";
}

/** Sélection stratifiée par domicile depuis `catalog_instruments` (ETF, ISIN présent). */
async function selectFromSupabase(limit: number): Promise<CandidateEtf[]> {
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const c = supabaseAdmin as Db;

  // Quotas indicatifs (§3 : IE/LU dominants, FR pour valider la chaîne complète).
  const buckets: Array<{ prefix: string; take: number }> = [
    { prefix: "IE", take: Math.round(limit * 0.35) },
    { prefix: "LU", take: Math.round(limit * 0.3) },
    { prefix: "FR", take: Math.round(limit * 0.2) },
  ];
  const seenIsin = new Set<string>();
  const seenGroup = new Set<string>();
  const out: CandidateEtf[] = [];

  async function pull(prefix: string, take: number): Promise<void> {
    const { data, error } = await c
      .from("catalog_instruments")
      .select("isin, name, country, instrument_group_key")
      .eq("asset_type", "etf")
      .not("isin", "is", null)
      .ilike("isin", `${prefix}%`)
      .order("listing_key", { ascending: true })
      .limit(take * 6); // marge pour dédupliquer les cross-listings
    if (error) throw new Error(`select ${prefix}: ${error.message}`);
    let added = 0;
    for (const row of data ?? []) {
      if (added >= take) break;
      const isin = String(row.isin);
      const group = row.instrument_group_key ? String(row.instrument_group_key) : isin;
      if (seenIsin.has(isin) || seenGroup.has(group)) continue;
      seenIsin.add(isin);
      seenGroup.add(group);
      out.push({ isin, name: row.name ?? null, country: row.country ?? null });
      added++;
    }
  }

  for (const b of buckets) await pull(b.prefix, b.take);
  // Complément « autres domiciles » pour atteindre `limit`.
  if (out.length < limit) {
    const { data } = await c
      .from("catalog_instruments")
      .select("isin, name, country, instrument_group_key")
      .eq("asset_type", "etf")
      .not("isin", "is", null)
      .order("listing_key", { ascending: true })
      .limit(limit * 6);
    for (const row of data ?? []) {
      if (out.length >= limit) break;
      const isin = String(row.isin);
      const group = row.instrument_group_key ? String(row.instrument_group_key) : isin;
      if (seenIsin.has(isin) || seenGroup.has(group)) continue;
      seenIsin.add(isin);
      seenGroup.add(group);
      out.push({ isin, name: row.name ?? null, country: row.country ?? null });
    }
  }
  return out.slice(0, limit);
}

/** Backend PDF (unpdf) — importé dynamiquement (jamais dans le bundle client/edge). */
async function makePdfToText(): Promise<PdfToText> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  return async (bytes: Uint8Array) => {
    const pdf = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return { text: Array.isArray(text) ? text.join("\n") : text, pages: totalPages ?? null };
  };
}

interface Report {
  sample: number;
  bySource: { geco_resolved: number };
  documentsFound: number;
  textExtracted: number;
  sfdrVerifiedPrimary: number;
  articles: { a6: number; a8: number; a9: number };
  failures: Record<FailureReason, number>;
  byDomicile: Record<string, { total: number; verified: number }>;
  coveragePrimaryPct: number;
}

function emptyFailures(): Record<FailureReason, number> {
  return {
    NO_GECO_MATCH: 0,
    NO_DOCUMENT: 0,
    DOCUMENT_BLOCKED: 0,
    PDF_PARSE_FAILED: 0,
    NO_SFDR_MENTION: 0,
    AMBIGUOUS_SFDR: 0,
    ISSUER_NOT_RESOLVED: 0,
    RATE_LIMIT: 0,
    NETWORK_RESTRICTION: 0,
    OTHER: 0,
  };
}

function aggregate(results: PipelineResult[]): Report {
  const rep: Report = {
    sample: results.length,
    bySource: { geco_resolved: 0 },
    documentsFound: 0,
    textExtracted: 0,
    sfdrVerifiedPrimary: 0,
    articles: { a6: 0, a8: 0, a9: 0 },
    failures: emptyFailures(),
    byDomicile: {},
    coveragePrimaryPct: 0,
  };
  for (const r of results) {
    const dom = domicileOf(r.isin);
    rep.byDomicile[dom] ??= { total: 0, verified: 0 };
    rep.byDomicile[dom].total++;
    if (r.trace.resolvedBy) rep.bySource.geco_resolved++;
    if (r.trace.documentsFound > 0) rep.documentsFound++;
    if (r.trace.textExtracted) rep.textExtracted++;
    if (r.ok && r.observation) {
      rep.sfdrVerifiedPrimary++;
      rep.byDomicile[dom].verified++;
      const a = r.observation.value;
      if (a === 6) rep.articles.a6++;
      else if (a === 8) rep.articles.a8++;
      else if (a === 9) rep.articles.a9++;
    } else if (r.failureReason) {
      rep.failures[r.failureReason]++;
    }
  }
  rep.coveragePrimaryPct =
    rep.sample > 0 ? Math.round((rep.sfdrVerifiedPrimary / rep.sample) * 1000) / 10 : 0;
  return rep;
}

/** Décision §13 à partir du taux de couverture officiel. */
function decision(pct: number): string {
  if (pct >= 80) return "≥80% → EXCELLENT : industrialiser le pipeline.";
  if (pct >= 60)
    return "60–80% → BON : ajouter un 2e resolver (asset-managers fréquents) puis industrialiser.";
  if (pct >= 40) return "40–60% → analyser précisément les causes avant de continuer.";
  return "<40% → NE PAS industrialiser. Présenter les résultats et revoir la stratégie de source.";
}

async function persist(results: PipelineResult[]): Promise<number> {
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const c = supabaseAdmin as Db;
  const { data: srcRows } = await c.from("data_sources").select("id, key");
  const sourceId: Record<string, string> = {};
  for (const s of srcRows ?? []) sourceId[s.key] = s.id;

  let written = 0;
  for (const r of results) {
    if (!r.ok || !r.observation) continue;
    const o = r.observation;
    // Résout l'asset par ISIN (l'observation s'ancre sur un asset existant).
    const { data: asset } = await c.from("assets").select("id").eq("isin", o.isin).maybeSingle();
    if (!asset?.id) continue; // pas d'asset → on n'invente pas de ligne ; l'ISIN reste mesuré au rapport
    const assetId = asset.id;

    // 1) Document officiel (upsert par (asset_id, doc_type, url)).
    let documentId: string | null = null;
    const { data: doc } = await c
      .from("fund_documents")
      .upsert(
        {
          asset_id: assetId,
          doc_type: "kid",
          url: o.documentUrl,
          published_date: o.documentDate,
          language: "fr",
          source_id: sourceId[o.sourceKey] ?? null,
          checksum: o.documentHash,
          parse_status: "valid",
          retrieved_at: o.retrievedAt,
        },
        { onConflict: "asset_id,doc_type,url" },
      )
      .select("id")
      .maybeSingle();
    documentId = doc?.id ?? null;

    // 2) Observation traçable (avec la preuve).
    const { error } = await c.from("data_observations").insert({
      asset_id: assetId,
      field: "sfdr_article",
      value_num: o.value,
      source_id: sourceId[o.sourceKey] ?? null,
      source_url: o.documentUrl,
      reference_date: o.documentDate,
      retrieved_at: o.retrievedAt,
      confidence: o.confidence,
      method: `pdf_parse:sfdr@v${o.parserVersion}`,
      validation_status: "valid",
      evidence_text: o.evidenceText,
      parser_version: o.parserVersion,
      document_id: documentId,
    });
    if (!error) written++;
    else console.warn(`[poc] insert obs ${o.isin}: ${error.message}`);
  }
  return written;
}

async function main(): Promise<void> {
  const limit = Math.max(1, Number(process.env.POC_LIMIT) || 100);
  const delayMs = Math.max(0, Number(process.env.POC_DELAY_MS) || 350);
  const seedOnly = process.env.POC_SEED_ONLY === "1";
  const doPersist = process.env.SEEDOW_PERSIST === "1";
  console.log(`[poc] SFDR pipeline · limit=${limit} · persist=${doPersist} · seedOnly=${seedOnly}`);

  let candidates: CandidateEtf[];
  if (seedOnly) {
    candidates = SEED_ISINS.map((isin) => ({ isin, name: null, country: null }));
  } else {
    try {
      candidates = await selectFromSupabase(limit);
      if (candidates.length === 0) throw new Error("échantillon Supabase vide");
    } catch (e) {
      console.warn(`[poc] Supabase indisponible (${e instanceof Error ? e.message : e}) → graine`);
      candidates = SEED_ISINS.map((isin) => ({ isin, name: null, country: null }));
    }
  }
  const isins = candidates.map((c) => c.isin).slice(0, limit);
  console.log(`[poc] échantillon: ${isins.length} ISIN · domiciles: ${summarizeDomiciles(isins)}`);

  const resolver = new GecoResolver(fetch);
  const cache = new MemoryDocumentCache();
  const pdfToText = await makePdfToText();
  const extract = (url: string) =>
    downloadAndExtract(url, { pdfToText, cache, userAgent: "SeedowBot/1.0 (+https://seedow.app)" });

  const results = await runSfdrBatch(isins, {
    resolvers: [resolver],
    extract,
    delayMs,
    onResult: (r, i, total) => {
      const tag = r.ok ? `OK a${r.observation?.value}` : r.failureReason;
      console.log(`[poc] ${String(i + 1).padStart(3)}/${total} ${r.isin} → ${tag}`);
    },
  });

  const rep = aggregate(results);
  let persisted = 0;
  if (doPersist) {
    try {
      persisted = await persist(results);
    } catch (e) {
      console.warn(`[poc] persistance échouée: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\n===== RAPPORT POC SFDR (mesuré) =====");
  console.log(JSON.stringify({ ...rep, persisted }, null, 2));
  console.log("\n--- Synthèse ---");
  console.log(`Échantillon : ${rep.sample} ETF`);
  console.log(`GECO résolus : ${rep.bySource.geco_resolved}`);
  console.log(`Documents trouvés : ${rep.documentsFound}`);
  console.log(`Texte extrait : ${rep.textExtracted}`);
  console.log(
    `SFDR vérifié (PRIMARY) : ${rep.sfdrVerifiedPrimary}  (art.6=${rep.articles.a6} art.8=${rep.articles.a8} art.9=${rep.articles.a9})`,
  );
  console.log(
    `COUVERTURE OFFICIELLE : ${rep.sfdrVerifiedPrimary}/${rep.sample} = ${rep.coveragePrimaryPct}%`,
  );
  console.log("Par domicile :");
  for (const [dom, s] of Object.entries(rep.byDomicile).sort())
    console.log(`  ${dom}: ${s.verified}/${s.total} vérifiés`);
  console.log("Échecs (taxonomie §12) :");
  for (const [reason, n] of Object.entries(rep.failures)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]))
    console.log(`  ${reason}: ${n}`);
  console.log(`\nDÉCISION §13 : ${decision(rep.coveragePrimaryPct)}`);
  if (doPersist) console.log(`Persistées : ${persisted} observations`);
  console.log("(mesure — aucune activation de fonds ; le gate ESG reste souverain)");
}

function summarizeDomiciles(isins: string[]): string {
  const counts: Record<string, number> = {};
  for (const i of isins) counts[domicileOf(i)] = (counts[domicileOf(i)] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `${d}:${n}`)
    .join(" ");
}

main().catch((e) => {
  console.error("[poc] fatal:", e instanceof Error ? e.stack : String(e));
  process.exit(1);
});
