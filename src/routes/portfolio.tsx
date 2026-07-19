import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GrowthComparison } from "@/components/roots/GrowthComparison";
import { BadgesCard } from "@/components/portfolio/MilestoneBadges";
import { AllocationBreakdown } from "@/components/portfolio/AllocationBreakdown";
import { PortfolioMetricsCard } from "@/components/portfolio/PortfolioMetricsCard";
import { PortfolioHistoryChart } from "@/components/portfolio/PortfolioHistoryChart";
import { MarketFreshnessBanner } from "@/components/portfolio/MarketFreshnessBanner";
import { ValuationConsistencyBanner } from "@/components/portfolio/ValuationConsistencyBanner";
import { ImpactCertificate } from "@/components/portfolio/ImpactCertificate";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { ShareToggle } from "@/components/community/ShareToggle";
import { ImpactRibbon } from "@/components/portfolio/ImpactRibbon";
import { ComparatifPanel } from "@/components/portfolio/ComparatifPanel";
import { AllocationRefiner } from "@/components/portfolio/AllocationRefiner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExplainerCard } from "@/components/ui/ExplainerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPortfolioState } from "@/components/portfolio/EmptyPortfolioState";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useViewMode } from "@/hooks/useViewMode";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { formatCurrency } from "@/lib/format";
import { BADGE_DEFS, computeUnlockedBadgeIds } from "@/lib/portfolio/badges";
import type { MilestoneBadge } from "@/components/portfolio/MilestoneBadges";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/portfolio")({
  beforeLoad: () => requireAuthedUser("/portfolio"),
  component: Portfolio,
});

function Portfolio() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { user } = useAuth();
  const { portfolio, loading } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const { isSimple } = useViewMode();

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
        ?.display_name ?? user?.email?.split("@")[0] ?? "";
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

  const co2 = portfolio.metrics?.co2_avoided_tons
    ? Number(((portfolio.metrics.co2_avoided_tons * Math.max(totalInvested, 1)) / 10000).toFixed(2))
    : 0;
  const trees = Math.round(co2 * 45);
  const energy = Math.round(totalInvested / 5);
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
          <Tabs defaultValue="performance">
            <TabsList className="w-full grid grid-cols-5 h-auto bg-paper-2 p-1">
              <TabsTrigger value="performance" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_perf")}
              </TabsTrigger>
              <TabsTrigger value="allocation" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_allocation")}
              </TabsTrigger>
              <TabsTrigger value="affiner" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_refine")}
              </TabsTrigger>
              <TabsTrigger value="impact" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_impact")}
              </TabsTrigger>
              <TabsTrigger value="comparatif" className="text-caption uppercase tracking-[0.12em]">
                {t("portfolio.tab_vs_market")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="pt-5 space-y-5">
              <PortfolioHistoryChart />
              <GrowthComparison
                currentValue={totalValue}
                invested={totalInvested}
                gain={gain}
                returnPct={returnPct}
                lastUpdated={valuation.latestQuoteAt}
                onRefresh={() => valuation.refresh()}
                refreshing={valuation.loading}
              />
              <div className="flex flex-wrap gap-2">
                <InvestDialog label={t("portfolio.invest")} defaultAmount={200} />
                <InvestDialog
                  label={t("portfolio.monthly_deposit")}
                  defaultAmount={50}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-paper-3 bg-paper text-ink text-label font-semibold uppercase tracking-[0.14em] hover:bg-paper-2 transition-colors"
                    >
                      {t("portfolio.monthly_deposit")}
                    </button>
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="allocation" className="pt-5 space-y-5">
              <AllocationBreakdown
                holdings={portfolio.holdings}
                totalAmount={totalInvested}
                valuedHoldings={valuation.holdings}
              />
              <BadgesCard badges={badges} />
            </TabsContent>

            <TabsContent value="affiner" className="pt-5">
              <AllocationRefiner portfolioId={portfolio.id} />
            </TabsContent>

            <TabsContent value="impact" className="pt-5 space-y-5">
              <ImpactRibbon
                co2Avoided={co2}
                treesEquivalent={trees}
                energyFinanced={energy}
                esgScore={esgScore}
              />
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-ink">{t("portfolio.key_indicators")}</h2>
                {isSimple && (
                  <ExplainerCard tone="highlight" dismissKey="portfolio-metrics-simple">
                    {t("portfolio.simple_explainer_pre")}{" "}
                    <span className="font-semibold">{t("portfolio.simple_explainer_expert")}</span>{" "}
                    {t("portfolio.simple_explainer_post")}
                  </ExplainerCard>
                )}
                <PortfolioMetricsCard metrics={portfolio.metrics} />
              </div>
              <ImpactCertificate />
            </TabsContent>

            <TabsContent value="comparatif" className="pt-5">
              <ComparatifPanel />
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
