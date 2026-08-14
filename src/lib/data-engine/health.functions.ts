/**
 * Data-health — server function du tableau de bord interne d'ingestion (§20/§21).
 *
 * Réservé aux admins (`has_role`). Agrège l'état réel de l'univers en indicateurs
 * pilotables : complétude par fonds (`computeFundCompleteness`), santé globale
 * (`computeDataQuality`), et couverture des sources (registry × table
 * `data_sources`) — dont **quels connecteurs sont réellement implémentés**.
 *
 * Fonctions de calcul pures et testées ; ici on ne fait que lire la base et les
 * brancher. Casts `as any` sur les tables récentes non encore régénérées dans les
 * types Supabase (même convention que vote.functions / comprehension).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeFundCompleteness } from "./completeness";
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

export interface DataHealthReport {
  quality: DataQualityReport;
  sources: SourceStatusRow[];
  sourceHealth: Record<SourceHealth, number>;
  /** Nb de sources du registry avec un connecteur réel. */
  connectorsImplemented: number;
  connectorsTotal: number;
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
  esg_score_source: string | null;
  esg_data_asof: string | null;
  sfdr_article: number | null;
  waci_tco2e_per_musd_sales: number | null;
  carbon_intensity_gco2e_per_eur: number | null;
}

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

    const [assetsRes, holdingsRes, sourcesRes] = await Promise.all([
      admin
        .from("assets")
        .select(
          "id, ticker, isin, name, issuer, region, currency, ter, esg_score, esg_score_source, esg_data_asof, sfdr_article, waci_tco2e_per_musd_sales, carbon_intensity_gco2e_per_eur",
        )
        .eq("is_active", true)
        .limit(2000),
      admin.from("fund_holdings").select("asset_id, as_of").limit(100000),
      admin.from("data_sources").select("key, name, priority, automation, health, last_checked_at"),
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

    const funds: FundQualitySummary[] = assets.map((a) => {
      const h = holdingsByAsset.get(a.id) ?? { count: 0, latest: null };
      // Une valeur ESG ne compte comme "réelle" que si elle est sourcée
      // (le défaut 0 sans source n'est pas une donnée — contrat §1.2).
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

      return {
        id: a.id,
        isin: a.isin,
        ticker: a.ticker,
        completeness,
        holdingsCount: h.count,
        hasSource: a.esg_score_source != null,
        lastUpdated: a.esg_data_asof,
      };
    });

    const quality = computeDataQuality(funds);

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
      generatedAt: new Date().toISOString(),
    };
  });
