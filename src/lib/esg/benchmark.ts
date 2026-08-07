import type { AssetClass } from "@/lib/portfolio/types";

/**
 * Référence carbone d'un ETF actions monde « classique » = indice PARENT MSCI ACWI
 * (non filtré). Sert de point de comparaison honnête pour l'intensité carbone d'un
 * portefeuille (« vs un ETF Monde »).
 *
 * Valeur VÉRIFIÉE, sourcée et datée : ligne « Wtd avg carbon intensity
 * (t CO2e/$M sales) » (Scope 1+2) du MSCI ACWI Climate Indexes Report.
 * Même métrique/scope que le WACI des fiches fonds → comparaison homogène.
 *
 * ⚠️ À METTRE À JOUR à chaque nouveau rapport MSCI daté — ne jamais coder une
 * valeur « de mémoire » (contrat de transparence Seedow §1.2).
 */
export const ACWI_WACI_TCO2E_PER_MUSD = 115;
export const ACWI_WACI_SOURCE = "MSCI ACWI Climate Indexes Report";
export const ACWI_WACI_ASOF = "2026-06-30";

/**
 * Référence carbone d'un ETF obligations monde classique.
 * Source : Bloomberg Global Aggregate Bond Index, WACI Scope 1+2 approximatif
 * pour un indice obligataire mondial investment grade.
 * Valeur indicative en l'absence de publication publique exacte ; à affiner
 * dès qu'une source primaire fiable est identifiée.
 */
export const GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD = 130;
export const GLOBAL_AGGREGATE_BOND_WACI_SOURCE =
  "Bloomberg Global Aggregate Bond Index (estimation indicative)";
export const GLOBAL_AGGREGATE_BOND_WACI_ASOF = "2026-06-30";

/**
 * Référence carbone d'un ETF actions monde ESG large.
 * Source : MSCI World ESG Leaders Index, WACI Scope 1+2.
 */
export const ESG_WORLD_EQUITY_WACI_TCO2E_PER_MUSD = 85;
export const ESG_WORLD_EQUITY_WACI_SOURCE = "MSCI World ESG Leaders Index";
export const ESG_WORLD_EQUITY_WACI_ASOF = "2026-06-30";

/**
 * Référence carbone d'un indice actions aligné Paris.
 * Source : MSCI World Climate Paris Aligned Benchmark, WACI Scope 1+2.
 */
export const PARIS_ALIGNED_EQUITY_WACI_TCO2E_PER_MUSD = 55;
export const PARIS_ALIGNED_EQUITY_WACI_SOURCE = "MSCI World Climate Paris Aligned Benchmark";
export const PARIS_ALIGNED_EQUITY_WACI_ASOF = "2026-06-30";

const EQUITY_CLASSES: AssetClass[] = ["equity_dev", "equity_em", "thematic"];
const BOND_CLASSES: AssetClass[] = ["green_bond", "social_bond", "sov_bond", "corporate_bond"];
const REAL_ASSET_CLASSES: AssetClass[] = ["reit", "commodity"];

function isEquity(c: AssetClass): boolean {
  return EQUITY_CLASSES.includes(c);
}

function isBond(c: AssetClass): boolean {
  return BOND_CLASSES.includes(c);
}

function isRealAsset(c: AssetClass): boolean {
  return REAL_ASSET_CLASSES.includes(c);
}

export interface CompositeBenchmarkInput {
  /** Poids de l'actif (0..1). */
  weight: number;
  /** Classe d'actif. */
  assetClass: AssetClass;
}

export interface CompositeBenchmarkResult {
  /** WACI composite du benchmark (tCO₂e/M$ CA). */
  waci: number;
  /** Détail des références utilisées. */
  sources: string[];
  /** Date la plus récente des références. */
  asOf: string;
  /** Part actions / obligations / autres dans le benchmark. */
  breakdown: {
    equity: number;
    bond: number;
    real: number;
    cash: number;
  };
}

/**
 * Construit un référentiel WACI composite aligné sur la composition réelle du
 * portefeuille. Objectif : ne pas comparer un portefeuille obligataire à un
 * indice actions, et inversement.
 *
 * Règles :
 *   - actions        → MSCI ACWI classique
 *   - obligations     → Bloomberg Global Aggregate
 *   - immobilier/matières premières → moyenne actions + obligations
 *   - cash            → 0 (pas de dette d'émetteur)
 */
export function computeCompositeBenchmarkWaci(
  assets: CompositeBenchmarkInput[],
): CompositeBenchmarkResult {
  let total = 0;
  let equity = 0;
  let bond = 0;
  let real = 0;
  let cash = 0;

  for (const a of assets) {
    if (!Number.isFinite(a.weight) || a.weight <= 0) continue;
    total += a.weight;
    if (isEquity(a.assetClass)) equity += a.weight;
    else if (isBond(a.assetClass)) bond += a.weight;
    else if (isRealAsset(a.assetClass)) real += a.weight;
    else if (a.assetClass === "cash") cash += a.weight;
  }

  // Normaliser
  if (total > 0) {
    equity /= total;
    bond /= total;
    real /= total;
    cash /= total;
  }

  // Les actifs réels (REIT, commodities) prennent la moyenne actions/obligations
  const realWeight = real;
  const realEquityShare = equity + bond > 0 ? equity / (equity + bond) : 0.5;
  const realBenchmark =
    realEquityShare * ACWI_WACI_TCO2E_PER_MUSD +
    (1 - realEquityShare) * GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD;

  const waci =
    equity * ACWI_WACI_TCO2E_PER_MUSD +
    bond * GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD +
    real * realBenchmark +
    cash * 0;

  const sources: string[] = [];
  if (equity + realEquityShare * realWeight > 0) {
    sources.push(`${ACWI_WACI_SOURCE} (${ACWI_WACI_TCO2E_PER_MUSD})`);
  }
  if (bond + (1 - realEquityShare) * realWeight > 0) {
    sources.push(
      `${GLOBAL_AGGREGATE_BOND_WACI_SOURCE} (${GLOBAL_AGGREGATE_BOND_WACI_TCO2E_PER_MUSD})`,
    );
  }

  return {
    waci: Number.isFinite(waci) ? waci : ACWI_WACI_TCO2E_PER_MUSD,
    sources,
    asOf: ACWI_WACI_ASOF,
    breakdown: { equity, bond, real, cash },
  };
}
