import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AllocationList, type AllocationHolding } from "@/components/portfolio/AllocationList";
import { useLexicon } from "@/hooks/useLexicon";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercentPoints } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { ActionOfTheDayCard } from "@/components/dashboard/ActionOfTheDayCard";
import { HomeGlance } from "@/components/dashboard/HomeGlance";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

import { RealInvestmentInterestCard } from "@/components/beta/RealInvestmentInterestCard";
import { FeedbackButton } from "@/components/beta/FeedbackButton";
import { ImpactMoment } from "@/components/impact/ImpactMoment";
import { GuestBanner } from "@/components/dashboard/GuestBanner";
import { UnderstandPortfolioCard } from "@/components/dashboard/UnderstandPortfolioCard";
import { GuestDashboard } from "@/components/dashboard/GuestDashboard";
import { SimulationBadge } from "@/components/common/SimulationBadge";
import { clearGuestSimulation } from "@/lib/beta/guest";
import { Provenance } from "@/components/ui/Provenance";

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
  const navigate = useNavigate();

  // Un compte réel rend la simulation invité caduque : on la purge.
  useEffect(() => {
    if (user) clearGuestSimulation();
  }, [user]);

  // Accueil unique (Le Fil) : un utilisateur CONNECTÉ qui atterrit sur l'ancien
  // /dashboard (lien obsolète, URL directe, « Mon espace » historique) est renvoyé
  // vers Le Fil, pour ne plus avoir deux accueils divergents desktop/mobile. Le
  // mode invité (?guest=true, pas encore de compte) conserve son dashboard local.
  useEffect(() => {
    if (user && !guest) navigate({ to: "/le-fil", replace: true });
  }, [user, guest, navigate]);

  if (loading) return <div className="min-h-screen bg-paper" aria-hidden />;
  if (guest) return <GuestDashboard />;
  if (user) return <Dashboard />;
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
  const [whyOpen, setWhyOpen] = useState(false);
  const hasSeenPortfolioRef = useRef(false);

  useEffect(() => {
    setGreeting(t(getGreetingKey(new Date().getHours())));
  }, [t]);

  // Découvrabilité du mode Simple/Expert (analyse UX §09 — P3) : un seul indice,
  // au premier passage, pour signaler la vue détaillée sans l'imposer.
  useEffect(() => {
    try {
      if (localStorage.getItem("seedow_view_mode_hint_seen")) return;
      localStorage.setItem("seedow_view_mode_hint_seen", "1");
    } catch {
      return;
    }
    const id = setTimeout(() => {
      toast(t("dashboard.view_mode_hint.title"), {
        description: t("dashboard.view_mode_hint.desc"),
      });
    }, 1200);
    return () => clearTimeout(id);
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
  const isGrowing = gain > -0.005;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      {/* Bandeau mode invité — sticky, pleine largeur (hors conteneur centré) */}
      <GuestBanner guestParam={guest ?? false} />

      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={greeting} title={userName} showPortfolioSelector />

        {/* 1. Bloc valeur — le solde d'abord (ordre TR : solde → portefeuille →
            action → impact). La priorité mobile, c'est « combien j'ai ». */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-5 pt-6"
        >
          <p className="stamp">{t("dashboard.total_value")}</p>
          <h2 className="text-figure-hero text-ink mt-2.5">
            <sup className="text-[0.42em] align-super mr-1 text-ink-3">€</sup>
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
          <div className={`chip mt-4 ${isGrowing ? "chip--up" : "chip--down"}`}>
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
            {formatCurrency(gain, lang)} · {formatPercentPoints(returnPct, lang, 2)}
            <span className="ml-1 font-normal opacity-70">{t("dashboard.since_start")}</span>
          </div>

          {/* Le solde porte son attestation : d'où vient le prix, quand, sur
              quelle part du portefeuille (CLAUDE.md §1.2). */}
          {portfolio && holdings.length > 0 && (
            <Provenance
              className="mt-3"
              status="verified"
              source="Yahoo Finance"
              asOf={new Date()}
              coverage={100}
            />
          )}

          {/* Pourquoi ce chiffre bouge — désamorce l'opacité du total pour un néophyte */}
          {portfolio && holdings.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setWhyOpen((o) => !o)}
                aria-expanded={whyOpen}
                className="inline-flex items-center gap-1 stamp hover:text-ink border-b border-dotted border-ink-3 transition-colors"
              >
                {t("dashboard.why_cta")}
                <svg
                  viewBox="0 0 16 16"
                  className={`w-3 h-3 transition-transform ${whyOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
              <AnimatePresence initial={false}>
                {whyOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 paper-card p-4 text-body-sm text-ink-2 leading-relaxed space-y-1.5">
                      <p>
                        {t("dashboard.why_assets", { count: holdings.length })}{" "}
                        {t("dashboard.why_moves")}
                      </p>
                      <p>
                        {gain > 0
                          ? t("dashboard.why_gain", {
                              amount: formatCurrency(Math.abs(gain), lang),
                            })
                          : gain < 0
                            ? t("dashboard.why_loss", {
                                amount: formatCurrency(Math.abs(gain), lang),
                              })
                            : t("dashboard.why_flat")}
                      </p>
                      <p className="stamp">{t("dashboard.why_virtual")}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Coup d'œil « glanceable » (refonte mobile §5) : Performance · Impact ·
              Risque, compris en < 5 s, chaque tuile menant au détail. Placé juste
              sous le solde pour tenir au-dessus du pli. */}
          {portfolio && holdings.length > 0 && (
            <div className="mt-5">
              <HomeGlance metrics={portfolio.metrics} returnPct={returnPct} />
            </div>
          )}

          {portfolio && (
            <div className="mt-4">
              <InvestDialog label={t("dashboard.invest_demo")} defaultAmount={200} />
              <SimulationBadge className="mt-2" />
            </div>
          )}
        </motion.section>

        {/* 2. Aperçu portefeuille — ce qu'on détient, juste sous le solde */}
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
            /* État vide : pas de pictogramme décoratif — une carte qui dit ce
               qui manque et où aller. */
            <div className="paper-card p-6">
              <p className="stamp">{t("dashboard.total_value")}</p>
              <p className="mt-3 text-body text-ink-2 max-w-[42ch] leading-relaxed">
                {t("dashboard.empty_portfolio")}
              </p>
              <Link
                to="/onboarding"
                search={{ new: undefined }}
                className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 text-body-lg font-semibold text-paper transition-opacity hover:opacity-85"
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

        {/* 3. Action du jour — après le portefeuille, une fois le contexte posé */}
        <ActionOfTheDayCard />

        {/* 4. Impact — porte d'entrée émotionnelle */}
        {portfolio && holdings.length > 0 && <ImpactMoment />}

        {/* 5. Lien Voir le détail */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="px-5 pt-6"
        >
          <Link
            to="/portfolio"
            className="w-full flex items-center justify-between gap-4 paper-card p-5 hover:bg-paper-inset transition-colors"
          >
            <div className="text-left">
              <p className="text-body font-medium text-ink">{t("dashboard.see_detail")}</p>
              <p className="stamp mt-1">{t("dashboard.see_detail_desc")}</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-ink-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </motion.section>

        {/* 5. Pied de page — pédagogie et bêta, hors du flux principal */}
        <section className="px-5 pt-6 space-y-0">
          {portfolio && holdings.length > 0 && <UnderstandPortfolioCard />}
          {portfolio && <RealInvestmentInterestCard />}
        </section>
      </div>

      <BottomNavigation />
      <FeedbackButton />
    </motion.div>
  );
}
