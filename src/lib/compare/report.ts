/**
 * Rapport institutionnel de comparaison — logique pure, testée.
 *
 * Le rapport imprimable reprend le comparateur, avec ce qu'un comité
 * d'investissement ou une équipe de sélection de fonds attend d'un document
 * transmissible : identité, cadre réglementaire, frais, performance passée
 * recalculée et contrôlée, expositions, exclusions documentées, couverture des
 * données, sources datées. Il ne classe pas et ne recommande rien.
 */
import type { SnapshotExposure } from "@/lib/demo/snapshots";

/** Nombre maximal de fonds dans un rapport : au-delà, le tableau ne tient plus sur une page A4. */
export const MAX_REPORT = 6;

/** Lit `?f=A,B` : ISIN plausibles, dédoublonnés, `MAX_REPORT` au plus. */
export function parseReportSelection(raw: string | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(s)),
    ),
  ].slice(0, MAX_REPORT);
}

/**
 * Les `n` premières lignes d'une répartition publiée, hors liquidités et
 * « autres » — qui restent comptées dans le reste, jamais effacées.
 */
export function topExposures(rows: SnapshotExposure[], n = 3): SnapshotExposure[] {
  return rows
    .filter((r) => !/cash|derivative|^other$/i.test(r.label))
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, n);
}

/** Part cumulée des `n` premières positions publiées, en %. */
export function topWeight(rows: { weightPct: number }[], n = 10): number | null {
  if (rows.length === 0) return null;
  const sum = [...rows]
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, n)
    .reduce((s, r) => s + r.weightPct, 0);
  return Math.round(sum * 100) / 100;
}
