/**
 * Univers investissable + matrice de covariance — chargé et mis en cache une
 * seule fois par instance de Worker (~5 min de TTL), partagé par tous les
 * appelants serveur (génération de portefeuille, simulateur d'arbitrages).
 *
 * Ce module existait en double (server.functions.ts et tradeoffs.functions.ts
 * avaient chacun leur propre loadUniverse() + cache local) — deux caches
 * indépendants pouvaient diverger jusqu'à 5 minutes l'un de l'autre, et toute
 * évolution de la logique de chargement devait être répliquée deux fois.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Asset } from "@/lib/portfolio";
import type { CarbonDataQuality } from "@/lib/esg/carbon-engine";

export interface UniverseCache {
  assets: Asset[];
  covariance: Map<string, number>;
  loadedAt: number;
}

let _cache: UniverseCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadUniverse(
  client: typeof supabaseAdmin = supabaseAdmin,
): Promise<UniverseCache> {
  if (_cache && Date.now() - _cache.loadedAt < CACHE_TTL_MS && _cache.assets.length > 0) {
    return _cache;
  }
  // Colonnes listées via une variable (string non-littéral) : les colonnes
  // fournisseur récentes (waci_*, msci_*, esg_data_asof, stats_observations)
  // sont ajoutées par des migrations et n'apparaissent dans les types Supabase
  // auto-générés qu'après régénération post-migration. Passer un littéral les
  // ferait rejeter par le typage strict de select() avant régénération — on lit
  // donc via `r`.
  //
  // On distingue le SOCLE (colonnes anciennes et stables, indispensables au
  // moteur : identité, classe, μ/σ, ESG, exclusions) de l'ENRICHISSEMENT
  // (colonnes plus récentes qui alimentent le résumé d'impact et le palier de
  // qualité de données). Le risque concret : une migration d'enrichissement en
  // retard sur la base live (ex. `stats_observations`, migration N4) fait
  // rejeter par PostgREST la TOTALITÉ du select (code 42703 « column does not
  // exist ») — et un seul champ bonus manquant coupait tout l'onboarding, la
  // simulation ET la génération. On isole donc l'enrichissement : s'il est
  // rejeté pour colonne inconnue, on retombe sur le socle seul (le moteur
  // dégrade proprement — cf. classifyDataQuality qui traite un
  // stats_observations absent comme « insufficient ») plutôt que de tomber en
  // panne totale.
  const CORE_ASSET_COLUMNS =
    "id, ticker, name, asset_class, region, ter, esg_score, env_score, social_score, governance_score, esg_score_source, carbon_intensity_gco2e_per_eur, carbon_intensity_source, carbon_intensity_updated_at, sfdr_article, expected_return, volatility, cause_exposure, excluded_sectors, description";
  const ENRICHMENT_ASSET_COLUMNS =
    "waci_tco2e_per_musd_sales, msci_esg_quality_score, implied_temp_rise, esg_data_asof, stats_observations";

  // `carbon_estimates_latest` (repli holdings→émetteur quand le fonds ne publie
  // pas sa propre intensité) n'est pas encore dans les types Supabase générés
  // (auto-générés — ne pas éditer à la main) : accès via un cast localisé, comme
  // le reste du Data Engine (cf. holdings.supabase.ts).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const anyClient = client as any;
  const loadAssets = async () => {
    // 1er essai : socle + enrichissement.
    const full = await client
      .from("assets")
      .select(`${CORE_ASSET_COLUMNS}, ${ENRICHMENT_ASSET_COLUMNS}`)
      .eq("is_active", true);
    if (!full.error) return full;
    // 42703 = undefined_column : une colonne d'enrichissement manque sur la base
    // live (migration en retard). On ne coupe pas le moteur pour un champ bonus :
    // on recharge le socle seul et on continue en dégradé (loggué bruyamment
    // pour que la dérive de schéma soit corrigée côté migrations).
    if (full.error.code === "42703") {
      console.error(
        "[loadUniverse] colonne d'enrichissement absente de la base live (migration en retard ?) — repli sur le socle :",
        full.error.message,
      );
      return client.from("assets").select(CORE_ASSET_COLUMNS).eq("is_active", true);
    }
    return full;
  };
  const [assetsRes, covRes, carbonEstimatesRes] = await Promise.all([
    loadAssets(),
    client.from("asset_covariance").select("asset_a, asset_b, covariance"),
    anyClient
      .from("carbon_estimates_latest")
      .select("asset_id, intensity_gco2e_per_eur, coverage, sourced_coverage, data_quality")
      .eq("scope", "scope_1_2"),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (assetsRes.error) {
    console.error("[loadUniverse] assets error:", assetsRes.error);
    throw new Error("Univers d'actifs indisponible.");
  }
  if (covRes.error) {
    console.error("[loadUniverse] covariance error:", covRes.error);
    throw new Error("Données de covariance indisponibles.");
  }
  if (carbonEstimatesRes.error) {
    // Non bloquant : le repli d'estimation carbone est un bonus, pas une
    // dépendance dure de la construction de portefeuille.
    console.error("[loadUniverse] carbon_estimates error:", carbonEstimatesRes.error);
  }

  interface CarbonEstimateRow {
    asset_id: string;
    intensity_gco2e_per_eur: number | null;
    coverage: number;
    sourced_coverage: number;
    data_quality: CarbonDataQuality;
  }
  const carbonEstimateByAsset = new Map<string, CarbonEstimateRow>(
    ((carbonEstimatesRes.data ?? []) as CarbonEstimateRow[]).map((r) => [r.asset_id, r]),
  );

  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  const str = (v: unknown): string | null => (v == null ? null : String(v));

  // ASSET_COLUMNS étant un `string` (non-littéral), le typage de select() renvoie
  // des lignes génériques : on lit chaque champ depuis un Record, coercé au type
  // du domaine. Ça évite d'éditer les types Supabase auto-générés (interdit) qui
  // n'incluent les colonnes MSCI qu'après régénération post-migration.
  const rows = (assetsRes.data ?? []) as unknown as Record<string, unknown>[];
  const assets: Asset[] = rows.map((r) => {
    const directIntensity = num(r.carbon_intensity_gco2e_per_eur);
    // Le fonds publie sa propre intensité → donnée mesurée, priorité absolue.
    // Sinon, on retombe sur l'estimation bottom-up calculée depuis ses holdings
    // (cf. lib/esg/carbon-engine.ts) quand elle existe et couvre au moins une
    // position — jamais un chiffre inventé pour combler le trou.
    const estimate = directIntensity == null ? carbonEstimateByAsset.get(String(r.id)) : undefined;
    const hasEstimate = estimate != null && estimate.intensity_gco2e_per_eur != null;

    return {
      id: String(r.id),
      ticker: String(r.ticker),
      name: String(r.name),
      asset_class: r.asset_class as Asset["asset_class"],
      region: str(r.region),
      ter: Number(r.ter),
      esg_score: Number(r.esg_score),
      env_score: num(r.env_score),
      social_score: num(r.social_score),
      governance_score: num(r.governance_score),
      esg_score_source: str(r.esg_score_source),
      carbon_intensity_gco2e_per_eur:
        directIntensity ?? (hasEstimate ? estimate!.intensity_gco2e_per_eur : null),
      carbon_intensity_source:
        directIntensity != null
          ? str(r.carbon_intensity_source)
          : hasEstimate
            ? "Estimation Seedow (holdings du fonds)"
            : null,
      carbon_intensity_updated_at: str(r.carbon_intensity_updated_at),
      sfdr_article: num(r.sfdr_article),
      expected_return: Number(r.expected_return),
      volatility: Number(r.volatility),
      cause_exposure: (r.cause_exposure ?? {}) as Record<string, number>,
      excluded_sectors: (r.excluded_sectors ?? []) as Asset["excluded_sectors"],
      description: str(r.description),
      waci_tco2e_per_musd_sales: num(r.waci_tco2e_per_musd_sales),
      msci_esg_quality_score: num(r.msci_esg_quality_score),
      implied_temp_rise: str(r.implied_temp_rise),
      esg_data_asof: str(r.esg_data_asof),
      stats_observations: num(r.stats_observations),
      carbon_data_quality:
        directIntensity != null ? "measured" : hasEstimate ? estimate!.data_quality : null,
      carbon_sourced_ratio:
        directIntensity != null
          ? 1
          : hasEstimate && estimate!.coverage > 0
            ? estimate!.sourced_coverage / estimate!.coverage
            : hasEstimate
              ? 0
              : null,
    };
  });

  const covariance = new Map<string, number>();
  for (const c of covRes.data ?? []) {
    covariance.set(`${c.asset_a}|${c.asset_b}`, Number(c.covariance));
  }

  _cache = { assets, covariance, loadedAt: Date.now() };
  return _cache;
}
