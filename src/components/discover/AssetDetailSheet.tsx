import { useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { Glossary, useTermLabel } from "@/components/ui/Glossary";
import { RelatedCourse } from "@/components/courses/RelatedCourse";
import { WhyEthi } from "@/components/ethi/WhyEthi";
import { WhyThis } from "@/components/common/WhyThis";
import { ScorePillars } from "@/components/esg/SeedowScore";
import {
  DataCoverageBadge,
  GreenwashingBadge,
  SourceLink,
  SustainabilityTierBadge,
} from "@/components/discover/TransparencyBadges";
import { SustainabilityBadge } from "@/components/discover/SustainabilityBadge";
import { PoolReasonList } from "@/components/discover/PoolReasonList";
import { FundEvidenceLink } from "@/components/discover/FundEvidenceLink";
import { poolReasons } from "@/lib/portfolio/poolReasons";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import { relativeIntensityVsBenchmark } from "@/lib/esg/carbon";
import { ACWI_WACI_TCO2E_PER_MUSD, ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";
import type { DiscoverAsset } from "@/lib/discover/types";
import { AssetLayersBlock } from "./AssetLayersBlock";
import { EuroBreakdownBlock } from "@/components/impact/EuroBreakdownBlock";
import { useFundComposition } from "@/hooks/useFundComposition";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: DiscoverAsset | null;
}

export function AssetDetailSheet({ open, onOpenChange, asset }: Props) {
  const { t } = useTranslation();
  // Les convictions déclarées — c'est ce qui permet de dire « pourquoi POUR TOI »
  // plutôt que « voici ce fonds ».
  const { portfolio } = useActivePortfolio();
  const causes = portfolio?.causes ?? [];
  const { lang } = useLang();

  const RISK_LABELS: Record<number, { label: string; tone: string }> = {
    1: { label: t("asset_detail.risk_labels.1"), tone: "text-highlight-1" },
    2: { label: t("asset_detail.risk_labels.2"), tone: "text-highlight-1" },
    3: { label: t("asset_detail.risk_labels.3"), tone: "text-highlight-1" },
    4: { label: t("asset_detail.risk_labels.4"), tone: "text-ink" },
    5: { label: t("asset_detail.risk_labels.5"), tone: "text-rust" },
    6: { label: t("asset_detail.risk_labels.6"), tone: "text-rust" },
    7: { label: t("asset_detail.risk_labels.7"), tone: "text-bloom" },
  };

  // Composition publiée du fonds ouvert — chargée seulement quand la feuille
  // l'est. Ce que le fonds détient vraiment, à côté de ce qu'il revendique.
  const composition = useFundComposition(asset?.isin ?? asset?.ticker ?? null, open);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const { isWatched, toggle } = useWatchlist();
  // Libellé SFDR adapté au niveau de détail (jargon en Expert, clair en Simple).
  const sfdrLabel = useTermLabel("SFDR");

  // Événement d'engagement : une fiche ouverte = un actif réellement considéré.
  useEffect(() => {
    if (open && asset) void trackAppEvent("asset_viewed", { ticker: asset.ticker });
  }, [open, asset]);

  if (!asset) return null;
  const watched = isWatched(asset.id);

  const risk = asset.risk_level ?? 4;
  const riskInfo = RISK_LABELS[risk];

  // Risques propres au type d'actif
  const risksList = buildRisks(asset, t);

  // Intensité carbone RÉELLE (WACI MSCI), monthly-indépendante. Comparée à un ETF
  // Monde classique (benchmark sourcé). Affichée seulement si mesurée — jamais
  // d'estimation dérivée du score ESG (cf. méthodo impact).
  const waci = asset.waci_tco2e_per_musd_sales;
  const intensityCmp =
    waci != null ? relativeIntensityVsBenchmark(waci, ACWI_WACI_TCO2E_PER_MUSD) : null;
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="px-5 pt-5 pb-4 border-b border-paper-3 bg-paper-2/40">
          <SheetHeader className="text-left p-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">
                  {asset.category} · {asset.ticker}
                </p>
                <SheetTitle className="font-value text-2xl text-ink mt-1 leading-tight">
                  {asset.name}
                </SheetTitle>
                <p className="font-value text-body-lg text-ink-2 mt-1">
                  {asset.current_price != null
                    ? formatCurrency(asset.current_price, lang)
                    : t("discover.row.price_unavailable")}
                  <span className="text-caption text-ink-3 ml-1">
                    {t("asset_detail.per_share")}
                  </span>
                </p>
              </div>
              {/* Le score Seedow, pas la note ESG du fournisseur : c'est le
                  nombre que la fiche publique et l'Observatoire affichent pour
                  ce même fonds. La note ESG reste visible plus bas, comme l'un
                  des trois piliers du composite. */}
              <div className="flex-shrink-0 text-right">
                <p className="font-value text-2xl leading-none tabular-nums text-ink">
                  {asset.seedow_score ?? "—"}
                  <span className="text-ink-3 text-caption"> /100</span>
                </p>
                <SustainabilityBadge className="mt-1.5" score={asset.seedow_score} />
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* « En clair » — pédagogie contextuelle (analyse UX §08/§14 étapes 1-2).
              Un débutant ne sait pas si « equity_dev » ou « green_bond » est une
              entreprise, un panier, un prêt ou de l'immobilier. On le lui dit en
              une phrase, AVANT le résumé de l'émetteur, sans jargon. */}
          <section className="rounded-xl bg-highlight-5/60 border border-highlight-4 p-3.5">
            <p className="text-tag uppercase tracking-[0.18em] text-highlight-1 font-mono mb-1.5">
              {t("asset_detail.plain.label")}
            </p>
            <p className="text-body-sm text-ink-2 leading-relaxed">
              <span className="font-semibold text-ink">
                {t(`asset_detail.plain.kinds.${assetKind(asset.asset_class)}.title`)} ·{" "}
              </span>
              {t(`asset_detail.plain.kinds.${assetKind(asset.asset_class)}.desc`)}
            </p>
          </section>

          {/* CE QUE ÇA FINANCE, EN EUROS — la composition publiée traduite sur
              1 000 €. Elle passe avant le score et avant les thèmes revendiqués
              parce que c'est la seule chose ici qui se comprend sans rien
              savoir de la finance, et parce qu'elle est mesurée là où les
              thèmes sont une appréciation. */}
          <section>
            {composition.status !== "ready" ? (
              <p className="text-body-sm text-ink-3" role="status">
                {t("xray.composition_loading")}
              </p>
            ) : (
              <EuroBreakdownBlock
                variant="bare"
                holdings={composition.holdings}
                asOf={composition.asOf}
                source={composition.issuer ?? asset.issuer ?? null}
                sourceUrl={composition.sourceUrl}
                ter={asset.ter_pct / 100}
              />
            )}
          </section>

          {/* POURQUOI POUR TOI — la fiche décrivait le fonds dans l'absolu sans
              jamais le relier aux convictions déclarées trois écrans plus tôt.
              Mêmes raisons que le pool, au moment où l'utilisateur décide s'il
              l'ajoute. Absent quand aucune conviction n'est déclarée : il n'y a
              alors rien à mettre en rapport (cf. `poolReasons`). */}
          {causes.length > 0 && (
            <section className="rounded-xl border border-paper-3 bg-paper-2 p-3.5">
              <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">
                {t("asset_detail.why_for_you")}
              </p>
              <PoolReasonList
                className="mt-2"
                reasons={poolReasons({
                  causes,
                  themes: asset.themes,
                  sustainability: Math.round(asset.overall_esg_score * 10),
                  esgSource: asset.esg_score_source,
                  ter: asset.ter_pct / 100,
                  statsObservations: asset.stats_observations,
                })}
              />
            </section>
          )}

          {/* {t("asset_detail.summary")} */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono mb-2">
              {t("asset_detail_sheet.summary")}
            </p>
            <p className="text-body-sm text-ink-2 leading-relaxed">{asset.description}</p>
            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {asset.tags.map((tag) => (
                  <Glossary
                    key={tag}
                    term="SFDR"
                    variant="inline"
                    className="text-tag bg-highlight-5 text-highlight-1 font-semibold px-2 py-0.5 rounded-full capitalize border border-solid border-highlight-4 hover:text-highlight-1"
                  >
                    {tag}
                  </Glossary>
                ))}
              </div>
            )}
          </section>

          {/* Impact dynamique */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono mb-2">
              {t("asset_detail.impact_overview")}
            </p>

            {/* Verdict lisible en une seconde (principe Yuka) AVANT le détail
                carbone dense — progressive disclosure : l'essentiel d'abord. */}
            <div className="mb-3">
              {/* Ce que la note EST, dit à côté d'elle et non en fin d'écran :
                  une notation de pratiques, pas un effet mesuré sur le monde.
                  Sans cette phrase, le score se lit comme un impact (§1.3). */}
              <p className="text-tag text-ink-3 leading-snug">
                {t("asset_detail.sustainability_note")}
              </p>
              {/* La page sourcée : revendications du fonds, données, limites. */}
              <FundEvidenceLink className="mt-2" isin={asset.isin} ticker={asset.ticker} />
            </div>

            {/* « Pourquoi ce score ? » — la DONNÉE d'abord, Ethi ensuite.
                L'écran ne proposait qu'une question à l'assistant : pour lire le
                détail d'un chiffre affiché à l'écran, il fallait attendre une
                réponse générée. Les piliers viennent du calcul lui-même ; Ethi
                reste là pour ce qui dépasse la lecture du composite. */}
            <div className="mb-3 border-t border-b border-paper-3">
              <WhyThis variant="section" label={t("fonds_page.why_score")}>
                <p className="mb-4">{t("xray.why_score_intro")}</p>
                <ScorePillars pillars={asset.score_breakdown} />
                <p className="mt-4 text-tag text-ink-3 leading-snug">{t("xray.score_is_index")}</p>
              </WhyThis>
            </div>
            <div className="mb-3">
              <WhyEthi
                label={t("asset_detail.why_score_label")}
                question={t("asset_detail.why_score_q", { name: asset.name })}
              />
            </div>

            {/* Détail carbone + piliers ESG — replié : le verdict (badge) au-dessus
                suffit au premier coup d'œil, le détail dense se déplie à la demande. */}
            <Disclosure title={t("asset_detail.carbon_detail")}>
              {/* Intensité carbone RÉELLE (WACI MSCI) — mesurée, comparée à l'ETF Monde.
                Jamais d'estimation dérivée du score ESG. */}
              {waci != null ? (
                <div className="bg-paper-2 rounded-xl p-3 border border-paper-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-value text-xl leading-none text-ink">
                      {waci.toLocaleString(numLocale, { maximumFractionDigits: 0 })}
                      <span className="text-tag text-ink-3 ml-1 font-sans">
                        {t("impact_hero.intensity_unit")}
                      </span>
                    </p>
                    {intensityCmp && (
                      <span
                        className={`text-tag font-semibold px-2 py-0.5 rounded-full ${
                          intensityCmp.cleaner
                            ? "bg-highlight-5 text-highlight-1"
                            : "bg-alert-tint text-rust"
                        }`}
                      >
                        {t(
                          intensityCmp.cleaner
                            ? "impact_hero.vs_benchmark_cleaner"
                            : "impact_hero.vs_benchmark_dirtier",
                          { pct: Math.round(Math.abs(intensityCmp.deltaPct) * 100) },
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-tag text-ink-3 mt-1.5 font-medium uppercase tracking-wider">
                    {t("asset_detail.carbon_intensity")}
                  </p>
                  <p className="text-tag text-ink-3 mt-1 leading-snug">
                    {t("impact_hero.benchmark_ref", {
                      bench: ACWI_WACI_TCO2E_PER_MUSD,
                      source: `${ACWI_WACI_SOURCE} · ${ACWI_WACI_ASOF}`,
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-caption text-ink-3 italic">
                  {t("asset_detail.co2_unavailable")}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                <MiniBar label={t("asset_detail.climate")} value={asset.climate_score} />
                <MiniBar label={t("asset_detail.social")} value={asset.social_score} />
                <MiniBar label={t("asset_detail.ethics")} value={asset.governance_score} />
              </div>
              <div className="mt-2.5">
                <SourceLink />
              </div>
            </Disclosure>
          </section>

          {/* Transparence — repliée par défaut (refonte mobile §8/§13), mais ouverte
              d'office dès qu'un risque de greenwashing existe : on n'enterre pas une
              alerte. */}
          <section>
            <Disclosure
              title={t("transparency.section_title")}
              defaultOpen={asset.greenwashing_risk !== "low"}
            >
              <div className="paper-card p-3.5 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <SustainabilityTierBadge tier={asset.sustainability_tier} />
                  <DataCoverageBadge coverage={asset.data_coverage} />
                  <GreenwashingBadge
                    risk={asset.greenwashing_risk}
                    reasons={asset.greenwashing_reasons}
                  />
                </div>
                {/* Raisons en clair : les tooltips ne sont pas accessibles au tap mobile */}
                {asset.greenwashing_reasons.length > 0 ? (
                  <ul className="space-y-1.5">
                    {asset.greenwashing_reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-label text-ink-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-solar mt-1.5 flex-shrink-0" />
                        {t(`transparency.reasons.${r}`)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-label text-ink-2">{t("transparency.gw_hint_low")}</p>
                )}
                <p className="text-caption text-ink-3 leading-snug">
                  {t(`transparency.coverage_hint.${asset.data_coverage}`)}
                </p>
                {asset.greenwashing_risk !== "low" && (
                  <RelatedCourse
                    slug="greenwashing-6-signaux"
                    reason={t("transparency.learn_greenwashing")}
                  />
                )}
              </div>
            </Disclosure>
          </section>

          {/* Risques — repliés : le débutant lit d'abord l'essentiel, ouvre le
              détail (niveau SRI, risques, exclusions) s'il veut creuser. */}
          <section>
            <Disclosure title={t("asset_detail.risks_title")}>
              <div className="paper-card p-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-paper-3">
                  <Glossary
                    term="Risque"
                    className="text-caption !text-ink-3 hover:!text-ink-2 font-medium"
                  >
                    {t("asset_detail.risk_level")}
                  </Glossary>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <span
                          key={n}
                          className={`w-1.5 h-3 rounded-sm ${n <= risk ? "bg-ink" : "bg-paper-3"}`}
                        />
                      ))}
                    </div>
                    <span className={`text-caption font-semibold ${riskInfo.tone}`}>
                      {risk}/7 · {riskInfo.label}
                    </span>
                  </div>
                </div>
                {/* Ancrage de l'échelle : un "4/7" ne veut rien dire sans repère */}
                <p className="text-tag text-ink-3 leading-snug pt-2.5 pb-3">
                  {t("asset_detail.risk_scale")}
                </p>
                <ul className="space-y-2">
                  {risksList.map((r) => (
                    <li key={r.title} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rust mt-1.5 flex-shrink-0" />
                      <div className="text-label leading-relaxed">
                        <span className="font-semibold text-ink">{r.title} · </span>
                        <span className="text-ink-2">{r.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {asset.exclusions && asset.exclusions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-paper-3">
                    <p className="text-tag uppercase tracking-wider text-ink-3 font-mono mb-1.5">
                      {t("asset_detail.exclusions_applied")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {asset.exclusions.map((e) => (
                        <span
                          key={e}
                          className="text-tag bg-rust/10 text-rust font-semibold px-2 py-0.5 rounded-full border border-rust/20"
                        >
                          ⊘ {t(`onboarding.steps.exclusions.${e}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Disclosure>
          </section>

          {/* Coût — promu et expliqué (analyse UX §14 « combien ça coûte » + §21).
              Pour un débutant, « frais 0,20 % » ne veut rien dire : on le traduit
              en euros concrets sur 1 000 € et on donne le sens de lecture. */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono mb-2">
              {t("asset_detail.cost.title")}
            </p>
            <div className="paper-card p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="font-value text-2xl leading-none text-ink">
                  {formatPercent(asset.ter_pct / 100, lang)}
                  <span className="text-tag text-ink-3 ml-1 font-sans">
                    {t("asset_detail.cost.per_year")}
                  </span>
                </span>
                <span className="text-caption text-ink-2 font-medium text-right">
                  {t("asset_detail.cost.on_1000", {
                    amount: formatCurrency((asset.ter_pct / 100) * 1000, lang),
                  })}
                </span>
              </div>
              <p className="text-caption text-ink-3 leading-snug mt-2.5 pt-2.5 border-t border-dashed border-paper-3">
                {t("asset_detail.cost.hint")}
              </p>
            </div>
          </section>

          {/* Détails experts — repliés par défaut (§09 : ne jamais noyer). */}
          <section>
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              aria-expanded={detailsOpen}
              className="w-full flex items-center justify-between text-tag uppercase tracking-[0.18em] text-ink-3 font-mono hover:text-ink-2 transition-colors"
            >
              {t("asset_detail_sheet.id_card")}
              <svg
                viewBox="0 0 16 16"
                className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
            {detailsOpen && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-label mt-3">
                {asset.issuer && (
                  <IdRow label={t("asset_detail_sheet.issuer")} value={asset.issuer} />
                )}
                {asset.currency && (
                  <IdRow label={t("asset_detail_sheet.currency")} value={asset.currency} />
                )}
                <IdRow
                  label={t("asset_detail_sheet.fees")}
                  value={formatPercent(asset.ter_pct / 100, lang)}
                />
                {asset.sfdr_article && (
                  <IdRow label={sfdrLabel} value={`Article ${asset.sfdr_article}`} />
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer CTA collant */}
        <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-paper-3 px-5 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-4 rounded-full bg-paper-2 hover:bg-paper-3 border border-paper-3 text-label font-semibold text-ink-2"
          >
            {t("common.close")}
          </button>
          <button
            type="button"
            onClick={() => toggle(asset.id, asset.name)}
            aria-pressed={watched}
            aria-label={watched ? t("watchlist.following") : t("watchlist.follow")}
            className={`h-11 px-4 rounded-full border text-label font-semibold flex items-center gap-1.5 transition-colors ${
              watched
                ? "bg-gold/15 border-gold text-ink"
                : "bg-paper-2 border-paper-3 text-ink-2 hover:border-ink/40"
            }`}
          >
            <Star
              className={`w-4 h-4 transition-transform ${watched ? "fill-gold text-gold scale-110" : ""}`}
              strokeWidth={2}
            />
            <span className="hidden sm:inline">
              {watched ? t("watchlist.following") : t("watchlist.follow")}
            </span>
          </button>
          <InvestDialog
            label={t("asset_detail.invest_in", { ticker: asset.ticker })}
            defaultAmount={100}
            trigger={
              <button
                type="button"
                className="flex-1 h-11 rounded-full bg-ink text-paper text-label font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                {t("asset_detail.invest_now")}
              </button>
            }
          />

          {/* Ce qu'on sait de ce fonds — et ce qui manque. Placé après les
              chiffres : on montre d'abord, on qualifie ensuite. */}
          <AssetLayersBlock asset={asset} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Section repliable native (`<details>`) — refonte mobile §8/§13 : la fiche
 * s'ouvre sur l'essentiel (résumé, verdict, coût), et les blocs denses (détail
 * carbone, transparence, risques) se déplient à la demande, au lieu d'empiler
 * trois écrans de scroll. Aucun state React : `<details>` est accessible nativement.
 */
function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-0.5 [&::-webkit-details-marker]:hidden">
        <span className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">{title}</span>
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 flex-none text-ink-3 transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <div className="mt-2.5">{children}</div>
    </details>
  );
}

const BOND_CLASSES = new Set(["green_bond", "social_bond", "sov_bond", "corporate_bond"]);

/**
 * Regroupe les classes d'actifs techniques en familles compréhensibles par un
 * débutant, pour l'explainer « En clair ». On garde 6 familles seulement — au-delà,
 * on noierait (cf. §09). Chaque famille a une clé i18n dédiée (plain.kinds.*).
 */
type AssetKind = "equity" | "thematic" | "bond" | "reit" | "commodity" | "cash";
function assetKind(assetClass: string): AssetKind {
  if (assetClass === "thematic") return "thematic";
  if (BOND_CLASSES.has(assetClass)) return "bond";
  if (assetClass === "reit") return "reit";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "cash") return "cash";
  return "equity"; // equity_dev, equity_em, défaut
}

function buildRisks(
  asset: DiscoverAsset,
  t: (key: string, options?: Record<string, unknown>) => string,
): { title: string; desc: string }[] {
  const risks: { title: string; desc: string }[] = [];

  risks.push({
    title: t("asset_detail.risks.capital_loss_title"),
    desc: t("asset_detail.risks.capital_loss_desc"),
  });

  if (BOND_CLASSES.has(asset.asset_class)) {
    risks.push({
      title: t("asset_detail.risks.interest_rate_title"),
      desc: t("asset_detail.risks.interest_rate_desc"),
    });
    risks.push({
      title: t("asset_detail.risks.credit_risk_title"),
      desc: t("asset_detail.risks.credit_risk_desc"),
    });
  } else {
    risks.push({
      title: t("asset_detail.risks.market_risk_title"),
      desc: t("asset_detail.risks.market_risk_desc"),
    });
    if (asset.currency && asset.currency !== "EUR") {
      risks.push({
        title: t("asset_detail.risks.currency_risk_title"),
        desc: t("asset_detail.risks.currency_risk_desc", { currency: asset.currency }),
      });
    }
  }

  if (asset.asset_class === "thematic" || asset.themes.length > 0) {
    risks.push({
      title: t("asset_detail.risks.thematic_risk_title"),
      desc: t("asset_detail.risks.thematic_risk_desc"),
    });
  }

  return risks.slice(0, 4);
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-paper-3 py-1.5">
      <span className="text-ink-3 font-medium">{label}</span>
      <span className="text-ink font-semibold text-right truncate">{value}</span>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper-2 rounded-xl p-2.5 border border-paper-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-tag text-ink-3 font-medium">{label}</span>
        <span className="text-tag font-bold text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-paper-3 rounded-full overflow-hidden">
        <div className="h-full bg-highlight-1 rounded-full" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
