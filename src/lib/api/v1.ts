/**
 * API publique Seedow v1 — logique PURE (pas de réseau, pas de Supabase).
 *
 * Destinée aux sociétés de gestion, distributeurs et équipes de recherche qui
 * veulent reprendre le comparateur dans leurs propres outils : lecture seule,
 * sans authentification, réponses JSON ou CSV, mises en cache en bordure.
 *
 * Trois règles, les mêmes que sur le site :
 *
 *   1. PROVENANCE PAR CHAMP. Toute valeur publiée porte son statut de donnée
 *      (`VERIFIED`, `ESTIMATED`, `SIMULATED`, `STALE`, `UNAVAILABLE`), sa
 *      source et sa date. Une valeur inconnue est `null` avec le statut
 *      `UNAVAILABLE` — jamais 0, jamais devinée.
 *   2. PAS DE CLASSEMENT. L'API ne trie pas les fonds par qualité, ne calcule
 *      aucun score de durabilité et ne recommande rien (docs/scoring-v2.md,
 *      CLAUDE.md §1.1). L'ordre des listes est alphabétique.
 *   3. PAS DE REDISTRIBUTION SANS DROIT. Les indicateurs calculés par MSCI ESG
 *      Research que les émetteurs américains publient (notation, WACI, hausse
 *      de température implicite, expositions d'activité) sont affichés et
 *      attribués sur le site ; ils ne sont PAS servis ici. Seedow n'a pas de
 *      licence de redistribution MSCI. L'API dit seulement qu'ils existent et
 *      où les lire.
 */
import type { CompareFund } from "@/lib/compare/universe";
import { dataCoveragePct, effectiveSfdr, EXPORT_COLUMNS, exportRow } from "@/lib/compare/universe";
import { primarySourceStatus, type DataStatus } from "@/lib/data/status";
import type { SnapshotFundAnalytics } from "@/lib/demo/demo.functions";
import { euFrameworkApplies } from "@/lib/esg/framework";

export const API_VERSION = "1.0.0";
export const API_BASE = "/api/public/v1";
/** Nombre maximal de fonds par requête de comparaison. */
export const MAX_COMPARE = 8;

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

export interface Field<T> {
  value: T | null;
  status: DataStatus;
  source: string | null;
  asOf: string | null;
}

function field<T>(
  value: T | null | undefined,
  status: DataStatus,
  source: string | null = null,
  asOf: string | null = null,
): Field<T> {
  const v = value ?? null;
  // Une valeur absente n'a ni source ni date : on ne date pas un trou.
  if (v === null) return { value: null, status: "UNAVAILABLE", source: null, asOf: null };
  return { value: v, status, source, asOf };
}

export interface ApiMeta {
  api: "seedow-public";
  version: string;
  generatedAt: string;
  /** Date de constitution de l'instantané émetteur servi. */
  dataSnapshotAt: string | null;
  docs: string;
  openapi: string;
  units: Record<string, string>;
  statuses: Record<DataStatus, string>;
  terms: string;
  disclaimer: string;
}

export function apiMeta(input: { generatedAt: string; dataSnapshotAt: string | null }): ApiMeta {
  return {
    api: "seedow-public",
    version: API_VERSION,
    generatedAt: input.generatedAt,
    dataSnapshotAt: input.dataSnapshotAt,
    docs: "/developpeurs",
    openapi: `${API_BASE}/openapi.json`,
    units: {
      returns: "fraction (0.0525 = 5.25 %), annualised over calendar days (365.25)",
      volatility: "fraction, annualised standard deviation of month-end returns × √12",
      maxDrawdown: "fraction, negative (−0.25 = −25 %)",
      ter: "fraction (0.002 = 0.20 %)",
      exposurePct: "percent of the fund (12.4 = 12.4 %), as published by the issuer",
    },
    statuses: {
      VERIFIED: "Primary source identified, dated, reproduced without substantive reprocessing",
      ESTIMATED: "Computed or modelled by Seedow from real data",
      SIMULATED: "Illustration of a mechanism (fictitious amounts)",
      STALE: "Was verified, but is older than the freshness window of its dataset",
      UNAVAILABLE: "Missing or not collected — never replaced by zero",
    },
    terms:
      "Read-only, no authentication. Each value carries its source: reuse is subject to the terms of the cited source. Indicators computed by MSCI ESG Research are not redistributed.",
    disclaimer:
      "Information only — not investment advice, not a recommendation to buy or sell. Past performance does not predict future returns. No ranking, no sustainability score.",
  };
}

/** Lit `?isins=A,B,C` : ISIN valides, dédoublonnés, `MAX_COMPARE` au plus. */
export function parseIsinList(
  raw: string | null,
): { ok: true; isins: string[] } | { ok: false; error: string } {
  if (!raw || !raw.trim()) return { ok: false, error: "missing_isins" };
  const parts = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (parts.length === 0) return { ok: false, error: "missing_isins" };
  if (parts.length > MAX_COMPARE) return { ok: false, error: "too_many_isins" };
  const bad = parts.find((p) => !ISIN_RE.test(p));
  if (bad) return { ok: false, error: "invalid_isin" };
  return { ok: true, isins: parts };
}

export function isIsin(raw: string): boolean {
  return ISIN_RE.test(raw.trim().toUpperCase());
}

// ── Ressources ──────────────────────────────────────────────────────────

export interface FundSummary {
  isin: string | null;
  name: string;
  issuer: string | null;
  domicile: string | null;
  sfdrArticle: number | null;
  ter: number | null;
  hasPerformance: boolean;
  hasIssuerEsgIndicators: boolean;
  dataCoveragePct: number;
  links: { self: string | null; page: string | null };
}

export function fundSummary(f: CompareFund): FundSummary {
  return {
    isin: f.isin,
    name: f.name,
    issuer: f.issuer,
    domicile: f.snapshot?.domicile ?? null,
    sfdrArticle: effectiveSfdr(f),
    ter: f.ter,
    hasPerformance: f.snapshot !== null,
    hasIssuerEsgIndicators: f.snapshot?.thirdParty != null,
    dataCoveragePct: Math.round(dataCoveragePct(f)),
    links: {
      self: f.isin ? `${API_BASE}/funds/${f.isin}` : null,
      page: f.slug ? `/fonds/${f.slug}` : null,
    },
  };
}

const CATALOG = "Seedow catalogue (Observatoire)";

/** Fiche complète d'un fonds, champ par champ, avec provenance. */
export function fundDetail(f: CompareFund, a: SnapshotFundAnalytics | null) {
  const issuerSrc = a ? `${a.issuer} — ${a.sourceLabel}` : null;
  const declaredFrom = a?.sfdrDeclared ? issuerSrc : null;
  const eu = euFrameworkApplies(f.isin);
  const perf = a?.performance ?? null;
  const tp = a?.thirdPartyEsg ?? null;
  // Identité et frais : lus dans le document de l'émetteur daté du jour de VL.
  const docStatus: DataStatus = a
    ? primarySourceStatus(true, a.navAsOf, "regulatory_document")
    : "UNAVAILABLE";

  return {
    isin: f.isin,
    name: f.name,
    issuer: f.issuer,
    identity: {
      domicile: field(a?.domicile, docStatus, issuerSrc, a?.navAsOf),
      currency: field(a?.currency, docStatus, issuerSrc, a?.navAsOf),
      benchmark: field(a?.benchmark, docStatus, issuerSrc, a?.navAsOf),
      assetClass: field(f.assetClass ?? a?.assetClass, "VERIFIED", a ? issuerSrc : CATALOG),
    },
    regulatory: {
      /** `false` : fonds hors EEE, le règlement SFDR ne s'applique pas. */
      euFrameworkApplies: eu,
      sfdrDeclared: field(
        f.sfdrDeclared,
        a?.status.regulatory ?? "UNAVAILABLE",
        declaredFrom,
        a?.navAsOf,
      ),
      sfdrCatalog: field(f.sfdrCatalog, "VERIFIED", CATALOG),
      sfdrConflict: f.sfdrConflict,
      taxonomyAlignment: field<number>(null, "UNAVAILABLE"),
      paiStatement: field<string>(null, "UNAVAILABLE"),
    },
    costs: {
      // TER de l'émetteur quand c'est lui qui est retenu, sinon celui du catalogue.
      ter:
        a && f.ter !== null && f.ter === a.ter
          ? field(f.ter, docStatus, issuerSrc, a.navAsOf)
          : field(f.ter, "VERIFIED", CATALOG),
    },
    exclusions: {
      levels: f.exclusions,
      source: CATALOG,
      note: "Documented exclusion policy per sector, as read in the fund's own documents. 'non_verifie' means Seedow could not verify — not that the fund has no policy.",
    },
    transparency: {
      blocksEvaluated: f.stiBlocksEvaluated,
      blocksTotal: f.stiBlocksTotal,
      discrepancies: f.discrepancies,
      method: "/methodologie",
    },
    performance: perf
      ? {
          status: a!.status.performance,
          source: issuerSrc,
          frequency: perf.frequency,
          firstDate: perf.firstDate,
          lastDate: perf.lastDate,
          currency: a!.currency,
          windows: perf.windows.map((w) => ({
            years: w.years,
            available: w.available,
            startDate: w.startDate,
            endDate: w.endDate,
            cumulativeReturn: w.cumulativeReturn,
            annualizedReturn: w.annualizedReturn,
            annualizedVolatility: w.annualizedVolatility,
            maxDrawdown: w.maxDrawdown,
            benchmarkAnnualizedReturn: w.benchmarkAnnualizedReturn,
            excessAnnualizedReturn: w.excessAnnualizedReturn,
            trackingError: w.trackingError,
          })),
          publishedByIssuer: {
            asOf: a!.publishedReturns.asOf,
            annualizedPct: a!.publishedReturns.fund,
            benchmarkAnnualizedPct: a!.publishedReturns.benchmark,
            stdDev3yPct: a!.publishedStdDev3y,
          },
          note: "Recomputed by Seedow from the issuer's total-return series and cross-checked against the returns the issuer publishes. Past performance does not predict future returns. Sharpe ratio not provided (no sourced risk-free rate).",
        }
      : null,
    exposure: a
      ? {
          status: a.status.exposure,
          source: issuerSrc,
          sector: { asOf: a.sectorAsOf, rows: a.sectorExposure },
          geography: { asOf: a.geographyAsOf, rows: a.geographyExposure },
          currency: { asOf: a.holdingsAsOf, rows: a.currencyExposure },
          energySectorPct: field(a.energySectorPct, a.status.exposure, issuerSrc, a.sectorAsOf),
        }
      : null,
    holdings: a
      ? {
          status: a.status.holdings,
          source: issuerSrc,
          asOf: a.holdingsAsOf,
          count: a.holdingsCount,
          top10: a.topHoldings.map((h) => ({
            name: h.name,
            ticker: h.ticker,
            sector: h.sector,
            weightPct: h.weightPct,
          })),
        }
      : null,
    issuerEsgIndicators: tp
      ? {
          available: true,
          redistributed: false,
          provider: tp.provider,
          publishedBy: tp.publishedBy,
          asOf: tp.sustainability?.asOf ?? tp.businessInvolvement?.asOf ?? null,
          readAt: tp.sourceUrl,
          page: f.slug ? `/fonds/${f.slug}` : null,
          note: "The issuer publishes MSCI ESG fund metrics for this fund. Seedow displays them with attribution on the fund page but holds no MSCI redistribution licence: values are not served by this API.",
        }
      : { available: false },
    dataCoveragePct: Math.round(dataCoveragePct(f)),
    links: {
      page: f.slug ? `/fonds/${f.slug}` : null,
      report: f.isin ? `/comparer/rapport?f=${f.isin}` : null,
    },
  };
}

export type FundDetail = ReturnType<typeof fundDetail>;

/** Comparaison : les fiches demandées, dans l'ordre demandé, et la liste de celles introuvables. */
export function comparison(
  universe: CompareFund[],
  analytics: SnapshotFundAnalytics[],
  isins: string[],
) {
  const byIsin = new Map(analytics.map((a) => [a.isin, a]));
  const found: FundDetail[] = [];
  const notFound: string[] = [];
  for (const isin of isins) {
    const f = findFund(universe, isin);
    if (!f) notFound.push(isin);
    else found.push(fundDetail(f, byIsin.get(f.snapshot?.isin ?? isin) ?? null));
  }
  return {
    funds: found,
    notFound,
    columns: EXPORT_COLUMNS,
    rows: isins
      .map((i) => findFund(universe, i))
      .filter((f): f is CompareFund => !!f)
      .map(exportRow),
  };
}

export function findFund(universe: CompareFund[], isin: string): CompareFund | null {
  const key = isin.trim().toUpperCase();
  return (
    universe.find((f) => f.isin === key) ?? universe.find((f) => f.snapshot?.isin === key) ?? null
  );
}

/** Filtres de `/funds` lus dans la chaîne de requête. Valeur illisible → filtre ignoré. */
export function parseFundFilters(params: URLSearchParams) {
  const sfdr = params.get("sfdr");
  const maxTerRaw = params.get("maxTer");
  const maxTer = maxTerRaw === null ? null : Number(maxTerRaw);
  return {
    query: (params.get("q") ?? "").slice(0, 100),
    sfdr: sfdr === "6" || sfdr === "8" || sfdr === "9" || sfdr === "unknown" ? sfdr : "all",
    maxTer:
      maxTer !== null && Number.isFinite(maxTer) && maxTer >= 0 && maxTer <= 0.1 ? maxTer : null,
    fossilPolicyDocumented: params.get("fossilPolicy") === "documented",
    withPerformance: params.get("withPerformance") === "true",
  } as const;
}

// ── Réponses HTTP ───────────────────────────────────────────────────────

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Données documentaires peu volatiles : cache en bordure, comme `/api/public/esg-preview`. */
export const CACHE_PUBLIC = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export function jsonResponse(body: unknown, status = 200, cache = CACHE_PUBLIC): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? cache : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...CORS_HEADERS,
    },
  });
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": CACHE_PUBLIC,
      "X-Content-Type-Options": "nosniff",
      ...CORS_HEADERS,
    },
  });
}

export function errorResponse(code: string, status: number, detail?: string): Response {
  return jsonResponse({ error: { code, ...(detail ? { detail } : {}) } }, status);
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
