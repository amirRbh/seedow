import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GrowthComparison } from "@/components/roots/GrowthComparison";
import { TimelineEvent } from "@/components/roots/TimelineEvent";
import { BadgesCard } from "@/components/garden/SeasonalBadges";
import { AllocationBreakdown } from "@/components/portfolio/AllocationBreakdown";
import { PortfolioMetricsCard } from "@/components/portfolio/PortfolioMetricsCard";
import { ExplainerCard } from "@/components/ui/ExplainerCard";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { useViewMode } from "@/hooks/useViewMode";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_BADGES } from "@/lib/mockGarden";

export const Route = createFileRoute("/portfolio")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/portfolio", mode: "login" } });
    }
  },
  component: Portfolio,
});

function monthLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

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

  const generated = new Date(portfolio.generated_at);
  const monthKey = `${generated.getFullYear()}-${String(generated.getMonth()).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader
          eyebrow="Détails"
          title="Mon portefeuille"
          subtitle={`${portfolio.holdings.length} ligne${portfolio.holdings.length > 1 ? "s" : ""} · ${totalValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          showPortfolioSelector
        />

        <section className="px-5 pt-2">
          <GrowthComparison
            currentValue={totalValue}
            invested={totalInvested}
            gain={gain}
            returnPct={returnPct}
            lastUpdated={valuation.latestQuoteAt}
            onRefresh={() => valuation.refresh()}
            refreshing={valuation.loading}
          />
        </section>

        <section className="px-5 pt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Indicateurs clés</h2>
          {isSimple && (
            <ExplainerCard tone="moss">
              On garde l'essentiel : croissance attendue, impact écologique et CO₂ évité. Active <span className="font-semibold">Expert</span> en haut pour voir tous les détails financiers.
            </ExplainerCard>
          )}
          <PortfolioMetricsCard metrics={portfolio.metrics} />
        </section>

        <section className="px-5 pt-6">
          <AllocationBreakdown
            holdings={portfolio.holdings}
            totalAmount={totalInvested}
            valuedHoldings={valuation.holdings}
          />
        </section>

        <section className="px-5 pt-6">
          <BadgesCard badges={MOCK_BADGES} />
        </section>

        <section className="px-5 pt-8">
          <h2 className="text-sm font-semibold text-ink mb-4">Historique du portefeuille</h2>

          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 mt-1">Aujourd'hui</p>
          <TimelineEvent
            type="gain"
            title="Ton portefeuille est en hausse"
            subtitle={`Score ESG ${portfolio.metrics?.esg_score ? (portfolio.metrics.esg_score).toFixed(0) : "—"}/100 · ${portfolio.holdings.length} positions`}
            badge={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`}
            badgeVariant={returnPct >= 0 ? "gain" : "loss"}
            impactChips={[
              `${portfolio.metrics?.co2_avoided_tons?.toFixed(2) ?? "—"}t CO₂ évité / 10k€`,
              `Vol. ${portfolio.metrics?.volatility ? (portfolio.metrics.volatility * 100).toFixed(1) : "—"}%`,
            ]}
          />

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2 capitalize">{monthLabel(generated)}</p>
            <TimelineEvent
              type="soil"
              title="Capital initial déposé"
              subtitle={`${totalInvested.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              badge="Dépôt"
              badgeVariant="soil"
            />
          </div>
        </section>
      </div>
      <BottomNavigation />
    </motion.div>
  );
}
