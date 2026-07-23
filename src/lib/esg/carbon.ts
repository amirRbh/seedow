/**
 * Empreinte carbone de portefeuille — méthodologie alignée PCAF (Partnership for
 * Carbon Accounting Financials) / GHG Protocol.
 *
 * Deux notions distinctes, jamais confondues :
 *   - Intensité carbone : gCO₂e par € investi et par an (mesure intensive,
 *     comparable entre portefeuilles de tailles différentes).
 *   - Émissions financées : intensité × montant investi (mesure absolue, en kg/an).
 *
 * PCAF impose aussi un SCORE DE QUALITÉ DE DONNÉE (1 = meilleur, émissions
 * vérifiées/auditées … 5 = pire, estimé par proxy sectoriel). On l'expose pour
 * ne jamais présenter une estimation grossière comme une mesure — c'est le cœur
 * du contrat de transparence : la couverture ET la qualité sont affichées.
 *
 * Fonctions pures : aucune dépendance DB/UI. Tant qu'aucune valeur d'intensité
 * réelle n'est renseignée pour un actif, il ne compte pas dans la couverture —
 * on n'invente pas de chiffre (cf. audit ESG, contrat de transparence Seedow).
 */

export const PCAF_DATA_QUALITY_BEST = 1;
export const PCAF_DATA_QUALITY_WORST = 5;

export interface AssetCarbonInput {
  /** Poids de l'actif dans le portefeuille (0..1). */
  weight: number;
  /** Intensité carbone gCO₂e/€ investi/an, ou null si non renseignée. */
  intensityGco2ePerEur: number | null;
  /** Score de qualité PCAF 1..5 (1 = mesuré/audité, 5 = estimé), ou null. */
  dataQuality?: number | null;
}

export interface PortfolioCarbon {
  /** Intensité moyenne pondérée sur la part couverte, gCO₂e/€/an. null si couverture nulle. */
  intensityGco2ePerEur: number | null;
  /** Part du poids du portefeuille disposant d'une intensité réelle (0..1). */
  coverage: number;
  /** Score de qualité PCAF moyen pondéré sur la part couverte (1..5). null si aucune donnée de qualité. */
  dataQualityScore: number | null;
}

/** Borne et valide un score PCAF ; renvoie null si inexploitable. */
function normalizePcaf(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < PCAF_DATA_QUALITY_BEST || value > PCAF_DATA_QUALITY_WORST) return null;
  return value;
}

/**
 * Agrège l'empreinte carbone d'un portefeuille (mesure intensive), uniquement
 * sur les actifs disposant d'une intensité réelle. La qualité PCAF est moyennée
 * sur la part qui a effectivement un score.
 */
export function computePortfolioCarbon(assets: AssetCarbonInput[]): PortfolioCarbon {
  let intensityNumerator = 0;
  let coveredWeight = 0;
  let qualityNumerator = 0;
  let qualityWeight = 0;

  for (const a of assets) {
    if (!Number.isFinite(a.weight) || a.weight <= 0) continue;
    if (a.intensityGco2ePerEur == null || !Number.isFinite(a.intensityGco2ePerEur)) continue;
    if (a.intensityGco2ePerEur < 0) continue;

    intensityNumerator += a.weight * a.intensityGco2ePerEur;
    coveredWeight += a.weight;

    const q = normalizePcaf(a.dataQuality);
    if (q != null) {
      qualityNumerator += a.weight * q;
      qualityWeight += a.weight;
    }
  }

  return {
    intensityGco2ePerEur: coveredWeight > 0 ? intensityNumerator / coveredWeight : null,
    coverage: coveredWeight,
    dataQualityScore: qualityWeight > 0 ? qualityNumerator / qualityWeight : null,
  };
}

/**
 * Émissions financées absolues (kg CO₂e/an) pour un montant investi, à partir de
 * l'intensité (gCO₂e/€/an). null si l'intensité n'est pas connue.
 *
 * Note honnêteté : l'absolu n'est significatif que sur la part COUVERTE. On le
 * calcule sur le montant × couverture, pas sur le montant total, pour ne pas
 * extrapoler la donnée manquante.
 */
export function financedEmissionsKgPerYear(
  carbon: PortfolioCarbon,
  amountEur: number,
): number | null {
  if (carbon.intensityGco2ePerEur == null) return null;
  if (!Number.isFinite(amountEur) || amountEur <= 0) return null;
  const coveredAmount = amountEur * carbon.coverage;
  return (carbon.intensityGco2ePerEur * coveredAmount) / 1000; // g → kg
}

/**
 * Émissions ÉVITÉES (kg CO₂e/an) vs un indice de référence, sur la part couverte.
 * Positif = le portefeuille émet moins que la référence. Peut être NÉGATIF —
 * dans ce cas on l'affiche tel quel (pas de sur-promesse : cf. CLAUDE.md §1.3).
 *
 * `benchmarkIntensityGco2ePerEur` doit être fourni avec sa source et sa date par
 * l'appelant (ex. WACI MSCI World) — on ne code pas de constante non sourcée.
 */
export function avoidedVsBenchmarkKgPerYear(
  carbon: PortfolioCarbon,
  benchmarkIntensityGco2ePerEur: number,
  amountEur: number,
): number | null {
  if (carbon.intensityGco2ePerEur == null) return null;
  if (!Number.isFinite(benchmarkIntensityGco2ePerEur) || benchmarkIntensityGco2ePerEur < 0) {
    return null;
  }
  if (!Number.isFinite(amountEur) || amountEur <= 0) return null;
  const coveredAmount = amountEur * carbon.coverage;
  const deltaGPerEur = benchmarkIntensityGco2ePerEur - carbon.intensityGco2ePerEur;
  return (deltaGPerEur * coveredAmount) / 1000; // g → kg
}

// ─────────────────────────────────────────────────────────────────────────────
// WACI (Weighted Average Carbon Intensity, tCO₂e / M$ de CA) — l'indicateur PAI
// SFDR publié par les émetteurs. Intensité « par revenu » : sert à COMPARER un
// portefeuille à un indice de référence (« vs ETF/banque classique »), PAS à
// calculer des émissions absolues « par € investi » (ne pas convertir en km).
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetWaciInput {
  weight: number;
  /** WACI tCO₂e/M$ de CA, ou null si non renseigné. */
  waci: number | null;
}

export interface PortfolioWaci {
  /** WACI moyen pondéré sur la part couverte. null si couverture nulle. */
  waci: number | null;
  /** Part du poids disposant d'un WACI réel (0..1). */
  coverage: number;
}

/** Agrège le WACI d'un portefeuille sur les seuls actifs qui en ont un. */
export function computePortfolioWaci(assets: AssetWaciInput[]): PortfolioWaci {
  let numerator = 0;
  let covered = 0;
  for (const a of assets) {
    if (!Number.isFinite(a.weight) || a.weight <= 0) continue;
    if (a.waci == null || !Number.isFinite(a.waci) || a.waci < 0) continue;
    numerator += a.weight * a.waci;
    covered += a.weight;
  }
  return { waci: covered > 0 ? numerator / covered : null, coverage: covered };
}

export interface IntensityComparison {
  /** Écart relatif vs référence, (bench − port)/bench. Positif = plus propre. */
  deltaPct: number;
  /** true si le portefeuille est MOINS intensif que la référence. */
  cleaner: boolean;
}

/**
 * Compare l'intensité carbone (WACI) du portefeuille à un indice de référence.
 * Le WACI du benchmark doit être fourni avec sa source/date par l'appelant (ex.
 * WACI du MSCI World). Signe honnête : renvoie une valeur négative si le
 * portefeuille est PLUS intensif (pas de sur-promesse — CLAUDE.md §1.3).
 */
export function relativeIntensityVsBenchmark(
  portfolioWaci: number | null,
  benchmarkWaci: number,
): IntensityComparison | null {
  if (portfolioWaci == null || !Number.isFinite(portfolioWaci)) return null;
  if (!Number.isFinite(benchmarkWaci) || benchmarkWaci <= 0) return null;
  const deltaPct = (benchmarkWaci - portfolioWaci) / benchmarkWaci;
  return { deltaPct, cleaner: deltaPct > 0 };
}
