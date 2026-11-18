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
import { parseSfdrArticle } from "@/lib/esg/framework";

export interface SnapshotSide {
  isin: string;
  name: string;
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
      issuer: "iShares (BlackRock)",
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
