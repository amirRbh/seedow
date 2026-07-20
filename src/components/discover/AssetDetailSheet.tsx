import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Slider } from "@/components/ui/slider";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { Glossary } from "@/components/ui/Glossary";
import {
  DataCoverageBadge,
  GreenwashingBadge,
  SourceLink,
} from "@/components/discover/TransparencyBadges";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trackAppEvent } from "@/lib/analytics/appEvents";
import type { DiscoverAsset } from "@/lib/discover/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: DiscoverAsset | null;
}

function co2AvoidedFor(monthly: number, co2FactorPer1k: number) {
  const annualK = (monthly * 12) / 1000;
  return co2FactorPer1k * annualK;
}

export function AssetDetailSheet({ open, onOpenChange, asset }: Props) {
  const { t } = useTranslation();
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

  const [monthly, setMonthly] = useState(100);
  const { isWatched, toggle } = useWatchlist();

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

  const co2 =
    asset.co2_factor_per_1k_eur != null
      ? co2AvoidedFor(monthly, asset.co2_factor_per_1k_eur)
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="px-5 pt-5 pb-4 border-b border-paper-3 bg-paper-2/40">
          <SheetHeader className="text-left p-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">
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
              <div className="flex items-center gap-1 text-tag font-semibold text-highlight-1 bg-highlight-5 px-2 py-1 rounded-full border border-highlight-4 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight-1" />
                ESG {asset.overall_esg_score.toFixed(1)}
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* {t("asset_detail.summary")} */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
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
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-3">
              {t("asset_detail.impact_overview")}
            </p>

            {/* Montant + slider */}
            <div className="bg-paper-2 rounded-xl p-4 border border-paper-3 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-caption text-ink-3 font-medium">
                  {t("asset_detail.monthly_deposit")}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={500}
                    step={10}
                    value={monthly}
                    onChange={(e) => {
                      const v = Math.min(500, Math.max(10, Number(e.target.value) || 0));
                      setMonthly(v);
                    }}
                    className="w-20 h-8 text-right font-value text-body-lg text-ink bg-paper border border-paper-3 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ink-2"
                  />
                  <span className="text-label text-ink-3 font-medium">
                    {t("asset_detail.per_month")}
                  </span>
                </div>
              </div>
              <Slider
                min={10}
                max={500}
                step={10}
                value={[monthly]}
                onValueChange={(val) => setMonthly(val[0])}
                className="[&_[data-orientation=horizontal]]:bg-paper-3 [&_[data-radix-slider-range]]:bg-highlight-1 [&_[data-radix-slider-thumb]]:border-highlight-2 [&_[data-radix-slider-thumb]]:bg-paper"
              />
              <div className="flex justify-between mt-2">
                <span className="text-tag text-ink-3 font-medium">10 €</span>
                <span className="text-tag text-ink-3 font-medium">500 €</span>
              </div>
            </div>

            {/* Résultat dynamique */}
            {co2 != null ? (
              <div className="bg-paper-2 rounded-xl p-3 border border-paper-3 text-center">
                <p className="font-value text-xl leading-none text-highlight-1">
                  {co2.toFixed(1)}
                  <span className="text-tag text-ink-3 ml-0.5 font-sans">kg</span>
                </p>
                <p className="text-tag text-ink-3 mt-1.5 font-medium uppercase tracking-wider">
                  {t("asset_detail.co2_avoided")}
                </p>
              </div>
            ) : (
              <p className="text-caption text-ink-3 italic">{t("asset_detail.co2_unavailable")}</p>
            )}

            <div className="grid grid-cols-3 gap-2.5 mt-2.5">
              <MiniBar label={t("asset_detail.climate")} value={asset.climate_score} />
              <MiniBar label={t("asset_detail.social")} value={asset.social_score} />
              <MiniBar label={t("asset_detail.ethics")} value={asset.governance_score} />
            </div>
            <div className="mt-2.5">
              <SourceLink />
            </div>
          </section>

          {/* Transparence — on assume publiquement les limites de nos données */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              {t("transparency.section_title")}
            </p>
            <div className="paper-card p-3.5 space-y-3">
              <div className="flex flex-wrap gap-1.5">
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
            </div>
          </section>

          {/* Risques */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              {t("asset_detail.risks_title")}
            </p>
            <div className="paper-card p-3.5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-paper-3">
                <span className="text-caption text-ink-3 font-medium">
                  {t("asset_detail.risk_level")}
                </span>
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
                  <p className="text-tag uppercase tracking-wider text-ink-3 font-semibold mb-1.5">
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
          </section>

          {/* {t("asset_detail.identity_card")} */}
          <section>
            <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold mb-2">
              {t("asset_detail_sheet.id_card")}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-label">
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
                <IdRow
                  label={t("asset_detail_sheet.sfdr")}
                  value={`Article ${asset.sfdr_article}`}
                />
              )}
            </div>
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
            defaultAmount={monthly}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

const BOND_CLASSES = new Set(["green_bond", "social_bond", "sov_bond", "corporate_bond"]);

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

function StatTile({
  value,
  unit,
  label,
  tone,
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: "highlight" | "default";
}) {
  return (
    <div className="bg-paper-2 rounded-xl p-3 text-center border border-paper-3">
      <p
        className={`font-value text-xl leading-none ${tone === "highlight" ? "text-highlight-1" : "text-ink"}`}
      >
        {value}
        {unit && <span className="text-caption text-ink-3 ml-0.5 font-sans">{unit}</span>}
      </p>
      <p className="text-tag mt-1.5 text-ink-3 font-medium leading-tight uppercase tracking-wider">
        {label}
      </p>
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
