/**
 * Classification durable INDÉPENDANTE de SFDR (Blueprint moat — Phase B4).
 *
 * Pourquoi : la classification SFDR (articles 6/8/9) est en cours de refonte vers
 * un régime de labels (proposition Commission européenne COM(2025) 841, nov. 2025).
 * Indexer la promesse « durable » de Seedow sur l'article SFDR la rendrait
 * obsolète du jour au lendemain. On dérive donc la classification des **signaux
 * bruts observables** (carbone réel, trajectoire de température, ESG, exclusions),
 * qui, eux, ne disparaissent pas avec la réglementation. L'article SFDR n'est plus
 * qu'un **signal corroborant**, jamais le déterminant.
 *
 * Fonctions pures, sans I/O. Contrat de transparence (§1.2) : chaque tier est
 * accompagné de ses « drivers » (raisons), et une couverture de données faible
 * abaisse la confiance plutôt que d'affirmer à tort.
 *
 * Échelles : esgScore / climateScore sur 0..100 (comme `assets.esg_score`) ;
 * WACI en tCO₂e/M$ de CA (même métrique que `benchmark.ts`).
 */

export type SustainabilityTier =
  | "paris_aligned" // preuves fortes d'alignement (température et/ou carbone très bas + ESG solide)
  | "transition" // en amélioration : signaux modérés, trajectoire crédible
  | "broad_esg" // orientation ESG mais sans preuve climat forte
  | "insufficient_evidence"; // données trop partielles ou contradictoires pour trancher

export type ClassificationConfidence = "high" | "medium" | "low";

/** Ids stables, traduits côté UI (clés i18n `sustainability.drivers.*`). */
export type SustainabilityDriver =
  | "temp_aligned" // ITR ≤ 1,5 °C
  | "temp_transition" // ITR ≤ 2,0 °C
  | "temp_misaligned" // ITR > 2,0 °C
  | "carbon_far_below_benchmark" // WACI très inférieur à la référence
  | "carbon_below_benchmark"
  | "carbon_above_benchmark"
  | "esg_strong"
  | "esg_moderate"
  | "esg_weak"
  | "has_exclusions"
  | "no_exclusions"
  | "low_data_coverage"
  | "sfdr_corroborates" // l'article SFDR déclaré va dans le même sens
  | "sfdr_contradicts"; // …ou le contredit (à vérifier)

export type DataCoverage = "complete" | "partial" | "estimated";

export interface SustainabilitySignals {
  /** Score ESG global 0..100, ou null si inconnu. */
  esgScore: number | null;
  /** Score climat / pilier E 0..100, ou null. */
  climateScore: number | null;
  /** WACI mesuré (tCO₂e/M$ CA), ou null si non couvert. */
  waci: number | null;
  /** Référence WACI comparable (ex. ACWI 115), ou null. */
  benchmarkWaci: number | null;
  /** Bande Implied Temperature Rise normalisée (ex. ">2.5-3.0°C", "1.5°C"), ou null. */
  impliedTempRise: string | null;
  /** Nombre de secteurs formellement exclus. */
  exclusionsCount: number;
  /** Couverture de NOS données pour cet actif. */
  dataCoverage: DataCoverage;
  /** Article SFDR déclaré (6/8/9) — signal corroborant uniquement, ou null. */
  sfdrArticle: number | null;
}

export interface SustainabilityProfile {
  tier: SustainabilityTier;
  drivers: SustainabilityDriver[];
  confidence: ClassificationConfidence;
  /** Toujours vrai : le tier ne dépend jamais du seul article SFDR. */
  sfdrIndependent: true;
  /**
   * Score Seedow 0..100 — composite pondéré PROPRIÉTAIRE (méthodologie
   * publiée et versionnée sur `/methodologie`, cf. `SEEDOW_SCORE_VERSION`).
   * Jamais basé sur SFDR (même garantie que le tier) : c'est ce qui le
   * distingue d'un simple relais d'un score tiers (MSCI…) — un concurrent ne
   * peut pas le recopier sans reproduire toute la chaîne de signaux + poids.
   * `null` si aucun pilier n'est exploitable.
   */
  score: number | null;
}

// ── Seuils nommés (pas de nombre magique). Échelle 0..100 pour ESG/climat. ──
const ESG_STRONG = 70;
const ESG_MODERATE = 55;
const CLIMATE_STRONG = 60;
/** Part de la référence en-dessous de laquelle le carbone est « très bas »
 *  (les indices Paris-aligned visent ~50 % sous l'indice parent). */
const CARBON_FAR_BELOW_RATIO = 0.6;
const TEMP_ALIGNED_C = 1.5;
const TEMP_TRANSITION_C = 2.0;

// ── Score Seedow (composite pondéré, méthodologie propriétaire — publiée et
// versionnée sur /methodologie). 3 piliers, jamais SFDR : c'est le point qui
// le distingue d'un simple relais d'un score tiers. Un pilier absent est
// exclu et les poids restants renormalisés (même logique que completeness.ts)
// — pas de valeur neutre inventée pour un signal manquant.
export const SEEDOW_SCORE_VERSION = "1.0";
const W_ESG = 0.4;
const W_CLIMATE = 0.4;
const W_EXCLUSIONS = 0.2;
/** Au-delà de cette trajectoire, le sous-score température tombe à 0. */
const TEMP_SCORE_WORST_C = 4.0;
/** Au-delà de ce multiple de la référence, le sous-score carbone tombe à 0. */
const CARBON_SCORE_RATIO_CAP = 2;
/** Nombre d'exclusions actives pour le crédit plein (2x le nombre habituel
 *  d'exclusions posées à l'onboarding — cf. §2 CLAUDE.md). */
const EXCLUSIONS_FULL_CREDIT = 4;

function tempSubScore(tempC: number | null): number | null {
  if (tempC == null) return null;
  if (tempC <= TEMP_ALIGNED_C) return 100;
  if (tempC >= TEMP_SCORE_WORST_C) return 0;
  return Math.round((100 * (TEMP_SCORE_WORST_C - tempC)) / (TEMP_SCORE_WORST_C - TEMP_ALIGNED_C));
}

function carbonSubScore(waci: number | null, benchmarkWaci: number | null): number | null {
  if (waci == null || benchmarkWaci == null || benchmarkWaci <= 0) return null;
  const ratio = waci / benchmarkWaci;
  return Math.round(Math.min(100, Math.max(0, 100 * (1 - ratio / CARBON_SCORE_RATIO_CAP))));
}

/** Composite pondéré : renormalise sur les piliers réellement exploitables. */
function computeSeedowScore(
  esg: number | null,
  tempC: number | null,
  waci: number | null,
  benchmarkWaci: number | null,
  exclusions: number,
): number | null {
  const climateParts = [tempSubScore(tempC), carbonSubScore(waci, benchmarkWaci)].filter(
    (v): v is number => v != null,
  );
  const climate = climateParts.length
    ? climateParts.reduce((a, b) => a + b, 0) / climateParts.length
    : null;
  const exclusionsScore = Math.min(100, (exclusions / EXCLUSIONS_FULL_CREDIT) * 100);

  const pillars: Array<[number, number | null]> = [
    [W_ESG, esg],
    [W_CLIMATE, climate],
    [W_EXCLUSIONS, exclusionsScore],
  ];
  const present = pillars.filter((p): p is [number, number] => p[1] != null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((acc, [w]) => acc + w, 0);
  const weighted = present.reduce((acc, [w, v]) => acc + w * v, 0);
  return Math.round(weighted / totalWeight);
}

/** Borne un score dans [0..100], ou null si non exploitable. */
function clampScore(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, v));
}

/**
 * Extrait la borne HAUTE d'une bande ITR ("> 2.5-3.0°C" → 3.0 ; "1.5°C" → 1.5).
 * On prend la borne haute = lecture prudente (pire cas de la fourchette).
 */
export function parseImpliedTempC(band: string | null): number | null {
  if (!band) return null;
  const nums = [...band.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const finite = nums.filter((n) => Number.isFinite(n));
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

/**
 * Dérive un profil de durabilité à partir des signaux bruts. Robuste à la
 * disparition de SFDR : `sfdrArticle` n'entre que comme driver corroborant.
 */
export function deriveSustainabilityProfile(signals: SustainabilitySignals): SustainabilityProfile {
  const drivers: SustainabilityDriver[] = [];
  const esg = clampScore(signals.esgScore);
  const climate = clampScore(signals.climateScore);
  const exclusions = Number.isFinite(signals.exclusionsCount)
    ? Math.max(0, Math.floor(signals.exclusionsCount))
    : 0;

  // ── Trajectoire température (signal le plus fort quand présent) ──
  const tempC = parseImpliedTempC(signals.impliedTempRise);
  let tempAligned = false;
  let tempTransition = false;
  if (tempC != null) {
    if (tempC <= TEMP_ALIGNED_C) {
      tempAligned = true;
      drivers.push("temp_aligned");
    } else if (tempC <= TEMP_TRANSITION_C) {
      tempTransition = true;
      drivers.push("temp_transition");
    } else {
      drivers.push("temp_misaligned");
    }
  }

  // ── Carbone vs référence ──
  let carbonFarBelow = false;
  let carbonBelow = false;
  if (signals.waci != null && signals.benchmarkWaci != null && signals.benchmarkWaci > 0) {
    const ratio = signals.waci / signals.benchmarkWaci;
    if (ratio <= CARBON_FAR_BELOW_RATIO) {
      carbonFarBelow = true;
      drivers.push("carbon_far_below_benchmark");
    } else if (ratio < 1) {
      carbonBelow = true;
      drivers.push("carbon_below_benchmark");
    } else {
      drivers.push("carbon_above_benchmark");
    }
  }

  // ── Force ESG ──
  let esgStrong = false;
  let esgModerate = false;
  if (esg != null) {
    if (esg >= ESG_STRONG) {
      esgStrong = true;
      drivers.push("esg_strong");
    } else if (esg >= ESG_MODERATE) {
      esgModerate = true;
      drivers.push("esg_moderate");
    } else {
      drivers.push("esg_weak");
    }
  }

  const climateStrong = climate != null && climate >= CLIMATE_STRONG;
  drivers.push(exclusions > 0 ? "has_exclusions" : "no_exclusions");

  // ── SFDR : corroboration uniquement (n'entre PAS dans la décision de tier) ──
  const claimsSustainable = signals.sfdrArticle === 8 || signals.sfdrArticle === 9;

  // ── Décision de tier, dérivée des signaux bruts ──
  let tier: SustainabilityTier;
  if (signals.dataCoverage === "estimated" && !tempAligned && !carbonFarBelow) {
    // Preuves trop faibles/estimées et aucun signal fort → on ne tranche pas.
    tier = "insufficient_evidence";
  } else if ((tempAligned || carbonFarBelow) && (esgStrong || esgModerate) && exclusions > 0) {
    tier = "paris_aligned";
  } else if (tempTransition || carbonBelow || (esgStrong && climateStrong)) {
    tier = "transition";
  } else if (esgStrong || esgModerate) {
    tier = "broad_esg";
  } else {
    tier = "insufficient_evidence";
  }

  // Corroboration SFDR (après coup, sans changer le tier).
  const derivedSustainable = tier === "paris_aligned" || tier === "transition";
  if (signals.sfdrArticle != null) {
    if (claimsSustainable === derivedSustainable) drivers.push("sfdr_corroborates");
    else drivers.push("sfdr_contradicts");
  }

  // ── Confiance = fonction de la couverture de données ──
  let confidence: ClassificationConfidence;
  if (signals.dataCoverage === "complete") confidence = "high";
  else if (signals.dataCoverage === "partial") confidence = "medium";
  else {
    confidence = "low";
    drivers.push("low_data_coverage");
  }

  const score = computeSeedowScore(esg, tempC, signals.waci, signals.benchmarkWaci, exclusions);

  return { tier, drivers, confidence, sfdrIndependent: true, score };
}
