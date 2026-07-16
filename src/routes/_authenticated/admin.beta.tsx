import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBetaAdminStats, type BetaAdminStats, type BetaTester } from "@/lib/beta/beta.functions";
import { callAuthed } from "@/lib/authedServerFn";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/beta")({
  component: AdminBetaPage,
});

function AdminBetaPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [stats, setStats] = useState<BetaAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    callAuthed(getBetaAdminStats, undefined as never)
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("admin_beta.error_fallback")),
      );
  }, [t]);

  const filteredTesters = useMemo(() => {
    if (!stats) return [];
    const q = query.trim().toLowerCase();
    if (!q) return stats.testers;
    return stats.testers.filter(
      (tester) =>
        tester.email?.toLowerCase().includes(q) ||
        tester.display_name?.toLowerCase().includes(q) ||
        tester.id.toLowerCase().includes(q),
    );
  }, [stats, query]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-rust text-sm">{error}</p>
        <Link to="/dashboard" className="text-label underline mt-4 inline-block">
          {t("admin_beta.back_dashboard")}
        </Link>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-ink-3 text-sm">
        {t("admin_beta.loading")}
      </div>
    );
  }

  const dtOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const dOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const fillPct = Math.round(stats.fillRate * 100);
  const statusLabel =
    stats.status === "open" ? t("admin_beta.status_open") : t("admin_beta.status_closed");
  const statusTone = stats.status === "open" && stats.slotsLeft > 0 ? "text-forest" : "text-rust";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-tag uppercase tracking-[0.22em] text-gold font-semibold">
            {t("admin_beta.eyebrow")}
          </p>
          <h1 className="font-display text-3xl text-ink mt-2">{t("admin_beta.title")}</h1>
        </div>
        <Link to="/dashboard" className="text-label underline text-ink-3 hover:text-ink">
          {t("admin_beta.back_dashboard")}
        </Link>
      </header>

      {/* Capacity overview */}
      <section className="border border-paper-3 rounded-2xl p-6 bg-paper-2/40">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-tag uppercase tracking-[0.22em] text-ink-3 font-semibold">
              {t("admin_beta.capacity_title")}
            </p>
            <p className="font-display text-4xl text-ink mt-2 tabular-nums">
              {stats.signups} <span className="text-ink-3 text-2xl">/ {stats.cap}</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-label uppercase tracking-[0.18em] font-semibold ${statusTone}`}>
              ● {statusLabel}
            </p>
            <p className="text-body-sm text-ink-2 mt-1 tabular-nums">
              {t("admin_beta.slots_left", { count: stats.slotsLeft })}
            </p>
          </div>
        </div>
        <div className="h-2 w-full bg-paper-3 rounded-full overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: `${fillPct}%` }} />
        </div>
        <p className="text-caption text-ink-3 mt-2 tabular-nums">{fillPct}%</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={t("admin_beta.kpi_waitlist")} value={String(stats.waitlist)} />
        <Kpi label={t("admin_beta.kpi_portfolios")} value={String(stats.portfoliosCreated)} />
        <Kpi
          label={t("admin_beta.kpi_nps")}
          value={stats.npsAverage !== null ? stats.npsAverage.toFixed(1) : "—"}
        />
        <Kpi label={t("admin_beta.kpi_intents")} value={String(stats.realIntents)} />
        <Kpi
          label={t("admin_beta.kpi_intents_total")}
          value={formatCurrency(stats.realIntentsTotalAmount, lang)}
        />
        <Kpi label={t("admin_beta.kpi_feedback")} value={String(stats.feedbackCount)} />
        <Kpi
          label={t("admin_beta.kpi_conversion")}
          value={
            stats.signups > 0
              ? `${Math.round((stats.portfoliosCreated / stats.signups) * 100)}%`
              : "—"
          }
        />
        <Kpi label={t("admin_beta.kpi_errors_24h")} value={String(stats.clientErrors24h)} />
      </section>

      {/* Onboarding funnel */}
      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_beta.funnel_title")}</h2>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {stats.onboardingFunnel.map((s) => {
            const dropRate = s.entered > 0 ? 1 - s.completed / s.entered : 0;
            return (
              <div key={s.step} className="p-4">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="font-medium text-ink">
                    {t(`admin_beta.funnel_step_${s.step}`, { defaultValue: s.step })}
                  </span>
                  <span className="text-ink-3 tabular-nums">
                    {s.completed} / {s.entered}
                    {s.entered > 0 && (
                      <span className={`ml-2 ${dropRate > 0.3 ? "text-rust" : "text-ink-3"}`}>
                        (-{Math.round(dropRate * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-paper-3 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gold"
                    style={{ width: `${s.entered > 0 ? (s.completed / s.entered) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="p-4 flex items-center justify-between text-body-sm">
            <span className="font-medium text-ink">{t("admin_beta.funnel_allocation")}</span>
            <span className="text-ink-3 tabular-nums">
              {stats.allocationAccepted} / {stats.allocationSeen}
            </span>
          </div>
        </div>
        <p className="text-caption text-ink-3 mt-2">{t("admin_beta.funnel_hint")}</p>
      </section>

      {/* Market data ingestion health */}
      <section>
        <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
          <h2 className="font-display text-lg text-ink">{t("admin_beta.ingestion_title")}</h2>
          <span
            className={`text-label uppercase tracking-[0.18em] font-semibold ${
              stats.ingestionSuccessRate === null
                ? "text-ink-3"
                : stats.ingestionSuccessRate >= 0.9
                  ? "text-forest"
                  : "text-rust"
            }`}
          >
            {stats.ingestionSuccessRate !== null
              ? t("admin_beta.ingestion_success_rate", {
                  pct: Math.round(stats.ingestionSuccessRate * 100),
                })
              : t("admin_beta.ingestion_no_data")}
          </span>
        </div>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {stats.ingestionRuns.length === 0 ? (
            <p className="p-4 text-body-sm text-ink-3">{t("admin_beta.ingestion_no_data")}</p>
          ) : (
            stats.ingestionRuns.slice(0, 8).map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between text-body-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={
                      r.status === "ok"
                        ? "text-forest"
                        : r.status === "partial"
                          ? "text-gold"
                          : "text-rust"
                    }
                  >
                    ●
                  </span>
                  <span className="text-ink tabular-nums">
                    {r.assets_ok} ok
                    {r.assets_failed > 0
                      ? ` · ${r.assets_failed} ${t("admin_beta.ingestion_failed")}`
                      : ""}
                  </span>
                </span>
                <span className="text-ink-3 text-caption tabular-nums">
                  {formatDate(r.ran_at, lang, dtOpts)}
                  {r.duration_ms != null ? ` · ${Math.round(r.duration_ms / 1000)}s` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Testers list */}
      <section>
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-display text-lg text-ink">
            {t("admin_beta.testers_title")}{" "}
            <span className="text-ink-3 text-body-sm font-normal tabular-nums">
              ({filteredTesters.length})
            </span>
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin_beta.testers_search")}
            className="text-body-sm border border-paper-3 rounded-lg px-3 py-1.5 bg-paper outline-none focus:border-gold transition-colors w-full sm:w-64"
          />
        </div>
        <div className="border border-paper-3 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="bg-paper-2/60 text-tag uppercase tracking-[0.14em] text-ink-3">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">
                    {t("admin_beta.col_tester")}
                  </th>
                  <th className="text-left font-semibold px-4 py-3">{t("admin_beta.col_email")}</th>
                  <th className="text-left font-semibold px-4 py-3">
                    {t("admin_beta.col_joined")}
                  </th>
                  <th className="text-left font-semibold px-4 py-3">
                    {t("admin_beta.col_last_seen")}
                  </th>
                  <th className="text-right font-semibold px-4 py-3">
                    {t("admin_beta.col_portfolios")}
                  </th>
                  <th className="text-center font-semibold px-4 py-3">
                    {t("admin_beta.col_feedback")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-3">
                {filteredTesters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-ink-3">
                      {t("admin_beta.testers_empty")}
                    </td>
                  </tr>
                ) : (
                  filteredTesters.map((tester) => (
                    <TesterRow
                      key={tester.id}
                      tester={tester}
                      dOpts={dOpts}
                      dtOpts={dtOpts}
                      lang={lang}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_beta.recent_intents")}</h2>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {stats.recentIntents.length === 0 ? (
            <p className="p-4 text-body-sm text-ink-3">{t("admin_beta.no_intents")}</p>
          ) : (
            stats.recentIntents.map((i) => (
              <div key={i.id} className="p-4 flex items-center justify-between text-body-sm">
                <span>
                  {formatCurrency(i.amount, lang)}
                  <span className="text-ink-3 ml-2">
                    ·{" "}
                    {i.frequency === "monthly" ? t("admin_beta.monthly") : t("admin_beta.one_shot")}
                  </span>
                </span>
                <span className="text-ink-3 text-caption">
                  {formatDate(i.created_at, lang, dtOpts)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_beta.recent_feedback")}</h2>
        <div className="space-y-3">
          {stats.recentFeedback.length === 0 ? (
            <p className="text-body-sm text-ink-3">{t("admin_beta.no_feedback")}</p>
          ) : (
            stats.recentFeedback.map((f) => (
              <div key={f.id} className="border border-paper-3 rounded-xl p-4">
                <div className="flex items-center justify-between text-caption text-ink-3 mb-2">
                  <span>NPS : {f.nps ?? "—"}</span>
                  <span>{formatDate(f.created_at, lang, dtOpts)}</span>
                </div>
                {f.blocker && (
                  <p className="text-body-sm text-ink mb-1">
                    <span className="text-ink-3 text-caption uppercase tracking-wider mr-2">
                      {t("admin_beta.blocker")}
                    </span>
                    {f.blocker}
                  </p>
                )}
                {f.wish && (
                  <p className="text-body-sm text-ink">
                    <span className="text-ink-3 text-caption uppercase tracking-wider mr-2">
                      {t("admin_beta.wish")}
                    </span>
                    {f.wish}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TesterRow({
  tester,
  dOpts,
  dtOpts,
  lang,
}: {
  tester: BetaTester;
  dOpts: Intl.DateTimeFormatOptions;
  dtOpts: Intl.DateTimeFormatOptions;
  lang: "fr" | "en";
}) {
  const { t } = useTranslation();
  return (
    <tr className="hover:bg-paper-2/40 transition-colors">
      <td className="px-4 py-3">
        <div className="text-ink">
          {tester.display_name || (
            <span className="text-ink-3 italic">{t("admin_beta.no_name")}</span>
          )}
        </div>
        <div className="text-tag text-ink-3 font-mono">{tester.id.slice(0, 8)}…</div>
      </td>
      <td className="px-4 py-3 text-ink-2">{tester.email ?? "—"}</td>
      <td className="px-4 py-3 text-ink-3 tabular-nums">
        {formatDate(tester.created_at, lang, dOpts)}
      </td>
      <td className="px-4 py-3 text-ink-3 tabular-nums">
        {tester.last_sign_in_at ? formatDate(tester.last_sign_in_at, lang, dtOpts) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-ink">{tester.portfolios_count}</td>
      <td className="px-4 py-3 text-center">
        {tester.has_feedback ? (
          <span className="text-forest">●</span>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </td>
    </tr>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <p className="text-tag uppercase tracking-[0.18em] text-ink-3 font-semibold">{label}</p>
      <p className="font-value text-2xl text-ink mt-1 tabular-nums">{value}</p>
    </div>
  );
}
