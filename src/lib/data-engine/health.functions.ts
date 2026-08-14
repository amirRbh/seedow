/**
 * Data-health — server function du tableau de bord interne d'ingestion (§20/§21).
 *
 * Réservé aux admins (`has_role`). Agrège l'état réel de l'univers en indicateurs
 * pilotables :
 *   - complétude par fonds (`computeFundCompleteness`) + santé globale (`computeDataQuality`) ;
 *   - couverture des sources (registry × `data_sources`), connecteurs implémentés ;
 *   - **répartition par tier de durabilité** (Phase B4 — `deriveSustainabilityProfile`,
 *     indépendante de SFDR) ;
 *   - **file d'ingestion priorisée** (Phase B2/B3 — `planIngestion` : demande réelle
 *     via `fund_requests` + fraîcheur + complétude).
 *
 * Fonctions de calcul pures et testées ; ici on ne fait que lire la base et les
 * brancher. Casts `as any` sur les tables récentes non encore régénérées dans les
 * types Supabase (même convention que vote.functions / comprehension).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACWI_WACI_TCO2E_PER_MUSD } from "@/lib/esg/benchmark";
import {
  deriveSustainabilityProfile,
  type DataCoverage,
  type SustainabilityTier,
} from "@/lib/esg/sustainability-classification";
import { computeFundCompleteness } from "./completeness";
import { planIngestion, type IngestionCandidate } from "./ingestion-plan";
import { toCanonicalIsin } from "./isin";
import {
  computeDataQuality,
  summarizeSourceHealth,
  type DataQualityReport,
  type FundQualitySummary,
  type SourceHealth,
} from "./quality";
import { SOURCE_REGISTRY } from "./sources/registry";

/** Clés de sources pour lesquelles un connecteur concret existe (Phase A). */
export const IMPLEMENTED_CONNECTORS: ReadonlySet<string> = new Set([
  "ishares_factsheet",
  "amundi_factsheet",
  "vanguard_factsheet",
  "amf_geco",
]);

export interface SourceStatusRow {
  key: string;
  name: string;
  priority: number;
  automation: string | null;
  health: SourceHealth;
  lastCheckedAt: string | null;
  /** Un connecteur concret est-il branché sur cette source ? */
  implemented: boolean;
}

/** Une ligne de la file d'ingestion, enrichie du ticker pour l'affichage. */
export interface IngestionPlanRow {
  assetId: string;
  ticker: string | null;
  isin: string | null;
  priority: number;
  reasons: string[];
  staleDays: number | null;
}

export interface DataHealthReport {
  quality: DataQualityReport;
  sources: SourceStatusRow[];
  sourceHealth: Record<SourceHealth, number>;
  /** Nb de sources du registry avec un connecteur réel. */
  connectorsImplemented: number;
  connectorsTotal: number;
  /** Répartition de l'univers par tier de durabilité (B4). */
  sustainabilityTiers: Record<SustainabilityTier, number>;
  /** Prochaines ingestions à prioriser (B2/B3), les plus urgentes d'abord. */
  ingestionPlan: IngestionPlanRow[];
  generatedAt: string;
}

interface AssetRow {
  id: string;
  ticker: string | null;
  isin: string | null;
  name: string | null;
  issuer: string | null;
  region: string | null;
  currency: string | null;
  ter: number | null;
  esg_score: number | null;
  env_score: number | null;
  esg_score_source: string | null;
  esg_data_asof: string | null;
  sfdr_article: number | null;
  waci_tco2e_per_musd_sales: number | null;
  implied_temp_rise: string | null;
  excluded_sectors: string[] | null;
  carbon_intensity_gco2e_per_eur: number | null;
}

/** Couverture de données d'un actif, dérivée des champs réellement présents. */
function deriveCoverage(a: AssetRow): DataCoverage {
  const hasCarbon = a.waci_tco2e_per_musd_sales != null || a.carbon_intensity_gco2e_per_eur != null;
  const hasPillars = a.env_score != null;
  const hasSource = a.esg_score_source != null;
  if (hasSource && hasCarbon && a.sfdr_article != null && hasPillars) return "complete";
  if (hasSource || hasCarbon) return "partial";
  return "estimated";
}

const emptyTiers = (): Record<SustainabilityTier, number> => ({
  paris_aligned: 0,
  transition: 0,
  broad_esg: 0,
  insufficient_evidence: 0,
});

export const getDataHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DataHealthReport> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const [assetsRes, holdingsRes, sourcesRes, requestsRes] = await Promise.all([
      admin
        .from("assets")
        .select(
          "id, ticker, isin, name, issuer, region, currency, ter, esg_score, env_score, esg_score_source, esg_data_asof, sfdr_article, waci_tco2e_per_musd_sales, implied_temp_rise, excluded_sectors, carbon_intensity_gco2e_per_eur",
        )
        .eq("is_active", true)
        .limit(2000),
      admin.from("fund_holdings").select("asset_id, as_of").limit(100000),
      admin.from("data_sources").select("key, name, priority, automation, health, last_checked_at"),
      admin.from("fund_requests").select("isin").limit(100000),
    ]);

    const assets = (assetsRes.data ?? []) as AssetRow[];

    // Holdings agrégés par fonds : nombre + date la plus récente (§12).
    const holdingsByAsset = new Map<string, { count: number; latest: string | null }>();
    for (const h of (holdingsRes.data ?? []) as { asset_id: string; as_of: string | null }[]) {
      const cur = holdingsByAsset.get(h.asset_id) ?? { count: 0, latest: null };
      cur.count += 1;
      if (h.as_of && (!cur.latest || h.as_of > cur.latest)) cur.latest = h.as_of;
      holdingsByAsset.set(h.asset_id, cur);
    }

    // Demande réelle par ISIN (couverture pilotée par l'usage, §6).
    const demandByIsin = new Map<string, number>();
    for (const r of (requestsRes.data ?? []) as { isin: string | null }[]) {
      const isin = toCanonicalIsin(r.isin);
      if (!isin) continue;
      demandByIsin.set(isin, (demandByIsin.get(isin) ?? 0) + 1);
    }

    const funds: FundQualitySummary[] = [];
    const tiers = emptyTiers();
    const candidates: IngestionCandidate[] = [];
    const tickerById = new Map<string, string | null>();

    for (const a of assets) {
      tickerById.set(a.id, a.ticker);
      const h = holdingsByAsset.get(a.id) ?? { count: 0, latest: null };
      const hasRealEsg = a.esg_score_source != null && (a.esg_score ?? 0) > 0;
      const completeness = computeFundCompleteness({
        hasIsin: !!a.isin,
        hasName: !!a.name,
        hasIssuer: !!a.issuer,
        hasDomicile: !!a.region, // pas de colonne domicile dédiée → région comme proxy
        hasCurrency: !!a.currency,
        hasTer: a.ter != null,
        holdingsCount: h.count,
        holdingsAsOf: h.latest,
        hasSfdrArticle: a.sfdr_article != null,
        hasKidOrProspectus: false, // non suivi pour l'instant (gap assumé)
        hasEsgScore: hasRealEsg,
        hasCarbon: a.waci_tco2e_per_musd_sales != null || a.carbon_intensity_gco2e_per_eur != null,
        hasControversyData: false, // non suivi pour l'instant (gap assumé)
      }).score;

      funds.push({
        id: a.id,
        isin: a.isin,
        ticker: a.ticker,
        completeness,
        holdingsCount: h.count,
        hasSource: a.esg_score_source != null,
        lastUpdated: a.esg_data_asof,
      });

      // B4 — tier de durabilité (indépendant de SFDR).
      const profile = deriveSustainabilityProfile({
        esgScore: a.esg_score,
        climateScore: a.env_score,
        waci: a.waci_tco2e_per_musd_sales,
        benchmarkWaci: ACWI_WACI_TCO2E_PER_MUSD,
        impliedTempRise: a.implied_temp_rise,
        exclusionsCount: Array.isArray(a.excluded_sectors) ? a.excluded_sectors.length : 0,
        dataCoverage: deriveCoverage(a),
        sfdrArticle: a.sfdr_article,
      });
      tiers[profile.tier] += 1;

      // B2/B3 — candidat d'ingestion.
      candidates.push({
        assetId: a.id,
        isin: a.isin,
        demandCount: a.isin ? (demandByIsin.get(toCanonicalIsin(a.isin) ?? "") ?? 0) : 0,
        completeness,
        lastUpdated: a.esg_data_asof,
        hasSource: a.esg_score_source != null,
      });
    }

    const quality = computeDataQuality(funds);
    const ingestionPlan: IngestionPlanRow[] = planIngestion(candidates, { limit: 20 })
      .filter((item) => item.priority > 0)
      .map((item) => ({
        assetId: item.assetId,
        ticker: tickerById.get(item.assetId) ?? null,
        isin: item.isin,
        priority: Math.round(item.priority),
        reasons: item.reasons,
        staleDays: item.staleDays == null ? null : Math.round(item.staleDays),
      }));

    const dbSources = (sourcesRes.data ?? []) as {
      key: string;
      name: string;
      priority: number;
      automation: string | null;
      health: SourceHealth | null;
      last_checked_at: string | null;
    }[];
    const dbByKey = new Map(dbSources.map((s) => [s.key, s]));

    // On part du registry (source de vérité du code) et on enrichit avec l'état DB.
    const sources: SourceStatusRow[] = SOURCE_REGISTRY.map((def) => {
      const db = dbByKey.get(def.key);
      return {
        key: def.key,
        name: def.name,
        priority: def.priority,
        automation: def.automation,
        health: db?.health ?? "unknown",
        lastCheckedAt: db?.last_checked_at ?? null,
        implemented: IMPLEMENTED_CONNECTORS.has(def.key),
      };
    });

    return {
      quality,
      sources,
      sourceHealth: summarizeSourceHealth(
        sources.map((s) => ({ key: s.key, health: s.health, lastCheckedAt: s.lastCheckedAt })),
      ),
      connectorsImplemented: sources.filter((s) => s.implemented).length,
      connectorsTotal: sources.length,
      sustainabilityTiers: tiers,
      ingestionPlan,
      generatedAt: new Date().toISOString(),
    };
  });
