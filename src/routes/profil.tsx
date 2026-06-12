import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { JourneySteps } from "@/components/navigation/JourneySteps";
import { KPIFigure } from "@/components/ui/KPIFigure";
import { Glossary } from "@/components/ui/Glossary";
import { DecisionTimeline } from "@/components/profil/DecisionTimeline";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useLang } from "@/hooks/useLang";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/profil", mode: "login" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Mon profil d'investisseur — Seedow" },
      {
        name: "description",
        content:
          "Vue d'ensemble de tes valeurs, ton portefeuille et ta progression sur Seedow.",
      },
    ],
  }),
  component: ProfilPage,
});

const CAUSE_LABELS_FR: Record<string, string> = {
  climat: "Climat",
  biodiversite: "Biodiversité",
  humain: "Droits humains",
  egalite: "Égalité F/H",
  tech: "Tech éthique",
  circulaire: "Économie circulaire",
  eau: "Eau",
  social: "Humain",
  governance: "Éthique",
};
const CAUSE_LABELS_EN: Record<string, string> = {
  climat: "Climate",
  biodiversite: "Biodiversity",
  humain: "Human rights",
  egalite: "Gender equality",
  tech: "Ethical tech",
  circulaire: "Circular economy",
  eau: "Water",
  social: "Human",
  governance: "Ethics",
};
const EXCLUSION_LABELS_FR: Record<string, string> = {
  fossiles: "Énergies fossiles",
  armes: "Armement",
  tabac: "Tabac",
  jeux: "Jeux d'argent",
  animaux: "Tests animaux",
  "fast-fashion": "Fast fashion",
};
const EXCLUSION_LABELS_EN: Record<string, string> = {
  fossiles: "Fossil fuels",
  armes: "Weapons",
  tabac: "Tobacco",
  jeux: "Gambling",
  animaux: "Animal testing",
  "fast-fashion": "Fast fashion",
};

interface ProfileMeta {
  causes: string[];
  exclusions: string[];
  risk_target: number;
  horizon_years: number;
}

function ProfilPage() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const CAUSE_LABELS = lang === "en" ? CAUSE_LABELS_EN : CAUSE_LABELS_FR;
  const EXCLUSION_LABELS = lang === "en" ? EXCLUSION_LABELS_EN : EXCLUSION_LABELS_FR;
  const { user } = useAuth();
  const { portfolio } = useActivePortfolio();
  const { portfolios } = useUserPortfolios();
  const valuation = usePortfolioValuation();
  const [meta, setMeta] = useState<ProfileMeta | null>(null);

  useEffect(() => {
    if (!user || !portfolio?.id) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("portfolios")
        .select("causes, exclusions, risk_target, horizon_years")
        .eq("id", portfolio.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setMeta({
        causes: (data.causes ?? []) as string[],
        exclusions: (data.exclusions ?? []) as string[],
        risk_target: Number(data.risk_target ?? 0),
        horizon_years: Number(data.horizon_years ?? 0),
      });
    })();
    return () => { cancelled = true; };
  }, [user, portfolio?.id]);

  const userName = useMemo(() => {
    const m = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
    return m?.display_name || m?.full_name || user?.email?.split("@")[0] || t("profile.default_name");
  }, [user, t]);

  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const currentValue = valuation.currentValue || totalInvested;
  const returnPct = valuation.returnPct;
  const esg = portfolio?.metrics?.esg_score ?? 0;
  const positions = portfolio?.holdings.length ?? 0;
  const riskPct = meta ? (meta.risk_target * 100).toFixed(1) : "—";
  const numLocale = lang === "en" ? "en-US" : "fr-FR";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-paper"
    >
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow={t("profile.eyebrow")}
          title={userName}
          subtitle={t("profile.subtitle")}
        />

        <div className="pt-2">
          <JourneySteps active="values" />
        </div>

        {/* Vue d'ensemble — KPI signature */}
        <section className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-4 border-t border-paper-3 pt-5">
            <KPIFigure
              size="sm"
              label={t("profile.kpi_invested")}
              value={totalInvested.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              unit="€"
            />
            <KPIFigure
              size="sm"
              label={t("profile.kpi_performance")}
              value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}`}
              unit="%"
              accent={returnPct >= 0}
            />
            <KPIFigure
              size="sm"
              label={t("profile.kpi_impact")}
              value={esg.toFixed(0)}
              unit="/100"
            />
            <KPIFigure
              size="sm"
              label={t("profile.kpi_positions")}
              value={positions}
              unit={positions > 1 ? t("profile.asset_other") : t("profile.asset_one")}
            />
          </div>
        </section>

        {/* Tes valeurs */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("profile.values_eyebrow")}
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            {t("profile.values_title")}
          </h2>

          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              {t("profile.causes_supported")}
            </p>
            {meta && meta.causes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.causes.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1.5 text-[12px] font-medium border border-moss-3 text-moss-1 rounded-full"
                  >
                    {CAUSE_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">{t("profile.no_causes")}</p>
            )}
          </div>

          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
              {t("profile.exclusions")}
            </p>
            {meta && meta.exclusions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.exclusions.map((e) => (
                  <span
                    key={e}
                    className="px-3 py-1.5 text-[12px] font-medium border border-paper-3 text-ink-2 rounded-full line-through decoration-rust/60"
                  >
                    {EXCLUSION_LABELS[e] ?? e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">{t("profile.no_exclusions")}</p>
            )}
          </div>

          <Link
            to="/onboarding"
            search={{ new: 1 }}
            className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
          >
            {t("profile.adjust_values")}
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Ton portefeuille */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("profile.portfolio_eyebrow")}
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            {t("profile.portfolio_title")}
          </h2>

          <dl className="mt-5 divide-y divide-paper-3 border-t border-b border-paper-3">
            <Row label={t("profile.active_portfolio")} value={portfolio?.name ?? "—"} />
            <Row label={t("profile.portfolio_count")} value={`${portfolios.length} / 3`} />
            <Row
              label={<><Glossary term="Volatilite">Volatilité</Glossary> {t("profile.target_volatility_suffix")}</>}
              value={`${riskPct} %`}
            />
            <Row
              label={<Glossary term="Horizon">{t("profile.horizon")}</Glossary>}
              value={meta ? t("profile.years", { n: meta.horizon_years }) : "—"}
            />
          </dl>

          <Link
            to="/portfolio"
            className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink hover:text-moss-1 transition-colors"
          >
            {t("profile.see_allocation")}
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* Ta progression */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("profile.progress_eyebrow")}
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            {t("profile.progress_title")}
          </h2>

          <ul className="mt-5 space-y-3">
            <ProgressItem
              done
              label={t("profile.progress_values_done")}
              detail={t("profile.progress_values_detail", { causes: meta?.causes.length ?? 0, exclusions: meta?.exclusions.length ?? 0 })}
            />
            <ProgressItem
              done={positions > 0}
              label={t("profile.progress_portfolio_done")}
              detail={positions > 0 ? t("profile.progress_portfolio_detail_active", { n: positions }) : t("profile.progress_portfolio_detail_empty")}
            />
            <ProgressItem
              done={currentValue > totalInvested}
              label={t("profile.progress_perf_done")}
              detail={t("profile.progress_perf_detail", { value: `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}` })}
            />
          </ul>
        </section>

        {/* Historique des décisions */}
        <section className="px-5 pt-10">
          <div className="gold-rule mb-5" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("profile.decisions_eyebrow")}
          </p>
          <h2 className="font-value text-2xl text-ink leading-tight">
            {t("profile.decisions_title")}
          </h2>
          <p className="text-sm text-ink-3 mt-2">
            {t("profile.decisions_desc")}
          </p>
          <DecisionTimeline />
        </section>

        {/* Comparatif teaser */}
        <section className="px-5 pt-10">
          <Link
            to="/comparatif"
            className="block border-t border-paper-3 pt-5 group"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold mb-2">
              {t("profile.comparison_eyebrow")}
            </p>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-value text-xl text-ink leading-tight group-hover:text-moss-1 transition-colors">
                {t("profile.comparison_title_pre")} <Glossary term="MSCIWorld">MSCI World</Glossary>
              </h3>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>
            <p className="text-sm text-ink-3 mt-2">
              {t("profile.comparison_desc")}
            </p>
          </Link>
        </section>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-3 gap-4">
      <dt className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{label}</dt>
      <dd className="text-sm text-ink font-medium tabular-nums truncate">{value}</dd>
    </div>
  );
}

function ProgressItem({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          done ? "bg-moss-1 text-paper" : "border border-paper-3 text-ink-3"
        }`}
      >
        {done ? (
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,8 7,12 13,4" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-ink" : "text-ink-2"}`}>{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}
