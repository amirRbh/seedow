/**
 * Moteur d'EXPOSITION d'un portefeuille — look-through, pondéré par la valeur
 * de marché. Fonctions pures, sans I/O, testées (`exposure.test.ts`).
 *
 * Formule unique, appliquée à chaque dimension (secteur, zone, devise) :
 *
 *   exposition(b) = Σ_positions  valeur_de_marché(p) × part_de_b_dans(p)
 *                   ─────────────────────────────────────────────────────
 *                                 valeur totale du portefeuille
 *
 * Trois règles d'honnêteté, vérifiées par les tests :
 *
 *  1. **Une donnée manquante n'est jamais un zéro.** La part d'une position
 *     dont la répartition est inconnue va dans un compartiment explicite
 *     « non ventilé » ; la couverture de chaque dimension est rendue.
 *  2. **Les pourcentages se lisent sur la valeur TOTALE.** Une exposition
 *     sectorielle n'est jamais renormalisée sur la seule partie connue : le
 *     lecteur voit 30 % Technologie et 25 % non ventilé, pas 40 % Technologie.
 *  3. **Pas de double comptage.** Un même titre détenu en direct et via deux
 *     fonds est agrégé en une ligne, avec le détail direct / indirect et la
 *     contribution de chaque position.
 */

/** Part d'une catégorie dans une position, en pourcentage (0..100), telle que publiée. */
export interface ExposureWeight {
  label: string;
  weightPct: number;
}

export interface UnderlyingHolding {
  /** Clé de rapprochement entre fonds (ISIN, ou ticker + nom normalisé). */
  key: string;
  name: string;
  sector: string | null;
  /** Part dans le fonds, en % (0..100). */
  weightPct: number;
}

export interface FundComposition {
  /** Répartitions publiées par l'émetteur (sur 100 % du fonds). */
  sector?: ExposureWeight[] | null;
  geography?: ExposureWeight[] | null;
  currency?: ExposureWeight[] | null;
  /** Positions sous-jacentes connues (souvent les plus grandes seulement). */
  holdings?: UnderlyingHolding[] | null;
}

export interface DirectSecurity {
  key: string;
  name: string;
  sector?: string | null;
  geography?: string | null;
  currency?: string | null;
}

export interface Position {
  id: string;
  label: string;
  marketValue: number;
  assetClass?: string | null;
  /** Frais courants annuels en fraction (0,002 = 0,20 %). `null` si inconnus. */
  ter?: number | null;
  kind: "fund" | "direct";
  composition?: FundComposition | null;
  security?: DirectSecurity | null;
}

export interface ExposureBucket {
  label: string;
  value: number;
  /** Part de la valeur TOTALE du portefeuille, en %. */
  weightPct: number;
}

export interface DimensionExposure {
  buckets: ExposureBucket[];
  /** Valeur dont la répartition est inconnue pour cette dimension. */
  unclassifiedValue: number;
  unclassifiedPct: number;
  /** Part de la valeur totale effectivement ventilée, en %. */
  coveragePct: number;
}

export interface LookThroughContribution {
  positionId: string;
  label: string;
  value: number;
  direct: boolean;
}

export interface LookThroughHolding {
  key: string;
  name: string;
  sector: string | null;
  directValue: number;
  indirectValue: number;
  totalValue: number;
  /** Part de la valeur totale du portefeuille, en %. */
  weightPct: number;
  contributions: LookThroughContribution[];
}

export interface PortfolioExposure {
  totalValue: number;
  positions: number;
  assetAllocation: ExposureBucket[];
  sector: DimensionExposure;
  geography: DimensionExposure;
  currency: DimensionExposure;
  /** Titres sous-jacents agrégés, par valeur décroissante. */
  holdings: LookThroughHolding[];
  /** Part de la valeur totale dont les titres sous-jacents sont connus, en %. */
  lookThroughCoveragePct: number;
  concentration: {
    /** Plus grosse position (niveau fonds/titre détenu), en % du total. */
    largestPositionPct: number;
    /** Indice de Herfindahl sur les positions détenues (0..1). */
    positionHhi: number;
    /** Nombre effectif de positions = 1 / HHI. */
    effectivePositions: number;
    /** Part du total portée par les 10 premiers titres SOUS-JACENTS connus (borne basse). */
    top10UnderlyingPct: number;
  };
  fees: {
    /** TER moyen pondéré par la valeur, sur la part dont les frais sont connus. `null` si aucune. */
    weightedTer: number | null;
    /** Coût annuel estimé en devise, sur la part couverte. */
    annualCost: number | null;
    coveragePct: number;
  };
  /**
   * Exposition au secteur Énergie au sens GICS (pétrole, gaz, charbon et leurs
   * services), lue dans les répartitions sectorielles publiées.
   */
  energy: {
    value: number;
    weightPct: number;
    /** Part de la valeur pour laquelle le secteur est connu : en dessous de 100 %, c'est une borne basse. */
    coveragePct: number;
    contributions: { positionId: string; label: string; value: number }[];
  };
  /** Codes de diagnostic (entrées ignorées, sommes incohérentes…). */
  issues: string[];
}

const ENERGY_LABELS = new Set(["energy", "énergie", "energie"]);
export const UNCLASSIFIED = "Non ventilé";

function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function round(n: number, digits = 6): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Clé de rapprochement d'un titre : ISIN s'il existe, sinon ticker + nom normalisés. */
export function securityKey(input: { isin?: string | null; ticker?: string | null; name: string }): string {
  const isin = input.isin?.trim().toUpperCase();
  if (isin && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return isin;
  const name = input.name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(INC|CORP|CORPORATION|PLC|SA|AG|NV|LTD|CLASS [A-Z]|CL [A-Z])\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${input.ticker?.trim().toUpperCase() ?? ""}|${name}`;
}

/** Valide les positions : valeur finie et positive. Les autres sont écartées, avec un code. */
function validPositions(positions: Position[], issues: string[]): Position[] {
  return positions.filter((p) => {
    if (!Number.isFinite(p.marketValue) || p.marketValue < 0) {
      issues.push(`invalid_market_value:${p.id}`);
      return false;
    }
    return true;
  });
}

function addTo(map: Map<string, number>, label: string, value: number) {
  map.set(label, (map.get(label) ?? 0) + value);
}

function finalizeDimension(map: Map<string, number>, unclassified: number, total: number): DimensionExposure {
  const buckets = [...map.entries()]
    .map(([label, value]) => ({ label, value: round(value, 4), weightPct: round(pct(value, total), 4) }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value);
  return {
    buckets,
    unclassifiedValue: round(unclassified, 4),
    unclassifiedPct: round(pct(unclassified, total), 4),
    coveragePct: round(pct(total - unclassified, total), 4),
  };
}

/**
 * Répartit la valeur d'une position selon une ventilation publiée. La part non
 * ventilée par la source (somme < 100 %) va au compartiment non ventilé ; une
 * somme > 100 % (dérivés, arrondis) est ramenée à 100 % et signalée.
 */
function spread(
  position: Position,
  weights: ExposureWeight[] | null | undefined,
  map: Map<string, number>,
  issues: string[],
  dimension: string,
): number {
  if (!weights || weights.length === 0) return position.marketValue;
  const sum = weights.reduce((s, w) => s + Math.max(0, w.weightPct), 0);
  const scale = sum > 100.5 ? 100 / sum : 1;
  if (scale !== 1) issues.push(`weights_over_100:${dimension}:${position.id}`);
  let assigned = 0;
  for (const w of weights) {
    if (!(w.weightPct > 0)) continue;
    const v = (position.marketValue * w.weightPct * scale) / 100;
    assigned += v;
    addTo(map, w.label, v);
  }
  return Math.max(0, position.marketValue - assigned);
}

export function computePortfolioExposure(input: Position[]): PortfolioExposure {
  const issues: string[] = [];
  const positions = validPositions(input, issues);
  const total = positions.reduce((s, p) => s + p.marketValue, 0);

  const assetMap = new Map<string, number>();
  const sectorMap = new Map<string, number>();
  const geoMap = new Map<string, number>();
  const ccyMap = new Map<string, number>();
  let sectorUnknown = 0;
  let geoUnknown = 0;
  let ccyUnknown = 0;

  const holdingMap = new Map<string, LookThroughHolding>();
  let lookThroughCovered = 0;

  let terValue = 0;
  let terWeighted = 0;

  let energyValue = 0;
  const energyContrib: PortfolioExposure["energy"]["contributions"] = [];

  for (const p of positions) {
    addTo(assetMap, p.assetClass ?? UNCLASSIFIED, p.marketValue);

    if (p.ter != null && Number.isFinite(p.ter) && p.ter >= 0) {
      terValue += p.marketValue;
      terWeighted += p.marketValue * p.ter;
    }

    if (p.kind === "direct") {
      const sec = p.security;
      if (sec?.sector) addTo(sectorMap, sec.sector, p.marketValue);
      else sectorUnknown += p.marketValue;
      if (sec?.geography) addTo(geoMap, sec.geography, p.marketValue);
      else geoUnknown += p.marketValue;
      if (sec?.currency) addTo(ccyMap, sec.currency, p.marketValue);
      else ccyUnknown += p.marketValue;
      if (sec) {
        lookThroughCovered += p.marketValue;
        mergeHolding(holdingMap, sec.key, sec.name, sec.sector ?? null, p, p.marketValue, true);
        if (sec.sector && ENERGY_LABELS.has(sec.sector.toLowerCase())) {
          energyValue += p.marketValue;
          energyContrib.push({ positionId: p.id, label: p.label, value: p.marketValue });
        }
      }
      continue;
    }

    const c = p.composition ?? null;
    sectorUnknown += spread(p, c?.sector, sectorMap, issues, "sector");
    geoUnknown += spread(p, c?.geography, geoMap, issues, "geography");
    ccyUnknown += spread(p, c?.currency, ccyMap, issues, "currency");

    const energyWeight = (c?.sector ?? [])
      .filter((w) => ENERGY_LABELS.has(w.label.toLowerCase()))
      .reduce((s, w) => s + w.weightPct, 0);
    if (energyWeight > 0) {
      const v = (p.marketValue * energyWeight) / 100;
      energyValue += v;
      energyContrib.push({ positionId: p.id, label: p.label, value: v });
    }

    if (c?.holdings && c.holdings.length > 0) {
      let listed = 0;
      for (const h of c.holdings) {
        if (!(h.weightPct > 0)) continue;
        const v = (p.marketValue * h.weightPct) / 100;
        listed += v;
        mergeHolding(holdingMap, h.key, h.name, h.sector, p, v, false);
      }
      lookThroughCovered += Math.min(listed, p.marketValue);
    }
  }

  const holdings = [...holdingMap.values()]
    .map((h) => ({ ...h, weightPct: round(pct(h.totalValue, total), 4) }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const positionWeights = positions.map((p) => (total > 0 ? p.marketValue / total : 0));
  const hhi = positionWeights.reduce((s, w) => s + w * w, 0);
  const top10 = holdings.slice(0, 10).reduce((s, h) => s + h.totalValue, 0);

  const energyCoverage = positions.reduce((s, p) => {
    if (p.kind === "direct") return s + (p.security?.sector ? p.marketValue : 0);
    return s + (p.composition?.sector?.length ? p.marketValue : 0);
  }, 0);

  return {
    totalValue: round(total, 4),
    positions: positions.length,
    assetAllocation: finalizeDimension(assetMap, 0, total).buckets,
    sector: finalizeDimension(sectorMap, sectorUnknown, total),
    geography: finalizeDimension(geoMap, geoUnknown, total),
    currency: finalizeDimension(ccyMap, ccyUnknown, total),
    holdings,
    lookThroughCoveragePct: round(pct(lookThroughCovered, total), 4),
    concentration: {
      largestPositionPct: round(Math.max(0, ...positionWeights) * 100, 4),
      positionHhi: round(hhi, 6),
      effectivePositions: hhi > 0 ? round(1 / hhi, 4) : 0,
      top10UnderlyingPct: round(pct(top10, total), 4),
    },
    fees: {
      weightedTer: terValue > 0 ? round(terWeighted / terValue, 8) : null,
      annualCost: terValue > 0 ? round(terWeighted, 4) : null,
      coveragePct: round(pct(terValue, total), 4),
    },
    energy: {
      value: round(energyValue, 4),
      weightPct: round(pct(energyValue, total), 4),
      coveragePct: round(pct(energyCoverage, total), 4),
      contributions: energyContrib.sort((a, b) => b.value - a.value),
    },
    issues,
  };
}

function mergeHolding(
  map: Map<string, LookThroughHolding>,
  key: string,
  name: string,
  sector: string | null,
  position: Position,
  value: number,
  direct: boolean,
) {
  const existing = map.get(key);
  const h: LookThroughHolding = existing ?? {
    key,
    name,
    sector,
    directValue: 0,
    indirectValue: 0,
    totalValue: 0,
    weightPct: 0,
    contributions: [],
  };
  if (direct) h.directValue += value;
  else h.indirectValue += value;
  h.totalValue += value;
  if (!h.sector && sector) h.sector = sector;
  const prior = h.contributions.find((c) => c.positionId === position.id);
  if (prior) prior.value += value;
  else h.contributions.push({ positionId: position.id, label: position.label, value, direct });
  map.set(key, h);
}
