/**
 * Univers du comparateur de fonds — logique pure, testée.
 *
 * Il fusionne deux sources sans les mélanger :
 *   - le CATALOGUE (Observatoire) : identité, article SFDR enregistré, frais,
 *     politiques d'exclusion documentées, indice de transparence ;
 *   - l'INSTANTANÉ émetteur : SFDR déclaré, historique, expositions.
 * Chaque champ garde sa provenance. Un champ absent reste `null` et compte
 * dans la couverture — il n'est jamais rempli par défaut.
 */
import type { ObservatoryFund, SectorDisclosureLevel } from "@/lib/esg/v2/observatory";
import { parseSfdrArticle, type ThirdPartyFundEsg } from "@/lib/esg/framework";
import type { PerformanceReport, SeriesFrequency } from "@/lib/portfolio/performance";

/**
 * Indicateurs MSCI publiés par l'émetteur, réduits à ce que le comparateur
 * AFFICHE. Ils ne sortent jamais dans un export (CSV, JSON, rapport) : Seedow
 * n'a pas de licence de redistribution MSCI (cf. `lib/api/v1.ts`).
 */
export interface ThirdPartySide {
  provider: string;
  publishedBy: string;
  rating: string | null;
  waci: number | null;
  impliedTempRise: string | null;
  controversialWeapons: number | null;
  thermalCoal: number | null;
  ungcViolators: number | null;
  asOf: string | null;
}

export interface SnapshotSide {
  isin: string;
  name: string;
  issuer: string;
  domicile: string | null;
  currency: string | null;
  sourceUrl: string;
  sfdrDeclared: string | null;
  navAsOf: string | null;
  ter: number | null;
  benchmark: string | null;
  holdingsCount: number | null;
  energySectorPct: number | null;
  annualized: Record<1 | 3 | 5, number | null>;
  volatility3y: number | null;
  maxDrawdown5y: number | null;
  excess3y: number | null;
  /** Fréquence de la série de performance (mensuelle pour les ETF américains). */
  perfFrequency: SeriesFrequency;
  perfAsOf: string | null;
  thirdParty: ThirdPartySide | null;
}

/** Ce que le comparateur retient d'un fonds analysé de l'instantané. */
export function toSnapshotSide(a: {
  isin: string;
  name: string;
  issuer: string;
  domicile: string | null;
  currency: string | null;
  sourceUrl: string;
  sfdrDeclared: string | null;
  navAsOf: string | null;
  ter: number | null;
  benchmark: string | null;
  holdingsCount: number | null;
  energySectorPct: number | null;
  performance: PerformanceReport;
  thirdPartyEsg: ThirdPartyFundEsg | null;
}): SnapshotSide {
  const w = (y: number) => a.performance.windows.find((x) => x.years === y);
  const tp = a.thirdPartyEsg;
  const involvement = (id: string) =>
    tp?.businessInvolvement?.rows.find((r) => r.id === id)?.pct ?? null;
  return {
    isin: a.isin,
    name: a.name,
    issuer: a.issuer,
    domicile: a.domicile,
    currency: a.currency,
    sourceUrl: a.sourceUrl,
    sfdrDeclared: a.sfdrDeclared,
    navAsOf: a.navAsOf,
    ter: a.ter,
    benchmark: a.benchmark,
    holdingsCount: a.holdingsCount,
    energySectorPct: a.energySectorPct,
    annualized: {
      1: w(1)?.annualizedReturn ?? null,
      3: w(3)?.annualizedReturn ?? null,
      5: w(5)?.annualizedReturn ?? null,
    },
    volatility3y: w(3)?.annualizedVolatility ?? null,
    maxDrawdown5y: w(5)?.maxDrawdown ?? null,
    excess3y: w(3)?.excessAnnualizedReturn ?? null,
    perfFrequency: a.performance.frequency,
    perfAsOf: a.performance.lastDate,
    thirdParty: tp
      ? {
          provider: tp.provider,
          publishedBy: tp.publishedBy,
          rating: tp.sustainability?.msciRating ?? null,
          waci: tp.sustainability?.waci ?? null,
          impliedTempRise: tp.sustainability?.impliedTempRise ?? null,
          controversialWeapons: involvement("controversial_weapons"),
          thermalCoal: involvement("thermal_coal"),
          ungcViolators: involvement("ungc_violators"),
          asOf: tp.sustainability?.asOf ?? tp.businessInvolvement?.asOf ?? null,
        }
      : null,
  };
}

export interface CompareFund {
  /** Clé stable : premier ISIN, sinon clé d'entité catalogue. */
  id: string;
  isin: string | null;
  name: string;
  issuer: string | null;
  assetClass: string | null;
  /** Article enregistré au catalogue Seedow. */
  sfdrCatalog: number | null;
  /** Article déclaré par l'émetteur dans son propre document (instantané). */
  sfdrDeclared: 6 | 8 | 9 | null;
  sfdrConflict: boolean;
  ter: number | null;
  exclusions: Partial<Record<string, SectorDisclosureLevel>>;
  stiBlocksEvaluated: number | null;
  stiBlocksTotal: number | null;
  discrepancies: number | null;
  slug: string | null;
  snapshot: SnapshotSide | null;
}

export function buildUniverse(
  catalog: ObservatoryFund[],
  snapshots: SnapshotSide[],
): CompareFund[] {
  const byIsin = new Map(snapshots.map((s) => [s.isin.toUpperCase(), s]));
  const used = new Set<string>();
  const rows: CompareFund[] = catalog.map((f) => {
    const isin = f.isins[0] ?? null;
    const snap = f.isins.map((i) => byIsin.get(i.toUpperCase())).find(Boolean) ?? null;
    if (snap) used.add(snap.isin);
    const declared = snap ? parseSfdrArticle(snap.sfdrDeclared) : null;
    return {
      id: isin ?? f.key,
      isin,
      name: f.name,
      issuer: f.issuer,
      assetClass: f.assetClass,
      sfdrCatalog: f.sfdrArticle,
      sfdrDeclared: declared,
      sfdrConflict: declared !== null && f.sfdrArticle !== null && declared !== f.sfdrArticle,
      ter: f.ter ?? snap?.ter ?? null,
      exclusions: Object.fromEntries(f.sectors.map((s) => [s.sector, s.level])),
      stiBlocksEvaluated: f.sti.blocksEvaluated,
      stiBlocksTotal: f.sti.blocksTotal,
      discrepancies: f.discrepancies.length,
      slug: f.slug,
      snapshot: snap,
    };
  });
  for (const s of snapshots) {
    if (used.has(s.isin)) continue;
    rows.push({
      id: s.isin,
      isin: s.isin,
      name: s.name,
      issuer: s.issuer,
      assetClass: null,
      sfdrCatalog: null,
      sfdrDeclared: parseSfdrArticle(s.sfdrDeclared),
      sfdrConflict: false,
      ter: s.ter,
      exclusions: {},
      stiBlocksEvaluated: null,
      stiBlocksTotal: null,
      discrepancies: null,
      slug: s.isin,
      snapshot: s,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export interface ScreenFilters {
  query?: string;
  sfdr?: "all" | "6" | "8" | "9" | "unknown";
  maxTer?: number | null;
  fossilPolicyDocumented?: boolean;
  withPerformance?: boolean;
}

/** Article retenu pour le filtrage : la déclaration de l'émetteur prime sur le catalogue. */
export function effectiveSfdr(f: CompareFund): number | null {
  return f.sfdrDeclared ?? f.sfdrCatalog;
}

export function screen(funds: CompareFund[], f: ScreenFilters): CompareFund[] {
  const q = f.query?.trim().toLowerCase() ?? "";
  return funds.filter((x) => {
    if (q && !`${x.name} ${x.issuer ?? ""} ${x.isin ?? ""}`.toLowerCase().includes(q)) return false;
    const art = effectiveSfdr(x);
    if (f.sfdr && f.sfdr !== "all") {
      if (f.sfdr === "unknown" ? art !== null : art !== Number(f.sfdr)) return false;
    }
    // Un TER inconnu ne passe pas un filtre de frais : on ne suppose pas qu'il est bas.
    if (f.maxTer != null && (x.ter === null || x.ter > f.maxTer)) return false;
    if (f.fossilPolicyDocumented) {
      const lvl = x.exclusions.fossiles;
      if (!lvl || lvl === "non_verifie") return false;
    }
    if (f.withPerformance && !x.snapshot) return false;
    return true;
  });
}

/** Champs comptés dans la couverture d'un fonds — la grille est publique et fixe. */
export const COVERAGE_FIELDS = [
  "isin",
  "sfdr",
  "ter",
  "fossil_policy",
  "weapons_policy",
  "transparency_index",
  "performance_3y",
  "volatility_3y",
  "energy_exposure",
  "holdings",
] as const;

export function fieldPresence(f: CompareFund): Record<(typeof COVERAGE_FIELDS)[number], boolean> {
  const documented = (lvl: SectorDisclosureLevel | undefined) => !!lvl && lvl !== "non_verifie";
  return {
    isin: f.isin !== null,
    sfdr: effectiveSfdr(f) !== null,
    ter: f.ter !== null,
    fossil_policy: documented(f.exclusions.fossiles),
    weapons_policy: documented(f.exclusions.armement),
    transparency_index: (f.stiBlocksEvaluated ?? 0) > 0,
    performance_3y: f.snapshot?.annualized[3] != null,
    volatility_3y: f.snapshot?.volatility3y != null,
    energy_exposure: f.snapshot?.energySectorPct != null,
    holdings: f.snapshot?.holdingsCount != null,
  };
}

/** Couverture des données d'un fonds, en % de la grille. */
export function dataCoveragePct(f: CompareFund): number {
  const p = fieldPresence(f);
  const present = COVERAGE_FIELDS.filter((k) => p[k]).length;
  return (present / COVERAGE_FIELDS.length) * 100;
}

/** Échappe une cellule CSV (RFC 4180) et neutralise l'injection de formule. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value === "string") s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/**
 * Colonnes de l'export institutionnel — identifiants STABLES (snake_case,
 * anglais), pour qu'un import automatisé ne casse pas d'une langue à l'autre.
 * Les rendements, volatilités et pertes sont en FRACTION (0.0525 = 5,25 %) ;
 * les parts d'exposition en POURCENTAGE (12.4 = 12,4 %), comme l'émetteur les
 * publie. Aucune colonne MSCI : non redistribuable.
 */
export const EXPORT_COLUMNS = [
  "isin",
  "name",
  "issuer",
  "domicile",
  "currency",
  "sfdr_catalog",
  "sfdr_declared",
  "sfdr_conflict",
  "ter",
  "exclusion_fossil",
  "exclusion_weapons",
  "exclusion_tobacco",
  "exclusion_gambling",
  "exclusion_animal_testing",
  "exclusion_fast_fashion",
  "transparency_blocks_evaluated",
  "return_ann_1y",
  "return_ann_3y",
  "return_ann_5y",
  "volatility_3y",
  "max_drawdown_5y",
  "excess_return_3y",
  "performance_frequency",
  "performance_as_of",
  "energy_sector_pct",
  "holdings_count",
  "data_coverage_pct",
  "source_url",
] as const;

export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

/** Secteurs du catalogue → colonne d'export (clés `STI_SECTORS`). */
const EXCLUSION_COLUMN: Record<string, ExportColumn> = {
  fossiles: "exclusion_fossil",
  armement: "exclusion_weapons",
  tabac: "exclusion_tobacco",
  jeux: "exclusion_gambling",
  tests_animaux: "exclusion_animal_testing",
  fast_fashion: "exclusion_fast_fashion",
};

/** Une ligne d'export par fonds, valeurs brutes (`null` = inconnu, jamais 0). */
export function exportRow(f: CompareFund): Record<ExportColumn, string | number | boolean | null> {
  const s = f.snapshot;
  const row: Record<ExportColumn, string | number | boolean | null> = {
    isin: f.isin,
    name: f.name,
    issuer: f.issuer,
    domicile: s?.domicile ?? null,
    currency: s?.currency ?? null,
    sfdr_catalog: f.sfdrCatalog,
    sfdr_declared: f.sfdrDeclared,
    sfdr_conflict: f.sfdrConflict,
    ter: f.ter,
    exclusion_fossil: null,
    exclusion_weapons: null,
    exclusion_tobacco: null,
    exclusion_gambling: null,
    exclusion_animal_testing: null,
    exclusion_fast_fashion: null,
    transparency_blocks_evaluated: f.stiBlocksEvaluated,
    return_ann_1y: s?.annualized[1] ?? null,
    return_ann_3y: s?.annualized[3] ?? null,
    return_ann_5y: s?.annualized[5] ?? null,
    volatility_3y: s?.volatility3y ?? null,
    max_drawdown_5y: s?.maxDrawdown5y ?? null,
    excess_return_3y: s?.excess3y ?? null,
    performance_frequency: s?.perfFrequency ?? null,
    performance_as_of: s?.perfAsOf ?? null,
    energy_sector_pct: s?.energySectorPct ?? null,
    holdings_count: s?.holdingsCount ?? null,
    data_coverage_pct: Math.round(dataCoveragePct(f)),
    source_url: s?.sourceUrl ?? null,
  };
  for (const [sector, level] of Object.entries(f.exclusions)) {
    const col = EXCLUSION_COLUMN[sector];
    if (col && level) row[col] = level;
  }
  return row;
}

/** Export CSV institutionnel (RFC 4180, UTF-8, séparateur virgule, point décimal). */
export function comparisonCsv(funds: CompareFund[]): string {
  return toCsv(
    [...EXPORT_COLUMNS],
    funds.map((f) => {
      const r = exportRow(f);
      return EXPORT_COLUMNS.map((c) => {
        const v = r[c];
        if (typeof v === "boolean") return String(v);
        // Six décimales : au-delà, c'est du bruit de virgule flottante, pas de la précision.
        if (typeof v === "number" && !Number.isInteger(v)) return Math.round(v * 1e6) / 1e6;
        return v;
      });
    }),
  );
}
