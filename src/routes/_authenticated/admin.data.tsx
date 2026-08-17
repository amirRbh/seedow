import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDataHealth, type DataHealthReport } from "@/lib/data-engine/health.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/data")({
  component: AdminDataPage,
});

function AdminDataPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callAuthed(getDataHealth, undefined as never)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("admin_data.error_fallback")),
      );
  }, [t]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-rust text-sm">{error}</p>
        <Link to="/dashboard" className="text-label underline mt-4 inline-block">
          {t("admin_data.back_dashboard")}
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-ink-3 text-sm">
        {t("admin_data.loading")}
      </div>
    );
  }

  const { quality } = report;
  const dtOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-tag uppercase tracking-[0.22em] text-gold font-mono">
            {t("admin_data.eyebrow")}
          </p>
          <h1 className="font-display text-3xl text-ink mt-2">{t("admin_data.title")}</h1>
        </div>
        <Link to="/dashboard" className="text-label underline text-ink-3 hover:text-ink">
          {t("admin_data.back_dashboard")}
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={t("admin_data.kpi_tracked")} value={String(quality.fundsTracked)} />
        <Kpi label={t("admin_data.kpi_healthy")} value={String(quality.healthy)} tone="forest" />
        <Kpi
          label={t("admin_data.kpi_needs_update")}
          value={String(quality.needsUpdate)}
          tone="rust"
        />
        <Kpi
          label={t("admin_data.kpi_connectors")}
          value={`${report.connectorsImplemented} / ${report.connectorsTotal}`}
        />
        <Kpi label={t("admin_data.kpi_no_holdings")} value={String(quality.fundsWithoutHoldings)} />
        <Kpi label={t("admin_data.kpi_no_source")} value={String(quality.fundsWithoutSource)} />
        <Kpi
          label={t("admin_data.kpi_invalid_isin")}
          value={String(quality.invalidIsinFundIds.length)}
        />
        <Kpi
          label={t("admin_data.kpi_duplicates")}
          value={String(
            Object.keys(quality.duplicateIsin).length + Object.keys(quality.duplicateTicker).length,
          )}
        />
      </section>

      {/* Sources */}
      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_data.sources_title")}</h2>
        <div className="border border-paper-3 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="bg-paper-2/60 text-tag uppercase tracking-[0.14em] text-ink-3">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">
                    {t("admin_data.col_source")}
                  </th>
                  <th className="text-center font-semibold px-4 py-3">
                    {t("admin_data.col_priority")}
                  </th>
                  <th className="text-center font-semibold px-4 py-3">
                    {t("admin_data.col_connector")}
                  </th>
                  <th className="text-center font-semibold px-4 py-3">
                    {t("admin_data.col_health")}
                  </th>
                  <th className="text-right font-semibold px-4 py-3">
                    {t("admin_data.col_checked")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-3">
                {report.sources.map((s) => (
                  <tr key={s.key} className="hover:bg-paper-2/40 transition-colors">
                    <td className="px-4 py-3 text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-center text-ink-3 tabular-nums">{s.priority}</td>
                    <td className="px-4 py-3 text-center">
                      {s.implemented ? (
                        <span className="text-forest">●</span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-ink-3 uppercase text-caption tracking-wide">
                      {s.health}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-3 text-caption tabular-nums">
                      {s.lastCheckedAt ? formatDate(s.lastCheckedAt, lang, dtOpts) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sustainability tiers (B4) */}
      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_data.tiers_title")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label={t("admin_data.tier_paris_aligned")}
            value={String(report.sustainabilityTiers.paris_aligned)}
            tone="forest"
          />
          <Kpi
            label={t("admin_data.tier_transition")}
            value={String(report.sustainabilityTiers.transition)}
          />
          <Kpi
            label={t("admin_data.tier_broad_esg")}
            value={String(report.sustainabilityTiers.broad_esg)}
          />
          <Kpi
            label={t("admin_data.tier_insufficient")}
            value={String(report.sustainabilityTiers.insufficient_evidence)}
            tone="rust"
          />
        </div>
      </section>

      {/* Ingestion plan (B2/B3) */}
      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_data.plan_title")}</h2>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {report.ingestionPlan.length === 0 ? (
            <p className="p-4 text-body-sm text-ink-3">{t("admin_data.plan_empty")}</p>
          ) : (
            report.ingestionPlan.map((item) => (
              <div
                key={item.assetId}
                className="p-4 flex items-center justify-between text-body-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-ink">{item.ticker ?? item.isin ?? "—"}</span>
                  <span className="text-ink-3 text-caption">{item.reasons.join(", ")}</span>
                </span>
                <span className="text-ink-3 text-caption tabular-nums">
                  {t("admin_data.priority")} {item.priority}
                  {item.staleDays != null ? ` · ${item.staleDays}j` : ""}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="text-caption text-ink-3 mt-2">{t("admin_data.plan_hint")}</p>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "forest" | "rust" }) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-mono">{label}</p>
      <p
        className={`font-value text-2xl mt-1 tabular-nums ${
          tone === "forest" ? "text-forest" : tone === "rust" ? "text-rust" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
