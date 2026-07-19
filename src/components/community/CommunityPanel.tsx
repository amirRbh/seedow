import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useCommunityShares,
  useImpactLeaderboard,
  type PortfolioShareRow,
} from "@/hooks/usePortfolioShare";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useLang } from "@/hooks/useLang";
import { formatNumber, formatPercent } from "@/lib/format";
import { esgToneFrom100, ESG_TONE_CLASSES } from "@/lib/esgTone";

function ShareCard({ s }: { s: PortfolioShareRow }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  return (
    <article className="rounded-lg border border-paper-3 bg-paper p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-baseline justify-between">
        <p className="font-value text-lg text-ink">@{s.public_handle}</p>
        <span className="text-tag uppercase tracking-[0.18em] text-gold">
          {formatNumber(s.risk_target * 100, lang, { maximumFractionDigits: 0 })} %{" "}
          {t("community_panel.risk")}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">
        {t("community_panel.horizon", { defaultValue: "Horizon" })} {s.horizon_years}{" "}
        {t("community_panel.years")} ·{" "}
        {s.causes.slice(0, 3).join(", ") || t("community_panel.no_cause")}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-paper-3 pt-3 text-xs">
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-tag">ESG</p>
          <p
            className={`font-value tabular-nums ${s.esg_score != null ? ESG_TONE_CLASSES[esgToneFrom100(s.esg_score)].text : "text-ink"}`}
          >
            {s.esg_score
              ? formatNumber(s.esg_score, lang, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-tag">
            {t("community_panel.expected_return")}
          </p>
          <p className="font-value text-ink tabular-nums">
            {s.expected_return ? formatPercent(s.expected_return, lang) : "—"}
          </p>
        </div>
        <div>
          <p className="text-ink-3 uppercase tracking-[0.16em] text-tag">
            {t("allocation_refiner.volatility")}
          </p>
          <p className="font-value text-ink tabular-nums">
            {s.volatility ? formatPercent(s.volatility, lang) : "—"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function CommunityPanel() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [cause, setCause] = useState<string | undefined>(undefined);
  const { shares, loading } = useCommunityShares({ cause });
  const { rows: leaderboard, loading: lbLoading } = useImpactLeaderboard();
  const { portfolio } = useActivePortfolio();

  const myESG = portfolio?.metrics?.esg_score ?? null;
  const median = leaderboard.length
    ? leaderboard.map((r) => r.esg_score ?? 0).sort((a, b) => a - b)[
        Math.floor(leaderboard.length / 2)
      ]
    : null;

  const causes = Array.from(new Set(shares.flatMap((s) => s.causes))).slice(0, 10);

  return (
    <div>
      {myESG != null && median != null && (
        <div className="mb-6 rounded-lg border border-paper-3 bg-paper-2 p-4">
          <p className="text-tag uppercase tracking-[0.22em] text-gold mb-2">
            {t("community_panel.where_you_stand")}
          </p>
          <p className="text-sm text-ink">
            {t("community_panel.your_esg_score")}{" "}
            <span className="font-value text-lg tabular-nums">
              {formatNumber(myESG, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>{" "}
            · {t("community_panel.community_median")}{" "}
            <span className="font-value text-lg tabular-nums">
              {formatNumber(median, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>{" "}
            {myESG >= median ? (
              <span className="text-gold text-xs uppercase tracking-[0.18em] font-semibold ml-2">
                {t("community_panel.above")}
              </span>
            ) : (
              <span className="text-ink-3 text-xs uppercase tracking-[0.18em] font-semibold ml-2">
                {t("community_panel.below")}
              </span>
            )}
          </p>
        </div>
      )}

      <Tabs defaultValue="shares">
        <TabsList>
          <TabsTrigger value="shares">{t("community_panel.tab_shares")}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t("community_panel.tab_leaderboard")}</TabsTrigger>
        </TabsList>

        <TabsContent value="shares" className="pt-6">
          {causes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setCause(undefined)}
                className={`text-caption uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${!cause ? "bg-ink text-paper border-ink" : "border-paper-3 text-ink-3 hover:text-ink"}`}
              >
                {t("community_panel.all")}
              </button>
              {causes.map((c) => (
                <button
                  key={c}
                  onClick={() => setCause(c)}
                  className={`text-caption uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${cause === c ? "bg-ink text-paper border-ink" : "border-paper-3 text-ink-3 hover:text-ink"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-ink-3">{t("community_panel.loading")}</p>
          ) : shares.length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-3 p-10 text-center">
              <p className="font-value text-xl text-ink">{t("community_panel.no_shares")}</p>
              <p className="mt-2 text-sm text-ink-3">{t("community_panel.be_the_first")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shares.map((s) => (
                <ShareCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="pt-6">
          {lbLoading ? (
            <p className="text-ink-3">{t("community_panel.loading")}</p>
          ) : (
            <ol className="divide-y divide-paper-3 rounded-lg border border-paper-3 bg-paper">
              {leaderboard.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="font-value text-lg text-gold tabular-nums w-8">{i + 1}</span>
                  <span className="flex-1 text-ink font-medium">@{r.public_handle}</span>
                  <span className="text-xs text-ink-3 tabular-nums">
                    ESG{" "}
                    <span
                      className={`font-value ${r.esg_score != null ? ESG_TONE_CLASSES[esgToneFrom100(r.esg_score)].text : "text-ink"}`}
                    >
                      {r.esg_score
                        ? formatNumber(r.esg_score, lang, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </span>
                  </span>
                  <span className="text-xs text-ink-3 tabular-nums hidden sm:inline">
                    CO₂{" "}
                    <span className="text-ink font-value">
                      {r.carbon_intensity
                        ? formatNumber(r.carbon_intensity, lang, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </span>
                  </span>
                </li>
              ))}
              {leaderboard.length === 0 && (
                <li className="p-6 text-center text-ink-3 text-sm">
                  {t("community_panel.no_leaderboard")}
                </li>
              )}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
