import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GrowthComparison } from "@/components/roots/GrowthComparison";
import { BadgesCard } from "@/components/garden/SeasonalBadges";
import { AllocationBreakdown } from "@/components/portfolio/AllocationBreakdown";
import { PortfolioMetricsCard } from "@/components/portfolio/PortfolioMetricsCard";
import { PortfolioHistoryChart } from "@/components/portfolio/PortfolioHistoryChart";
import { MarketFreshnessBanner } from "@/components/portfolio/MarketFreshnessBanner";
import { ValuationConsistencyBanner } from "@/components/portfolio/ValuationConsistencyBanner";
import { ImpactCertificate } from "@/components/portfolio/ImpactCertificate";
import { InvestDialog } from "@/components/portfolio/InvestDialog";
import { ShareToggle } from "@/components/community/ShareToggle";
import { ImpactRibbon } from "@/components/garden/ImpactRibbon";
import { ComparatifPanel } from "@/components/portfolio/ComparatifPanel";
import { AllocationRefiner } from "@/components/portfolio/AllocationRefiner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExplainerCard } from "@/components/ui/ExplainerCard";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useViewMode } from "@/hooks/useViewMode";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_BADGES } from "@/lib/mockGarden";

export const Route = createFileRoute("/portfolio")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/portfolio", mode: "login" } });
    }
  },
  component: Portfolio,
});

function Portfolio() {
  const { portfolio, loading } = useActivePortfolio();
  const valuation = usePortfolioValuation();
  const { isSimple } = useViewMode();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-[12px] text-ink-3">Chargement du portefeuille…</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
        <div className="max-w-lg mx-auto pb-28">
          <AppHeader eyebrow="Détails" title="Mon portefeuille" />
          <div className="px-5 pt-8">
            <div className="border border-dashed border-paper-3 rounded p-6 text-center">
              <p className="text-[13px] text-ink-2 mb-3">Aucun portefeuille actif pour le moment.</p>
              <Link to="/onboarding" search={{ new: undefined }} className="inline-block px-4 py-2 text-[12px] font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors">
                Démarrer l'onboarding
              </Link>
            </div>
          </div>
        </div>
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
  const esgScore = portfolio.metrics?.esg_score ? Number((portfolio.metrics.esg_score / 10).toFixed(1)) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow="Détails"
          title="Mon portefeuille"
          subtitle={`${portfolio.holdings.length} ligne${portfolio.holdings.length > 1 ? "s" : ""} · ${totalValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
              <TabsTrigger value="performance" className="text-[11px] uppercase tracking-[0.12em]">Perf</TabsTrigger>
              <TabsTrigger value="allocation" className="text-[11px] uppercase tracking-[0.12em]">Allocation</TabsTrigger>
              <TabsTrigger value="affiner" className="text-[11px] uppercase tracking-[0.12em]">Affiner</TabsTrigger>
              <TabsTrigger value="impact" className="text-[11px] uppercase tracking-[0.12em]">Impact</TabsTrigger>
              <TabsTrigger value="comparatif" className="text-[11px] uppercase tracking-[0.12em]">vs Marché</TabsTrigger>
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
                <InvestDialog label="Investir" defaultAmount={200} />
                <InvestDialog
                  label="Verser mensuel"
                  defaultAmount={50}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-paper-3 bg-paper text-ink text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-paper-2 transition-colors"
                    >
                      Verser mensuel
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
              <BadgesCard badges={MOCK_BADGES} />
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
                <h2 className="text-sm font-semibold text-ink">Indicateurs clés</h2>
                {isSimple && (
                  <ExplainerCard tone="moss" dismissKey="portfolio-metrics-simple">
                    L'essentiel : croissance attendue, score ESG et CO₂ évité. Active <span className="font-semibold">Expert</span> en haut pour tout voir.
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
