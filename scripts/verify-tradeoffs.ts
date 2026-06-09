/**
 * Sanity check tradeoffs.functions.ts: rerun buildPortfolio for baseline + alternatives
 * with a controlled synthetic universe and verify each invariant the UI relies on.
 *
 * Invariants tested:
 *   I1. Removing an exclusion ⇒ pool size grows or stays the same.
 *   I2. Removing an exclusion ⇒ expected_return of the optimum grows or stays the same
 *       (the optimizer keeps the old feasible solution as a candidate).
 *       => costBps = (alt.ER - baseline.ER) * 1e4 >= 0
 *   I3. Removing an exclusion typically lowers ESG quality of the universe
 *       (assets carrying the excluded sector enter best-in-class) — esgDelta should be >= 0
 *       in the typical case; we report when it isn't (legitimate when QP rebalances classes).
 *   I4. risk_target +2pts ⇒ optimizer can take more vol ⇒ ER grows or equal (alt better).
 *       costBps positive, volDelta = base.vol - alt.vol typically negative.
 *   I5. risk_target -2pts ⇒ opposite: alt ER lower (costBps negative), volDelta typically positive.
 *   I6. Numeric coherence: bps rounding, signs and tabular formatting match what the component renders.
 */
import { buildPortfolio } from "../src/lib/portfolio/engine";
import type { Asset, PortfolioParams } from "../src/lib/portfolio/types";

// ---- Synthetic universe ----------------------------------------------------
// 4 actions développées (2 best-in-class par classe), 4 obligs vertes, 4 souv, 3 social.
// Quelques exclusions sectorielles posées sur les "moins ESG" pour reproduire
// le comportement réel où exclure fossiles/armes retire en priorité les
// notes ESG les plus basses.

function mkAsset(o: Partial<Asset> & { id: string; ticker: string; class: Asset["asset_class"]; esg: number; er: number; vol: number; excl?: Asset["excluded_sectors"] }): Asset {
  return {
    id: o.id,
    ticker: o.ticker,
    name: o.ticker,
    asset_class: o.class,
    region: "world",
    ter: 0.002,
    esg_score: o.esg,
    env_score: null,
    social_score: null,
    governance_score: null,
    esg_score_source: null,
    carbon_intensity_gco2e_per_eur: null,
    carbon_intensity_source: null,
    carbon_intensity_updated_at: null,
    sfdr_article: 8,
    expected_return: o.er,
    volatility: o.vol,
    cause_exposure: { climat: 0.5, biodiversite: 0.4, humain: 0.3, egalite: 0.3, tech: 0.3, circulaire: 0.3 },
    excluded_sectors: o.excl ?? [],
    description: null,
  };
}

const universe: Asset[] = [
  // equity_dev — 4 assets; ceux NON exclus "fossiles" ont esg plus bas → excluding fossiles vire le moins ESG
  mkAsset({ id: "a1", ticker: "DEV-A", class: "equity_dev", esg: 60, er: 0.080, vol: 0.16, excl: ["fossiles"] }),
  mkAsset({ id: "a2", ticker: "DEV-B", class: "equity_dev", esg: 75, er: 0.078, vol: 0.15 }),
  mkAsset({ id: "a3", ticker: "DEV-C", class: "equity_dev", esg: 82, er: 0.072, vol: 0.148 }),
  mkAsset({ id: "a4", ticker: "DEV-D", class: "equity_dev", esg: 88, er: 0.070, vol: 0.150 }),
  // equity_em — 4 assets
  mkAsset({ id: "b1", ticker: "EM-A",  class: "equity_em",  esg: 65, er: 0.090, vol: 0.21, excl: ["fossiles", "armes"] }),
  mkAsset({ id: "b2", ticker: "EM-B",  class: "equity_em",  esg: 70, er: 0.085, vol: 0.20 }),
  mkAsset({ id: "b3", ticker: "EM-C",  class: "equity_em",  esg: 78, er: 0.082, vol: 0.195 }),
  mkAsset({ id: "b4", ticker: "EM-D",  class: "equity_em",  esg: 85, er: 0.080, vol: 0.20 }),
  // thematic — 4 assets
  mkAsset({ id: "t1", ticker: "TH-A",  class: "thematic",   esg: 70, er: 0.095, vol: 0.27 }),
  mkAsset({ id: "t2", ticker: "TH-B",  class: "thematic",   esg: 78, er: 0.085, vol: 0.20 }),
  mkAsset({ id: "t3", ticker: "TH-C",  class: "thematic",   esg: 80, er: 0.082, vol: 0.18 }),
  mkAsset({ id: "t4", ticker: "TH-D",  class: "thematic",   esg: 85, er: 0.078, vol: 0.17 }),
  // green_bond — 4 assets
  mkAsset({ id: "g1", ticker: "GB-A",  class: "green_bond", esg: 80, er: 0.033, vol: 0.060 }),
  mkAsset({ id: "g2", ticker: "GB-B",  class: "green_bond", esg: 83, er: 0.032, vol: 0.058 }),
  mkAsset({ id: "g3", ticker: "GB-C",  class: "green_bond", esg: 86, er: 0.030, vol: 0.055 }),
  mkAsset({ id: "g4", ticker: "GB-D",  class: "green_bond", esg: 88, er: 0.029, vol: 0.052 }),
  // social_bond — 4 assets
  mkAsset({ id: "s1", ticker: "SB-A",  class: "social_bond",esg: 76, er: 0.032, vol: 0.060 }),
  mkAsset({ id: "s2", ticker: "SB-B",  class: "social_bond",esg: 80, er: 0.031, vol: 0.057 }),
  mkAsset({ id: "s3", ticker: "SB-C",  class: "social_bond",esg: 82, er: 0.030, vol: 0.056 }),
  mkAsset({ id: "s4", ticker: "SB-D",  class: "social_bond",esg: 84, er: 0.029, vol: 0.054 }),
  // sov_bond — 4 assets
  mkAsset({ id: "v1", ticker: "SV-A",  class: "sov_bond",   esg: 70, er: 0.029, vol: 0.050 }),
  mkAsset({ id: "v2", ticker: "SV-B",  class: "sov_bond",   esg: 74, er: 0.028, vol: 0.048 }),
  mkAsset({ id: "v3", ticker: "SV-C",  class: "sov_bond",   esg: 77, er: 0.0275, vol: 0.047 }),
  mkAsset({ id: "v4", ticker: "SV-D",  class: "sov_bond",   esg: 80, er: 0.027, vol: 0.045 }),
  // cash + reit + commodity en versions minimales pour respecter les contraintes de classes
  mkAsset({ id: "c1", ticker: "CASH",  class: "cash",       esg: 50, er: 0.020, vol: 0.005 }),
  mkAsset({ id: "r1", ticker: "REIT",  class: "reit",       esg: 65, er: 0.060, vol: 0.13 }),
  mkAsset({ id: "co1",ticker: "COMD",  class: "commodity",  esg: 60, er: 0.045, vol: 0.17 }),
];

// Covariance diagonale (vol²) — suffisant pour la sanity, l'optimiseur reste convexe.
const covariance = new Map<string, number>();
for (const a of universe) {
  for (const b of universe) {
    covariance.set(`${a.id}|${b.id}`, a.id === b.id ? a.volatility * a.volatility : 0);
  }
}

const params: PortfolioParams = {
  causes: ["climat", "biodiversite"],
  cause_intensity: { climat: 0.8, biodiversite: 0.5 },
  exclusions: ["fossiles", "armes"],
  risk_target: 0.09,
  horizon_years: 10,
  initial_amount: 1000,
};

function fmt(n: number, d = 4) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const baseline = buildPortfolio({ universe, covariance, params });

console.log("=== Baseline ===");
console.log("  ER  =", fmt(baseline.metrics.expected_return), "  Vol =", fmt(baseline.metrics.volatility), "  ESG =", baseline.metrics.esg_score.toFixed(2));
console.log("  selected =", baseline.selected_assets.length, "  excluded_count =", baseline.excluded_count);

function variant(label: string, p: PortfolioParams) {
  const alt = buildPortfolio({ universe, covariance, params: p });
  const costBps = Math.round((alt.metrics.expected_return - baseline.metrics.expected_return) * 10000);
  const esgDelta = Number((baseline.metrics.esg_score - alt.metrics.esg_score).toFixed(2));
  const volDelta = Number(((baseline.metrics.volatility - alt.metrics.volatility) * 100).toFixed(2));
  console.log(`\n--- ${label} ---`);
  console.log("  alt: ER =", fmt(alt.metrics.expected_return), "  Vol =", fmt(alt.metrics.volatility), "  ESG =", alt.metrics.esg_score.toFixed(2));
  console.log("  selected =", alt.selected_assets.length, "  poolDeltaFromUniverse =", (universe.length - alt.excluded_count - (universe.length - baseline.excluded_count)));
  console.log("  costBps =", costBps, "  esgDelta =", esgDelta, "  volDelta =", volDelta);
  return { costBps, esgDelta, volDelta, alt };
}

console.log("\n# Invariants checks");

// I1+I2+I3 — exclusion fossiles
const remFossiles = variant("Sans exclusion fossiles", { ...params, exclusions: params.exclusions.filter(e => e !== "fossiles") });
console.assert(remFossiles.costBps >= 0, "I2 violée: costBps doit être >= 0 quand on relâche une exclusion");
console.assert(remFossiles.alt.excluded_count <= baseline.excluded_count, "I1 violée: relâcher une exclusion devrait élargir le pool");

// I1+I2 — exclusion armes
const remArmes = variant("Sans exclusion armes", { ...params, exclusions: params.exclusions.filter(e => e !== "armes") });
console.assert(remArmes.costBps >= 0, "I2 violée pour armes: costBps doit être >= 0");

// I4 — risk +2pts
const riskUp = variant("Risk +2pts", { ...params, risk_target: params.risk_target + 0.02 });
console.assert(riskUp.costBps >= 0, "I4 violée: plus de risque devrait permettre >= rendement");
console.assert(riskUp.volDelta <= 0, "I4 violée: volDelta = base.vol - alt.vol doit être <= 0 quand on monte la vol cible");

// I5 — risk -2pts
const riskDown = variant("Risk -2pts", { ...params, risk_target: Math.max(0.02, params.risk_target - 0.02) });
console.assert(riskDown.costBps <= 0, "I5 violée: moins de risque devrait coûter du rendement");
console.assert(riskDown.volDelta >= 0, "I5 violée: volDelta doit être >= 0 quand on baisse la vol cible");

// I6 — cohérence d'affichage (signe / bps / arrondi)
function uiLine(label: string, r: { costBps: number; esgDelta: number; volDelta: number }) {
  const positive = r.costBps > 0;
  const sign = positive ? "−" : "+";
  return `${label}: ${sign}${Math.abs(r.costBps)} bps · ESG ${r.esgDelta >= 0 ? "+" : ""}${r.esgDelta.toFixed(1)} pt · Vol ${r.volDelta >= 0 ? "+" : ""}${r.volDelta.toFixed(2)} pt`;
}
console.log("\n# Rendu attendu côté UI");
console.log("  ", uiLine("Exclusion fossiles", remFossiles));
console.log("  ", uiLine("Exclusion armes", remArmes));
console.log("  ", uiLine("Risk +2pts", riskUp));
console.log("  ", uiLine("Risk -2pts", riskDown));

console.log("\nOK — tous les invariants tenus si aucune assertion n'a pété ci-dessus.");
