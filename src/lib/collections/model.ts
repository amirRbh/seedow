/**
 * Logique PURE des collections (pivot PIU, §8). Aucune I/O, testée isolément.
 *
 * Une collection porte des poids LIBRES selon son mode ; ce module calcule les
 * poids EFFECTIFS (normalisés à 1) sans jamais corriger en silence ce que
 * l'utilisateur a saisi : on RÉVÈLE l'écart à 100 % plutôt que de le masquer.
 *
 * Feedback immédiat (§8.3) : dès le 2ᵉ actif, une concentration exploitable.
 * Honnêteté (§9.1) : cette concentration est calculée au niveau du FONDS, pas
 * en look-through — elle est donc explicitement étiquetée « fund-level ». La
 * vraie diversification (par titre sous-jacent) dépend de `fund_holdings` et
 * viendra avec le look-through (étape ultérieure). On ne présente jamais une
 * concentration fund-level comme la diversification réelle.
 */

export type WeightMode = "equal" | "manual" | "amount";

export interface CollectionItem {
  assetId: string;
  /** Poids saisi (mode 'manual'), en %. */
  weightPct?: number | null;
  /** Montant (mode 'amount'). */
  amount?: number | null;
  note?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  weightMode: WeightMode;
  items: CollectionItem[];
  createdAt: string;
  updatedAt: string;
}

/** Poids effectifs (assetId → part ∈ [0,1], somme = 1), selon le mode. */
export function effectiveWeights(
  items: CollectionItem[],
  mode: WeightMode,
): Record<string, number> {
  const ids = items.map((i) => i.assetId);
  const n = ids.length;
  const out: Record<string, number> = {};
  if (n === 0) return out;

  if (mode === "equal") {
    for (const id of ids) out[id] = 1 / n;
    return out;
  }

  const pick = (i: CollectionItem): number => {
    const raw = mode === "manual" ? i.weightPct : i.amount;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
  };
  let total = 0;
  for (const i of items) total += pick(i);

  // Aucune valeur exploitable dans ce mode → repli equal-weight (honnête : on ne
  // fabrique pas de poids arbitraires, on répartit également).
  if (total <= 0) {
    for (const id of ids) out[id] = 1 / n;
    return out;
  }
  for (const i of items) out[i.assetId] = pick(i) / total;
  return out;
}

/**
 * Somme brute des poids saisis (mode 'manual'), en %, pour signaler l'écart à
 * 100 % SANS corriger. Renvoie null hors mode 'manual' (rien à révéler).
 */
export function manualWeightSum(items: CollectionItem[], mode: WeightMode): number | null {
  if (mode !== "manual") return null;
  let sum = 0;
  for (const i of items) {
    if (typeof i.weightPct === "number" && Number.isFinite(i.weightPct)) sum += i.weightPct;
  }
  return sum;
}

/** Indice de concentration Herfindahl (HHI) sur des parts ∈ [0,1] : Σ wᵢ². */
export function herfindahl(weights: Record<string, number>): number {
  let hhi = 0;
  for (const w of Object.values(weights)) hhi += w * w;
  return hhi;
}

export interface ConcentrationFeedback {
  /** Nombre de lignes (fonds/actifs) dans la collection. */
  lines: number;
  /** HHI fund-level ∈ [0,1] (1 = tout sur une ligne). */
  hhi: number;
  /**
   * « Nombre effectif de lignes » = 1/HHI (équivalent-N). Plus lisible que le
   * HHI brut pour l'utilisateur (« ~3 lignes équivalentes »).
   */
  effectiveLines: number;
  /** Part de la plus grosse ligne ∈ [0,1]. */
  topWeight: number;
  /**
   * TRUE : cette concentration est calculée au niveau du FONDS, pas en
   * look-through. La diversification réelle (par titre sous-jacent) peut être
   * bien pire si des fonds se recouvrent — à mesurer avec les holdings.
   */
  fundLevelOnly: true;
}

/** Feedback de concentration immédiat, honnêtement étiqueté fund-level. */
export function concentrationFeedback(
  items: CollectionItem[],
  mode: WeightMode,
): ConcentrationFeedback | null {
  if (items.length === 0) return null;
  const weights = effectiveWeights(items, mode);
  const hhi = herfindahl(weights);
  const topWeight = Object.values(weights).reduce((m, w) => (w > m ? w : m), 0);
  return {
    lines: items.length,
    hhi,
    effectiveLines: hhi > 0 ? 1 / hhi : items.length,
    topWeight,
    fundLevelOnly: true,
  };
}

// ── Opérations immuables (le hook orchestre la persistance ; ceci reste pur) ──

/** Ajoute un actif s'il n'y est pas déjà (idempotent). */
export function addItem(items: CollectionItem[], item: CollectionItem): CollectionItem[] {
  if (items.some((i) => i.assetId === item.assetId)) return items;
  return [...items, item];
}

/** Retire un actif. */
export function removeItem(items: CollectionItem[], assetId: string): CollectionItem[] {
  return items.filter((i) => i.assetId !== assetId);
}

/** Vrai si l'actif est déjà dans la collection. */
export function hasItem(items: CollectionItem[], assetId: string): boolean {
  return items.some((i) => i.assetId === assetId);
}
