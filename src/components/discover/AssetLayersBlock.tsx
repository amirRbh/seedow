import { useTranslation } from "react-i18next";
import { describeAssetLayers, type LayerId, type LayerStatus } from "@/lib/portfolio/layers";
import { assetProvenance } from "@/lib/data-engine/provenance";
import type { DiscoverAsset } from "@/lib/discover/types";

/**
 * « Ce qu'on sait de ce fonds » — les quatre couches, et ce qui manque.
 *
 * Ce bloc répond à une question que Seedow doit savoir traiter : pourquoi ce
 * fonds apparaît-il, et jusqu'où peut-on lui faire confiance ? Il ne juge pas la
 * QUALITÉ de l'actif — seulement l'état de ce qu'on sait de lui. Les deux ne
 * doivent jamais se confondre : un fonds bien documenté n'est pas un bon fonds.
 *
 * Un fonds dont une couche manque reste affiché. C'est le principe : on montre
 * ce qu'on a et on nomme ce qui manque, plutôt que de faire disparaître le fonds
 * jusqu'à ce que tout soit parfait.
 */

const ORDER: LayerId[] = ["identity", "structure", "values", "market"];

/** Chaque statut porte un mot écrit ; la couleur ne fait que l'accompagner (§4). */
const STATUS_TONE: Record<LayerStatus, string> = {
  complete: "text-mint-ink",
  partial: "text-solar-ink",
  missing: "text-ink-3",
  unknown: "text-ink-3",
};

export function AssetLayersBlock({ asset }: { asset: DiscoverAsset }) {
  const { t } = useTranslation();

  const { layers } = describeAssetLayers({
    asset: {
      name: asset.name,
      ter: asset.ter_pct / 100,
      asset_class: asset.asset_class,
      region: asset.region,
      excluded_sectors: asset.exclusions,
      esg_score: asset.overall_esg_score * 10,
      esg_score_source: asset.esg_score_source,
      sfdr_article: asset.sfdr_article,
      carbon_intensity_gco2e_per_eur: asset.co2_factor_per_1k_eur,
      waci_tco2e_per_musd_sales: asset.waci_tco2e_per_musd_sales,
      expected_return: asset.expected_return,
      volatility: asset.volatility,
      stats_observations: asset.stats_observations,
      // `cause_exposure` n'est pas porté par le modèle de vue : les thèmes en
      // sont dérivés. On transmet donc ce qu'on a vraiment.
      cause_exposure:
        asset.themes.length > 0 ? Object.fromEntries(asset.themes.map((c) => [c, 1])) : {},
    },
    identity: { isin: asset.isin, issuer: asset.issuer, currency: asset.currency },
    // La composition réelle n'est pas consultée ici : elle reste « inconnue »,
    // pas « absente » (cf. `lib/portfolio/layers`).
  });

  // Provenance des chiffres ESG/climat — pour signer ce qui est signable.
  const provenance = assetProvenance({
    esg_score: asset.overall_esg_score * 10,
    esg_score_source: asset.esg_score_source,
    esg_data_asof: asset.esg_data_asof,
    carbon_intensity_gco2e_per_eur: asset.co2_factor_per_1k_eur,
    carbon_intensity_source: asset.carbon_intensity_source,
    waci_tco2e_per_musd_sales: asset.waci_tco2e_per_musd_sales,
    sfdr_article: asset.sfdr_article,
  });

  const sources = [...new Set(provenance.map((p) => p.source))];

  return (
    <section className="mt-6">
      <p className="text-tag uppercase tracking-[0.14em] font-mono text-ink-3">
        {t("asset_layers.title")}
      </p>
      <p className="mt-1.5 text-body-sm text-ink-2 leading-relaxed">{t("asset_layers.hint")}</p>

      <ul className="mt-3 divide-y divide-paper-3 border-t border-b border-paper-3">
        {ORDER.map((id) => {
          const layer = layers[id];
          const gaps = [...layer.missing, ...layer.unknown];
          return (
            <li key={id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-ink">{t(`asset_layers.layer.${id}`)}</span>
                <span
                  className={`text-tag font-mono uppercase tracking-wider ${STATUS_TONE[layer.status]}`}
                >
                  {t(`asset_layers.status.${layer.status}`)}
                </span>
              </div>
              {gaps.length > 0 && (
                <p className="mt-0.5 text-tag text-ink-3 leading-snug">
                  {/* On nomme les champs qui manquent : « incomplet » sans dire
                      quoi n'aide personne à juger. */}
                  {t("asset_layers.gaps", {
                    fields: gaps
                      .map((f) => t(`asset_layers.field.${f}`, { defaultValue: f }))
                      .join(", "),
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-tag text-ink-3 leading-relaxed">
        {sources.length > 0
          ? t("asset_layers.sources", { count: provenance.length, sources: sources.join(", ") })
          : t("asset_layers.no_source")}
      </p>
    </section>
  );
}
