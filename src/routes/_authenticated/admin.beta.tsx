import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBetaAdminStats, type BetaAdminStats } from "@/lib/beta/beta.functions";
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

  useEffect(() => {
    callAuthed(getBetaAdminStats, undefined as never)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : t("admin_beta.error_fallback")));
  }, [t]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-rust text-sm">{error}</p>
        <Link to="/dashboard" className="text-[12px] underline mt-4 inline-block">
          {t("admin_beta.back_dashboard")}
        </Link>
      </div>
    );
  }

  if (!stats) {
    return <div className="max-w-3xl mx-auto px-6 py-12 text-ink-3 text-sm">{t("admin_beta.loading")}</div>;
  }

  const dtOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">{t("admin_beta.eyebrow")}</p>
        <h1 className="font-display text-3xl text-ink mt-2">{t("admin_beta.title")}</h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={t("admin_beta.kpi_signups")} value={`${stats.signups} / ${stats.cap}`} />
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
          value={stats.signups > 0 ? `${Math.round((stats.portfoliosCreated / stats.signups) * 100)}%` : "—"}
        />
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">{t("admin_beta.recent_intents")}</h2>
        <div className="border border-paper-3 rounded-2xl divide-y divide-paper-3">
          {stats.recentIntents.length === 0 ? (
            <p className="p-4 text-[13px] text-ink-3">{t("admin_beta.no_intents")}</p>
          ) : (
            stats.recentIntents.map((i) => (
              <div key={i.id} className="p-4 flex items-center justify-between text-[13px]">
                <span>
                  {formatCurrency(i.amount, lang)}
                  <span className="text-ink-3 ml-2">· {i.frequency === "monthly" ? t("admin_beta.monthly") : t("admin_beta.one_shot")}</span>
                </span>
                <span className="text-ink-3 text-[11px]">
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
            <p className="text-[13px] text-ink-3">{t("admin_beta.no_feedback")}</p>
          ) : (
            stats.recentFeedback.map((f) => (
              <div key={f.id} className="border border-paper-3 rounded-xl p-4">
                <div className="flex items-center justify-between text-[11px] text-ink-3 mb-2">
                  <span>NPS : {f.nps ?? "—"}</span>
                  <span>{formatDate(f.created_at, lang, dtOpts)}</span>
                </div>
                {f.blocker && (
                  <p className="text-[13px] text-ink mb-1">
                    <span className="text-ink-3 text-[11px] uppercase tracking-wider mr-2">{t("admin_beta.blocker")}</span>
                    {f.blocker}
                  </p>
                )}
                {f.wish && (
                  <p className="text-[13px] text-ink">
                    <span className="text-ink-3 text-[11px] uppercase tracking-wider mr-2">{t("admin_beta.wish")}</span>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-semibold">{label}</p>
      <p className="font-value text-2xl text-ink mt-1 tabular-nums">{value}</p>
    </div>
  );
}
