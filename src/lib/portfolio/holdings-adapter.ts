/**
 * Adaptateurs `fund_holdings` (base) → structures consommées par le cœur métier
 * (N2). Deux consommateurs :
 *   - overlap look-through (`overlap.ts`) : Map<assetId, HoldingWeights> ;
 *   - carbone bottom-up (`lib/esg/carbon-engine.ts`) : HoldingInput[].
 *
 * Fonctions PURES : le consommateur (server) fournit les lignes déjà lues en base.
 * Aucune donnée inventée — une ligne sans poids exploitable est ignorée, jamais
 * complétée. On ne garde que la composition la PLUS RÉCENTE (`as_of` max) par
 * fonds, pour ne pas mélanger deux dates de référence.
 *
 * Clé de titre (pour rapprocher un même sous-jacent entre fonds) : l'ISIN
 * canonique quand il est valide, sinon le nom normalisé — un ISIN reste la clé
 * de rapprochement la plus fiable (deux ETF World tiennent « Apple Inc » sous des
 * libellés légèrement différents mais le même ISIN US0378331005).
 */

import type { HoldingWeights } from "./overlap";
import type { HoldingInput } from "@/lib/esg/carbon-engine";
import { toCanonicalIsin } from "@/lib/data-engine/isin";

/** Ligne `fund_holdings` telle que lue en base (sous-ensemble utile). */
export interface FundHoldingRecord {
  asset_id: string;
  security_id?: string | null;
  security_isin: string | null;
  security_name: string;
  weight_pct: number | null;
  as_of: string;
  /** Enrichissements optionnels (jointure `securities`) pour le carbone. */
  sector?: string | null;
  region?: string | null;
}

/** Clé de rapprochement d'un titre : ISIN canonique si valide, sinon nom normalisé. */
export function securityKey(
  rec: Pick<FundHoldingRecord, "security_isin" | "security_name">,
): string {
  const isin = toCanonicalIsin(rec.security_isin);
  if (isin) return isin;
  return `name:${rec.security_name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/** Ne conserve, par fonds, que les lignes de la date de référence la plus récente. */
export function latestHoldingsByAsset(rows: FundHoldingRecord[]): Map<string, FundHoldingRecord[]> {
  const latestAsOf = new Map<string, string>();
  for (const r of rows) {
    const cur = latestAsOf.get(r.asset_id);
    if (!cur || r.as_of > cur) latestAsOf.set(r.asset_id, r.as_of);
  }
  const out = new Map<string, FundHoldingRecord[]>();
  for (const r of rows) {
    if (r.as_of !== latestAsOf.get(r.asset_id)) continue;
    const arr = out.get(r.asset_id) ?? [];
    arr.push(r);
    out.set(r.asset_id, arr);
  }
  return out;
}

/**
 * Construit la Map<assetId, HoldingWeights> attendue par `overlap.ts`. Poids
 * convertis en fraction (0..1) SANS renormalisation (l'overlap = Σ min(part_a,
 * part_b) travaille sur des parts absolues ; renormaliser fausserait la mesure
 * quand la couverture est partielle). Les doublons de titre dans un même fonds
 * sont sommés. Lignes sans poids > 0 ignorées.
 */
export function fundHoldingsToOverlapMap(rows: FundHoldingRecord[]): Map<string, HoldingWeights> {
  const byAsset = latestHoldingsByAsset(rows);
  const out = new Map<string, HoldingWeights>();
  for (const [assetId, holdings] of byAsset) {
    const hw: HoldingWeights = new Map();
    for (const h of holdings) {
      const w = h.weight_pct;
      if (w == null || !Number.isFinite(w) || w <= 0) continue;
      const key = securityKey(h);
      hw.set(key, (hw.get(key) ?? 0) + w / 100);
    }
    if (hw.size > 0) out.set(assetId, hw);
  }
  return out;
}

/**
 * Construit les `HoldingInput[]` du moteur carbone pour UN fonds, depuis sa
 * dernière composition. `securityId` = security_id (uuid) si présent, sinon
 * l'ISIN canonique (le moteur carbone rapproche l'émetteur par cet identifiant).
 * Une ligne sans identifiant de titre ni poids exploitable reste incluse avec
 * securityId=null : le moteur la classera `unavailable` (jamais inventée).
 */
export function fundHoldingsToCarbonInputs(
  rows: FundHoldingRecord[],
  assetId: string,
): HoldingInput[] {
  const byAsset = latestHoldingsByAsset(rows);
  const holdings = byAsset.get(assetId) ?? [];
  return holdings.map((h) => ({
    securityId: h.security_id ?? toCanonicalIsin(h.security_isin),
    weightPct: h.weight_pct ?? 0,
    sector: h.sector ?? null,
    region: h.region ?? null,
  }));
}
