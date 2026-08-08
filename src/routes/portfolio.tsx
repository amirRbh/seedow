import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GrowthComparison } from "@/components/roots/GrowthComparison";
import { BadgesCard } from "@/components/portfolio/MilestoneBadges";
import { AllocationBreakdown } from "@/components/portfolio/AllocationBreakdown";
import { MarketFreshnessBanner } from "@/components/portfolio/MarketFreshnessBanner";
import { ValuationConsistencyBanner } from "@/components/portfolio/ValuationConsistencyBanner";
import { ImpactExperience } from "@/components/impact/ImpactExperience";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { ShareToggle } from "@/components/community/ShareToggle";
import { ComparatifPanel } from "@/components/portfolio/ComparatifPanel";
import { AllocationRefiner } from "@/components/portfolio/AllocationRefiner";
import { PortfolioAtAGlance } from "@/components/portfolio/PortfolioAtAGlance";
import { PortfolioCustomizer } from "@/components/portfolio/PortfolioCustomizer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPortfolioState } from "@/components/portfolio/EmptyPortfolioState";
import { useViewMode } from "@/hooks/useViewMode";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import { BADGE_DEFS, computeUnlockedBadgeIds } from "@/lib/portfolio/badges";
import type { MilestoneBadge } from "@/components/portfolio/MilestoneBadges";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

const PORTFOLIO_TABS = ["performance", "impact", "affiner"] as const;
type PortfolioTab = (typeof PORTFOLIO_TABS)[number];

// Anciens onglets fusionnés : allocation vit désormais sous Performance,
// comparatif sous Impact. On remappe pour ne casser aucun lien `?tab=`.
const LEGACY_TAB_MAP: Record<string, PortfolioTab> = {
  allocation: "performance",
  comparatif: "impact",
};

export const Route = createFileRoute("/portfolio")({
  // `?tab=impact` permet d'ouvrir directement un onglet (ex. depuis le dashboard).
  validateSearch: (s: Record<string, unknown>): { tab?: PortfolioTab } => {
    const raw = typeof s.tab === "string" ? s.tab : undefined;
    const resolved = raw
      ? PORTFOLIO_TABS.includes(raw as PortfolioTab)
        ? (raw as PortfolioTab)
        : LEGACY_TAB_MAP[raw]
      : undefined;
    return { tab: resolved };
  },
  beforeLoad: () => requireAuthedUser("/portfolio"),
  component: Portfolio,
});

function Portfolio() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user } = useAuth();
  const { tab } = Route.useSearch();
  const { isSimple, isExpert } = useViewMode();
  const navigate = useNavigate();
  const { portfolio, loading, refresh: refreshPortfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const detailsRef = useRef<HTMLElement | null>(null);

  // Intention « Personnaliser » posée par l'écran des 3 choix (post-simulation) :
  // on ouvre directement l'onglet d'ajustement, puis on consomme le drapeau.
  useEffect(() => {
    let intent: string | null = null;
    try {
      intent = localStorage.getItem("seedow_post_save_intent");
    } catch {
      intent = null;
    }
    if (intent === "customize") {
      try {
        localStorage.removeItem("seedow_post_save_intent");
      } catch {
        /* ignore */
      }
      navigate({ to: "/portfolio", search: { tab: "affiner" }, replace: true });
    }
    // Au montage uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-paper max-w-lg mx-auto px-5 pt-6 pb-28"
        aria-label={t("portfolio.loading")}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-48 mt-8" />
        <Skeleton className="h-16 w-64 mt-2" />
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) {
    const userName =
      (user?.user_metadata as { display_name?: string; full_name?: string } | undefined)
        ?.display_name ??
      user?.email?.split("@")[0] ??
      "";
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-paper"
      >
        <EmptyPortfolioState userName={userName} />
        <BottomNavigation />
      </motion.div>
    );
  }

  const totalInvested = valuation.totalInvested || portfolio.initial_amount;
  const totalValue = valuation.currentValue || totalInvested;
  const gain = valuation.pnl;
  const returnPct = valuation.returnPct;

  const esgScore = portfolio.metrics?.esg_score
    ? Number((portfolio.metrics.esg_score / 10).toFixed(1))
    : 0;

  const unlockedBadgeIds = computeUnlockedBadgeIds(portfolio, esgScore);
  const badges: MilestoneBadge[] = BADGE_DEFS.map((b) => ({
    id: b.id,
    icon: b.icon,
    tier: b.tier,
    unlocked: unlockedBadgeIds.has(b.id),
    name: t(`milestone_badges.defs.${b.id}.name`),
    description: t(`milestone_badges.defs.${b.id}.description`),
  }));

  const linesLabel = t(
    portfolio.holdings.length > 1 ? "portfolio.lines_other" : "portfolio.lines_one",
    { count: portfolio.holdings.length },
  );
  const subtitle = `${linesLabel} · ${formatCurrency(totalValue, lang)}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow={t("portfolio.details")}
          title={t("portfolio.my_portfolio")}
          subtitle={subtitle}
          showPortfolioSelector
        />

        <MarketFreshnessBanner
          latestQuoteAt={valuation.latestQuoteAt}
          hasQuotes={valuation.hasQuotes}
          onRefreshed={() => valuation.refresh()}
        />
        <ValuationConsistencyBanner consistency={valuation.consistency} />

        <section className="px-5 pt-4">
          <PortfolioAtAGlance
            metrics={portfolio.metrics}
            holdings={portfolio.holdings}
            rationale={{
              causes: portfolio.causes,
              exclusions: portfolio.exclusions,
              horizon_years: portfolio.horizon_years,
              risk_target: portfolio.risk_target,
            }}
            onSeeDetails={() =>
              detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          />
        </section>

        <section ref={detailsRef} className="px-5 pt-6 scroll-mt-4">
          <Tabs
            value={tab ?? "performance"}
            onValueChange={(v) =>
              navigate({
                to: "/portfolio",
                search: {
                  tab: v === "performance" ? undefined : (v as PortfolioTab),
                },
                replace: true,
              })
            }
          >
            <TabsList className="w-full grid grid-cols-3 h-auto bg-paper-2 p-1">
              <TabsTrigger value="performance" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_perf")}
              </TabsTrigger>
              <TabsTrigger value="impact" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_impact")}
              </TabsTrigger>
              <TabsTrigger value="affiner" className="text-caption uppercase tracking-[0.12em]">
                {isSimple ? t("portfolio.tab_refine_simple") : t("portfolio.tab_refine")}
              </TabsTrigger>
            </TabsList>

            {/* Performance — la réponse « où j'en suis » d'abord (valeur + gain),
                puis le détail (tendance, allocation), le secondaire replié. */}
            <TabsContent value="performance" className="pt-5 space-y-5">
              <GrowthComparison
                currentValue={totalValue}
                invested={totalInvested}
                gain={gain}
                returnPct={returnPct}
                lastUpdated={valuation.latestQuoteAt}
                onRefresh={() => valuation.refresh()}
                refreshing={valuation.loading}
              />
              {/* Action principale unique ; le versement mensuel reste accessible
                  en lien discret (moins de charge visuelle). */}
              <div className="space-y-2">
                <InvestDialog label={t("portfolio.invest")} defaultAmount={200} />
                <InvestDialog
                  label={t("portfolio.monthly_deposit")}
                  defaultAmount={50}
                  trigger={
                    <button
                      type="button"
                      className="block text-caption text-ink-3 hover:text-ink border-b border-dotted border-ink-3/60 transition-colors"
                    >
                      {t("portfolio.monthly_deposit")}
                    </button>
                  }
                />
              </div>
              <AllocationBreakdown
                holdings={portfolio.holdings}
                totalAmount={totalInvested}
                valuedHoldings={valuation.holdings}
              />
              <DetailDisclosure summary={t("portfolio.badges_disclosure")}>
                <BadgesCard badges={badges} />
              </DetailDisclosure>
            </TabsContent>

            {/* Impact — le récit d'impact ; le comparatif détaillé (redondant avec
                « Vs le monde » du récit) est replié pour ne pas alourdir. */}
            <TabsContent value="impact" className="pt-5 space-y-8">
              <ImpactExperience />
              <DetailDisclosure summary={t("portfolio.comparatif_disclosure")}>
                <ComparatifPanel />
              </DetailDisclosure>
            </TabsContent>

            {/* Ajuster — le même éditeur clair pour tous ; les arbitrages avancés
                (jargon) restent accessibles, repliés, en mode expert. */}
            <TabsContent value="affiner" className="pt-5 space-y-5">
              <PortfolioCustomizer
                portfolioId={portfolio.id}
                holdings={portfolio.holdings}
                onSaved={() => {
                  refreshPortfolio();
                  valuation.refresh();
                }}
              />
              {isExpert && (
                <DetailDisclosure summary={t("portfolio.refiner_disclosure")}>
                  <AllocationRefiner portfolioId={portfolio.id} />
                </DetailDisclosure>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Partage anonyme — ligne discrète en pied */}
        <section className="px-5 pt-8">
          <ShareToggle />
        </section>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}

/**
 * Repli « détail » réutilisable — progressive disclosure (mission §8) : le module
 * secondaire reste accessible mais ne s'impose pas par défaut. Style aligné sur
 * les autres replis du produit (bordure douce, chevron qui pivote).
 */
function DetailDisclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-paper-3 bg-paper-2/40 open:bg-paper-2/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-body-sm font-semibold text-ink">{summary}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-none text-ink-3 transition-transform duration-300 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t border-paper-3 p-4">{children}</div>
    </details>
  );
}
