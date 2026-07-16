/**
 * Phase 1.2 — Simulateur d'arbitrages "affine ton allocation".
 *
 * Pour le portefeuille actif d'un utilisateur, calcule en parallèle :
 *  - la baseline (paramètres courants)
 *  - une variante par exclusion active (sans cette exclusion)
 *  - deux variantes de risque (cran au-dessus / en-dessous)
 *
 * Chaque variante renvoie le delta de rendement attendu (bps), de score ESG
 * et de volatilité par rapport à la baseline — affichés côté UI pour révéler
 * le coût réel des leviers et capturer les décisions via `trackTradeoff`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildPortfolio,
  type Asset,
  type CauseTag,
  type ExclusionTag,
  type PortfolioParams,
} from "@/lib/portfolio";

const InputSchema = z.object({ portfolioId: z.string().uuid() });

const EXCLUSION_LEVERS: Record<ExclusionTag, string> = {
  fossiles: "exclusion_fossiles",
  armes: "exclusion_armes",
  tabac: "exclusion_tabac",
  jeux: "exclusion_jeux",
  animaux: "exclusion_animaux",
  "fast-fashion": "exclusion_fast-fashion",
};

const EXCLUSION_LABELS: Record<ExclusionTag, string> = {
  fossiles: "Énergies fossiles",
  armes: "Armement",
  tabac: "Tabac",
  jeux: "Jeux d'argent",
  animaux: "Maltraitance animale",
  "fast-fashion": "Fast-fashion",
};

interface HoldingSnapshot {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  weight: number;
}

interface PortfolioSnapshot {
  expected_return: number;
  volatility: number;
  esg_score: number;
  ter: number;
  by_class: Record<string, number>;
  top_holdings: HoldingSnapshot[];
}

interface TradeoffRow {
  lever: string;
  leverLabel: string;
  altLabel: string;
  /** > 0 = le levier actuel coûte ce nombre de bps de rendement attendu.
   *  < 0 = le levier améliore aussi le rendement (rare). */
  costBps: number;
  /** Delta ESG composite (pts sur 100), > 0 = actuel meilleur. */
  esgDelta: number;
  /** Delta volatilité (pts %), > 0 = actuel plus risqué. */
  volDelta: number;
  /** Snapshot complet du portefeuille alternatif (sans ce levier). */
  alt: PortfolioSnapshot;
}

// Cache local universe (Worker-instance scope, ~5 min)
interface UniverseCache {
  assets: Asset[];
  covariance: Map<string, number>;
  loadedAt: number;
}
let _cache: UniverseCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadUniverse(): Promise<UniverseCache> {
  if (_cache && Date.now() - _cache.loadedAt < CACHE_TTL_MS && _cache.assets.length > 0) {
    return _cache;
  }
  const [assetsRes, covRes] = await Promise.all([
    supabaseAdmin
      .from("assets")
      .select(
        "id, ticker, name, asset_class, region, ter, esg_score, env_score, social_score, governance_score, esg_score_source, carbon_intensity_gco2e_per_eur, carbon_intensity_source, carbon_intensity_updated_at, sfdr_article, expected_return, volatility, cause_exposure, excluded_sectors, description",
      )
      .eq("is_active", true),
    supabaseAdmin.from("asset_covariance").select("asset_a, asset_b, covariance"),
  ]);
  if (assetsRes.error) throw new Error("Univers d'actifs indisponible.");
  if (covRes.error) throw new Error("Données de covariance indisponibles.");

  const num = (v: unknown) => (v == null ? null : Number(v));
  const str = (v: unknown) => (v == null ? null : String(v));
  const assets = (assetsRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: row.id,
      ticker: row.ticker,
      name: row.name,
      asset_class: row.asset_class,
      region: row.region,
      ter: Number(row.ter),
      esg_score: Number(row.esg_score),
      env_score: num(r.env_score),
      social_score: num(r.social_score),
      governance_score: num(r.governance_score),
      esg_score_source: str(r.esg_score_source),
      carbon_intensity_gco2e_per_eur: num(r.carbon_intensity_gco2e_per_eur),
      carbon_intensity_source: str(r.carbon_intensity_source),
      carbon_intensity_updated_at: str(r.carbon_intensity_updated_at),
      sfdr_article: row.sfdr_article,
      expected_return: Number(row.expected_return),
      volatility: Number(row.volatility),
      cause_exposure: (row.cause_exposure ?? {}) as Record<string, number>,
      excluded_sectors: (row.excluded_sectors ?? []) as Asset["excluded_sectors"],
      description: row.description,
    };
  }) as Asset[];
  const covariance = new Map<string, number>();
  for (const c of covRes.data ?? [])
    covariance.set(`${c.asset_a}|${c.asset_b}`, Number(c.covariance));
  _cache = { assets, covariance, loadedAt: Date.now() };
  return _cache;
}

export const simulateTradeoffs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userClient } = context;
    const { data: pf, error } = await userClient
      .from("portfolios")
      .select("id, causes, cause_intensity, exclusions, risk_target, horizon_years, initial_amount")
      .eq("id", data.portfolioId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !pf) throw new Error("Portefeuille introuvable.");

    const universe = await loadUniverse();

    const baseParams: PortfolioParams = {
      causes: (pf.causes ?? []) as CauseTag[],
      cause_intensity: (pf.cause_intensity ?? {}) as Partial<Record<CauseTag, number>>,
      exclusions: (pf.exclusions ?? []) as ExclusionTag[],
      risk_target: Number(pf.risk_target),
      horizon_years: Number(pf.horizon_years),
      initial_amount: Number(pf.initial_amount),
    };

    const baseline = buildPortfolio({
      universe: universe.assets,
      covariance: universe.covariance,
      params: baseParams,
    });

    const assetById = new Map(universe.assets.map((a) => [a.id, a]));
    const snapshot = (r: ReturnType<typeof buildPortfolio>): PortfolioSnapshot => {
      const top = Object.entries(r.weights)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, w]) => {
          const a = assetById.get(id);
          return {
            id,
            ticker: a?.ticker ?? id.slice(0, 6),
            name: a?.name ?? "—",
            asset_class: a?.asset_class ?? "—",
            weight: w,
          };
        });
      return {
        expected_return: r.metrics.expected_return,
        volatility: r.metrics.volatility,
        esg_score: r.metrics.esg_score,
        ter: r.metrics.ter,
        by_class: r.metrics.by_class as Record<string, number>,
        top_holdings: top,
      };
    };

    const rows: TradeoffRow[] = [];
    const pushRow = (
      lever: string,
      leverLabel: string,
      altLabel: string,
      alt: ReturnType<typeof buildPortfolio>,
    ) => {
      rows.push({
        lever,
        leverLabel,
        altLabel,
        costBps: Math.round(
          (alt.metrics.expected_return - baseline.metrics.expected_return) * 10000,
        ),
        esgDelta: Number((baseline.metrics.esg_score - alt.metrics.esg_score).toFixed(2)),
        volDelta: Number(((baseline.metrics.volatility - alt.metrics.volatility) * 100).toFixed(2)),
        alt: snapshot(alt),
      });
    };

    for (const excl of baseParams.exclusions) {
      const alt = buildPortfolio({
        universe: universe.assets,
        covariance: universe.covariance,
        params: { ...baseParams, exclusions: baseParams.exclusions.filter((e) => e !== excl) },
      });
      pushRow(
        EXCLUSION_LEVERS[excl],
        `Exclusion : ${EXCLUSION_LABELS[excl]}`,
        "Sans cette exclusion",
        alt,
      );
    }

    const riskUp = Math.min(0.3, baseParams.risk_target + 0.02);
    const riskDown = Math.max(0.02, baseParams.risk_target - 0.02);
    if (riskUp !== baseParams.risk_target) {
      const alt = buildPortfolio({
        universe: universe.assets,
        covariance: universe.covariance,
        params: { ...baseParams, risk_target: riskUp },
      });
      pushRow("risk_target", "Cible de risque", "Plus offensif (+2 pts de vol cible)", alt);
    }
    if (riskDown !== baseParams.risk_target) {
      const alt = buildPortfolio({
        universe: universe.assets,
        covariance: universe.covariance,
        params: { ...baseParams, risk_target: riskDown },
      });
      pushRow("risk_target", "Cible de risque", "Plus défensif (-2 pts de vol cible)", alt);
    }

    return {
      baseline: snapshot(baseline),
      rows,
    };
  });
