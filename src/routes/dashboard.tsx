import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AllocationList, type AllocationHolding } from "@/components/portfolio/AllocationList";
import { useLexicon } from "@/hooks/useLexicon";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { NextStepCard } from "@/components/dashboard/NextStepCard";
import { WatchlistCard } from "@/components/dashboard/WatchlistCard";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

import { RealInvestmentInterestCard } from "@/components/beta/RealInvestmentInterestCard";
import { FeedbackButton } from "@/components/beta/FeedbackButton";
import { ImpactMoment } from "@/components/impact/ImpactMoment";
import { LearnIntroCard } from "@/components/dashboard/LearnIntroCard";
import { GuestBanner } from "@/components/dashboard/GuestBanner";
import { CompleteProfileBanner } from "@/components/dashboard/CompleteProfileBanner";
import { UnderstandPortfolioCard } from "@/components/dashboard/UnderstandPortfolioCard";
import { GuestDashboard } from "@/components/dashboard/GuestDashboard";
import { clearGuestSimulation } from "@/lib/beta/guest";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>): { guest?: true } => ({
    guest: s.guest === true || s.guest === "true" ? true : undefined,
  }),
  // Le mode invité (?guest=true) contourne le mur d'inscription : la garde ne
  // redirige vers /auth que les visiteurs non connectés ET non invités.
  beforeLoad: ({ search }) => {
    if (!search.guest) return requireAuthedUser("/dashboard");
  },
  component: DashboardEntry,
});

/**
 * Aiguillage : dashboard authentifié (données réelles) vs dashboard invité
 * (simulation locale). On attend la résolution de l'auth pour ne pas afficher
 * la vue invité à un utilisateur connecté (ni l'inverse).
 */
function DashboardEntry() {
  const { user, loading } = useAuth();
  const { guest } = Route.useSearch();

  // Un compte réel rend la simulation invité caduque : on la purge.
  useEffect(() => {
    if (user) clearGuestSimulation();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-paper" aria-hidden />;
  if (user) return <Dashboard />;
  if (guest) return <GuestDashboard />;
  // Non connecté et non invité : la garde beforeLoad a déjà redirigé vers /auth.
  return <div className="min-h-screen bg-paper" aria-hidden />;
}

function getGreetingKey(hour: number) {
  if (hour < 12) return "dashboard.greeting_morning";
  if (hour < 18) return "dashboard.greeting_afternoon";
  return "dashboard.greeting_evening";
}

function Dashboard() {
  const { L } = useLexicon();
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guest } = Route.useSearch();
  const { portfolio, loading, error: portfolioError } = useActivePortfolio();
  const { portfolios, loading: pfListLoading, error: pfListError } = useUserPortfolios();
  const valuation = usePortfolioValuation();
  const [greeting, setGreeting] = useState(t("dashboard.greeting_fallback"));
  const hasSeenPortfolioRef = useRef(false);

  useEffect(() => {
    setGreeting(t(getGreetingKey(new Date().getHours())));
  }, [t]);

  useEffect(() => {
    if (portfolio || portfolios.length > 0) {
      hasSeenPortfolioRef.current = true;
    }
  }, [portfolio, portfolios.length]);

  useEffect(() => {
    if (pfListLoading || loading) return;
    // Ne jamais rediriger vers l'onboarding sur la foi d'une erreur réseau/requête :
    // un "0 portefeuille" qui vient d'un échec de fetch n'est pas un "0 portefeuille" réel.
    if (pfListError || portfolioError) return;
    if (hasSeenPortfolioRef.current) return;
    if (portfolios.length === 0 && !portfolio) {
      navigate({ to: "/onboarding", search: { new: undefined } });
    }
  }, [pfListLoading, loading, pfListError, portfolioError, portfolios.length, portfolio, navigate]);

  const userName = useMemo(() => {
    const meta = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
    return (
      meta?.display_name || meta?.full_name || user?.email?.split("@")[0] || t("dashboard.welcome")
    );
  }, [user, t]);

  const holdings: AllocationHolding[] = useMemo(
    () =>
      (portfolio?.holdings ?? []).map((h) => ({
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        allocationPct: h.allocationPct,
        performancePct: 0,
        esgScore: h.esgScore,
        category: h.category,
      })),
    [portfolio],
  );

  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const totalValue = valuation.currentValue || totalInvested;
  const gain = valuation.pnl;
  const returnPct = valuation.returnPct;
  const isGrowing = gain >= 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      {/* Bandeau mode invité — sticky, pleine largeur (hors conteneur centré) */}
      <GuestBanner guestParam={guest ?? false} />

      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={greeting} title={userName} showPortfolioSelector />

        {/* Profiling progressif — n'apparaît que si le profil est incomplet */}
        <CompleteProfileBanner />

        {/* 0. Accueil néophyte — onboarding pédagogique, dismissible */}
        <LearnIntroCard />

        {/* 1. Bloc valeur */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-5 pt-6"
        >
          <p className="text-caption uppercase tracking-wider text-ink-3 font-medium">
            {t("dashboard.total_value")}
          </p>
          <h2 className="font-value text-figure-hero text-ink mt-1">
            <sup className="text-xl sm:text-2xl align-super mr-1">€</sup>
            <AnimatedFigure
              value={totalValue}
              from={0}
              format={(v) =>
                v.toLocaleString(lang === "en" ? "en-US" : "fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }
            />
          </h2>
          <div
            className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-500 ${
              isGrowing ? "bg-highlight-5 text-highlight-1" : "bg-alert-tint text-rust"
            }`}
          >
            <svg
              viewBox="0 0 16 16"
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {isGrowing ? (
                <polyline points="2,12 6,7 10,9 14,3" />
              ) : (
                <polyline points="2,4 6,9 10,7 14,13" />
              )}
            </svg>
            {isGrowing ? "+" : ""}
            {formatCurrency(gain, lang)} · {formatPercent(returnPct / 100, lang, 2)}
            <span className="text-ink-3 font-normal ml-1">{t("dashboard.since_start")}</span>
          </div>

          {portfolio && (
            <div className="mt-5">
              <InvestDialog label={t("dashboard.invest_demo")} defaultAmount={200} />
              <p className="text-tag text-ink-3 mt-2 uppercase tracking-wider">
                {t("dashboard.demo_mode_capital")}
              </p>
            </div>
          )}
        </motion.section>

        {/* 1b. Impact — porte d'entrée émotionnelle, juste après la valeur */}
        {portfolio && holdings.length > 0 && <ImpactMoment />}

        {/* 2. Aperçu portefeuille */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="px-5 pt-8"
        >
          {loading ? (
            <div className="space-y-2" aria-label={t("dashboard.loading_portfolio")}>
              <Skeleton className="h-2 w-full rounded-full" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3.5 w-14 flex-shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3.5 w-10 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : holdings.length === 0 ? (
            <div className="border border-dashed border-paper-3 rounded-[14px] p-8 text-center flex flex-col items-center">
              {/* Illustration légère — pousse/graine, décorative */}
              <svg
                viewBox="0 0 48 48"
                className="w-10 h-10 text-ink-3 mb-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M24 42V22" />
                <path d="M24 26c0-6 4-11 11-12 0 6-4 11-11 12Z" />
                <path d="M24 30c0-5-3-9-9-10 0 5 3 9 9 10Z" />
                <path d="M14 42h20" />
              </svg>
              <p className="text-body-sm text-ink-2 mb-4 max-w-[240px]">
                {t("dashboard.empty_portfolio")}
              </p>
              <Link
                to="/onboarding"
                search={{ new: undefined }}
                className="inline-block px-4 py-2 text-label font-medium border border-ink rounded-full hover:bg-ink hover:text-paper transition-colors"
              >
                {t("dashboard.first_investment")}
              </Link>
            </div>
          ) : (
            <AllocationList
              holdings={holdings}
              maxSlots={Math.max(5, holdings.length + 1)}
              onEmptySlotClick={() => navigate({ to: "/discover" })}
            />
          )}
        </motion.section>

        {/* 2b. Comprends ton portefeuille — cours contextuels */}
        {portfolio && holdings.length > 0 && (
          <section className="px-5 pt-8">
            <UnderstandPortfolioCard />
          </section>
        )}

        {/* 3. Prochaine étape — une seule carte contextuelle */}
        <NextStepCard />

        {/* 3a. Watchlist — boucle suivre → alerte → revenir */}
        <WatchlistCard />

        {/* 3b. Capture intention investissement réel */}
        {portfolio && <RealInvestmentInterestCard />}

        {/* 4. Lien Voir le détail */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="px-5 pt-6"
        >
          <Link
            to="/portfolio"
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-paper-2 hover:bg-paper-3 transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">{t("dashboard.see_detail")}</p>
              <p className="text-xs text-ink-3 mt-0.5">{t("dashboard.see_detail_desc")}</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-ink-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </motion.section>
      </div>

      <BottomNavigation />
      <FeedbackButton />
    </motion.div>
  );
}
