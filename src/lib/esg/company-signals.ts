/**
 * SIGNAUX ESG AU NIVEAU ENTREPRISE — la brique qui rend possible le score de
 * fonds « par transparisation » (cf. `docs/esg-holdings-beta.md` §4).
 *
 * Le principe : plutôt que d'acheter une note ESG de fonds (jamais gratuite,
 * et opaque), on agrège des signaux publiés au niveau **entreprise** en les
 * pondérant par les holdings réelles du fonds :
 *
 *     signal_fonds = Σ (poids_titre_i × signal_entreprise_i)
 *
 * Deux règles non négociables portées par ce module :
 *
 * 1. **Rien n'est deviné.** Un titre non apparié n'est jamais imputé, ni par une
 *    moyenne de secteur ni par un défaut : il reste `unmatched` et son poids est
 *    comptabilisé à part (§1.3).
 * 2. **La couverture est une donnée de premier rang**, pas une note de bas de
 *    page. Toute agrégation renvoie le poids réellement couvert, pour que l'UI
 *    puisse afficher « calculé sur 82 % des encours » (§1.2).
 *
 * L'appariement se fait par **identifiant** (ISIN, puis LEI), jamais par nom :
 * mesuré, l'appariement par nom produit des faux positifs grossiers
 * (« Johnson & Johnson » → « Johnson Farms »), inacceptables sur une donnée
 * présentée comme sourcée.
 */

/**
 * Statut d'objectif climat tel que **publié** par la source, ramené à un
 * ensemble fermé. Tout libellé non reconnu devient `unknown` — on ne suppose
 * jamais le sens d'une valeur inconnue.
 */
export type ClimateTargetStatus = "targets_set" | "committed" | "commitment_removed" | "unknown";

/** Un enregistrement de signal pour une entreprise, tel que publié. */
export interface CompanySignal {
  /** ISIN(s) rattachés à l'entreprise par la source (souvent aucun). */
  isins: string[];
  lei: string | null;
  companyName: string;
  status: ClimateTargetStatus;
  /** Libellé brut du statut, conservé pour l'affichage et la traçabilité. */
  statusLabel: string;
  /** Ex. « 1.5°C », « Well-below 2°C » — null si non publié. */
  temperatureAlignment: string | null;
  netZeroStatus: ClimateTargetStatus;
  sector: string | null;
  /** Date de mise à jour publiée par la source (§1.2 : tout chiffre est daté). */
  dateUpdated: string | null;
}

/** Index d'appariement par identifiant. */
export interface CompanySignalIndex {
  byIsin: Map<string, CompanySignal>;
  byLei: Map<string, CompanySignal>;
  /** Nombre d'enregistrements réellement indexables (au moins un identifiant). */
  indexedCount: number;
  /** Enregistrements écartés faute d'identifiant exploitable. */
  skippedCount: number;
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
const LEI_RE = /^[A-Z0-9]{20}$/;

/** Normalise un statut publié. Inconnu → `unknown`, jamais un défaut optimiste. */
export function normalizeTargetStatus(raw: string | null | undefined): ClimateTargetStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "") return "unknown";
  if (s.includes("removed")) return "commitment_removed";
  if (s.includes("targets set")) return "targets_set";
  if (s.includes("committed") || s.includes("commitment")) return "committed";
  return "unknown";
}

/** Extrait les ISIN valides d'un champ pouvant en contenir plusieurs. */
export function parseIsinField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[;,|\s]+/)
        .map((t) => t.trim().toUpperCase())
        .filter((t) => ISIN_RE.test(t)),
    ),
  ];
}

/** Ligne brute telle que lue du jeu de données publié (colonnes SBTi). */
export interface RawCompanyRow {
  company_name?: string | null;
  isin?: string | null;
  lei?: string | null;
  sector?: string | null;
  near_term_status?: string | null;
  near_term_target_classification?: string | null;
  net_zero_status?: string | null;
  date_updated?: string | null;
}

/** Convertit une ligne brute en signal. Ne complète aucun champ absent. */
export function toCompanySignal(row: RawCompanyRow): CompanySignal {
  const lei = (row.lei ?? "").trim().toUpperCase();
  const label = (row.near_term_status ?? "").trim();
  const temp = (row.near_term_target_classification ?? "").trim();
  return {
    isins: parseIsinField(row.isin),
    lei: LEI_RE.test(lei) ? lei : null,
    companyName: (row.company_name ?? "").trim(),
    status: normalizeTargetStatus(label),
    statusLabel: label,
    temperatureAlignment: temp === "" ? null : temp,
    netZeroStatus: normalizeTargetStatus(row.net_zero_status),
    sector: (row.sector ?? "").trim() || null,
    dateUpdated: (row.date_updated ?? "").trim() || null,
  };
}

/**
 * Construit l'index d'appariement. Une entreprise sans ISIN ni LEI est
 * **écartée** et comptée dans `skippedCount` : sans identifiant, elle ne peut
 * être appariée sans risque de faux positif.
 */
export function buildCompanySignalIndex(rows: RawCompanyRow[]): CompanySignalIndex {
  const byIsin = new Map<string, CompanySignal>();
  const byLei = new Map<string, CompanySignal>();
  let indexed = 0;
  let skipped = 0;

  for (const row of rows) {
    const sig = toCompanySignal(row);
    if (sig.isins.length === 0 && !sig.lei) {
      skipped++;
      continue;
    }
    indexed++;
    for (const isin of sig.isins) if (!byIsin.has(isin)) byIsin.set(isin, sig);
    if (sig.lei && !byLei.has(sig.lei)) byLei.set(sig.lei, sig);
  }
  return { byIsin, byLei, indexedCount: indexed, skippedCount: skipped };
}

/** Une position de fonds à apparier. */
export interface SignalHolding {
  isin: string | null;
  /** LEI du titre s'il a été résolu en amont (GLEIF). */
  lei?: string | null;
  /** Poids dans le fonds, en pourcentage (0..100). */
  weightPct: number | null;
}

/** Résultat d'appariement pour une position. */
export interface HoldingSignalMatch {
  isin: string | null;
  weightPct: number;
  signal: CompanySignal | null;
  /** Comment l'appariement a été obtenu — pour la traçabilité à l'écran. */
  matchedBy: "isin" | "lei" | null;
}

/** Apparie une position, par ISIN d'abord puis par LEI. Jamais par nom. */
export function matchHolding(
  index: CompanySignalIndex,
  holding: SignalHolding,
): HoldingSignalMatch {
  const weightPct = holding.weightPct ?? 0;
  const isin = holding.isin ? holding.isin.trim().toUpperCase() : null;
  if (isin) {
    const hit = index.byIsin.get(isin);
    if (hit) return { isin, weightPct, signal: hit, matchedBy: "isin" };
  }
  const lei = holding.lei ? holding.lei.trim().toUpperCase() : null;
  if (lei) {
    const hit = index.byLei.get(lei);
    if (hit) return { isin, weightPct, signal: hit, matchedBy: "lei" };
  }
  return { isin, weightPct, signal: null, matchedBy: null };
}

/**
 * Agrégation au niveau fonds. `coveredWeightPct` et `unmatchedWeightPct` sont
 * les deux chiffres que l'UI doit afficher : sans eux, une répartition par
 * statut est trompeuse (§1.3).
 */
export interface FundSignalSummary {
  /** Somme des poids des positions appariées. */
  coveredWeightPct: number;
  /** Somme des poids de toutes les positions soumises. */
  totalWeightPct: number;
  /** Part du fonds réellement couverte, 0..1 — `null` si rien à couvrir. */
  coverageRatio: number | null;
  /** Somme des poids non appariés (jamais imputée). */
  unmatchedWeightPct: number;
  /** Poids par statut, sur les seules positions appariées. */
  weightByStatus: Record<ClimateTargetStatus, number>;
  matchedCount: number;
  unmatchedCount: number;
}

const EMPTY_STATUS: () => Record<ClimateTargetStatus, number> = () => ({
  targets_set: 0,
  committed: 0,
  commitment_removed: 0,
  unknown: 0,
});

/** Arrondi de présentation, pour éviter les traînées de flottants à l'écran. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function summarizeFundSignals(
  index: CompanySignalIndex,
  holdings: SignalHolding[],
): FundSignalSummary {
  const weightByStatus = EMPTY_STATUS();
  let covered = 0;
  let total = 0;
  let unmatched = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const h of holdings) {
    const m = matchHolding(index, h);
    total += m.weightPct;
    if (m.signal) {
      covered += m.weightPct;
      matchedCount++;
      weightByStatus[m.signal.status] += m.weightPct;
    } else {
      unmatched += m.weightPct;
      unmatchedCount++;
    }
  }

  for (const k of Object.keys(weightByStatus) as ClimateTargetStatus[]) {
    weightByStatus[k] = round2(weightByStatus[k]);
  }

  return {
    coveredWeightPct: round2(covered),
    totalWeightPct: round2(total),
    coverageRatio: total > 0 ? covered / total : null,
    unmatchedWeightPct: round2(unmatched),
    weightByStatus,
    matchedCount,
    unmatchedCount,
  };
}
