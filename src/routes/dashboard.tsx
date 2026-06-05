import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { GardenVisualization, type GardenPlant } from "@/components/garden/GardenVisualization";
import { ImpactRibbon } from "@/components/garden/ImpactRibbon";
import { useLexicon } from "@/hooks/useLexicon";
import { useAuth } from "@/hooks/useAuth";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

import { JourneySteps } from "@/components/navigation/JourneySteps";
import { ProjectionSimulator } from "@/components/dashboard/ProjectionSimulator";
import { EthiBriefing } from "@/components/dashboard/EthiBriefing";

import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    // La session Supabase vit dans localStorage : on ne peut la lire que côté client.
    // Côté serveur (SSR/prerender), on laisse passer — le client refera le check.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/dashboard", mode: "login" } });
    }
  },
  component: Dashboard,
});

function getGreeting(hour: number) {
  if (hour < 12) return "Belle matinée";
  if (hour < 18) return "Bel après-midi";
  return "Belle soirée";
}

function Dashboard() {
  const { L } = useLexicon();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portfolio, loading } = useActivePortfolio();
  const { portfolios, loading: pfListLoading } = useUserPortfolios();
  const valuation = usePortfolioValuation();
  const [greeting, setGreeting] = useState("Bonjour");
  const hasSeenPortfolioRef = useRef(false);

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (portfolio || portfolios.length > 0) {
      hasSeenPortfolioRef.current = true;
    }
  }, [portfolio, portfolios.length]);

  // Redirection vers l'onboarding pilotée par l'état explicite de la requête,
  // pas par un délai. On attend que les listes (portefeuilles + portefeuille actif)
  // soient résolues, puis on redirige uniquement si aucun portefeuille n'existe.
  useEffect(() => {
    if (pfListLoading || loading) return;
    if (hasSeenPortfolioRef.current) return;
    if (portfolios.length === 0 && !portfolio) {
      navigate({ to: "/onboarding", search: { new: undefined } });
    }
  }, [pfListLoading, loading, portfolios.length, portfolio, navigate]);

  const userName = useMemo(() => {
    const meta = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;
    return meta?.display_name || meta?.full_name || user?.email?.split("@")[0] || "Bienvenue";
  }, [user]);

  const plants: GardenPlant[] = useMemo(
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

  // Valeur du portefeuille basée uniquement sur l'initial_amount déclaré + cours.
  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const totalValue = valuation.currentValue || totalInvested;
  const gain = valuation.pnl;
  const returnPct = valuation.returnPct;
  const isGrowing = gain >= 0;

  const co2 = portfolio?.metrics?.co2_avoided_tons
    ? Number(((portfolio.metrics.co2_avoided_tons * Math.max(totalInvested, 1)) / 10000).toFixed(2))
    : 0;
  const trees = Math.round(co2 * 45);
  const energy = Math.round(totalInvested / 5);
  const esgScore = portfolio?.metrics?.esg_score
    ? Number((portfolio.metrics.esg_score / 10).toFixed(1))
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={greeting} title={userName} showPortfolioSelector />

        <div className="pt-2">
          <JourneySteps active="tracking" />
        </div>

        <EthiBriefing />





        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-5 pt-8"
        >
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{L.labels.total_value}</p>
          <h2 className="font-value text-6xl text-ink leading-none mt-1">
            <sup className="text-2xl align-super mr-1">€</sup>
            {totalValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div
            className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
              isGrowing ? "bg-moss-5 text-moss-1" : "bg-[oklch(0.93_0.05_45)] text-rust"
            }`}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isGrowing ? <polyline points="2,12 6,7 10,9 14,3" /> : <polyline points="2,4 6,9 10,7 14,13" />}
            </svg>
            {isGrowing ? "+" : ""}
            {gain.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € · {returnPct.toFixed(2)}%
            <span className="text-ink-3 font-normal ml-1">depuis la plantation</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-5 pt-6"
        >
          <ImpactRibbon
            co2Avoided={co2}
            treesEquivalent={trees}
            energyFinanced={energy}
            esgScore={esgScore}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="px-5 pt-6"
        >
          {loading ? (
            <p className="text-[12px] text-ink-3">Chargement de votre portefeuille…</p>
          ) : plants.length === 0 ? (
            <div className="border border-dashed border-paper-3 rounded p-6 text-center">
              <p className="text-[13px] text-ink-2 mb-3">Votre portefeuille est encore vide.</p>
              <Link
                to="/onboarding"
                search={{ new: undefined }}
                className="inline-block px-4 py-2 text-[12px] font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
              >
                Faire mon premier investissement
              </Link>
            </div>
          ) : (
            <GardenVisualization
              plants={plants}
              maxSlots={Math.max(5, plants.length + 1)}
              onEmptySlotClick={() => navigate({ to: "/discover" })}
            />
          )}
        </motion.section>


        {portfolio && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ProjectionSimulator
              initialAmount={totalValue || totalInvested || 1000}
              expectedReturn={portfolio.metrics?.expected_return ?? 0.05}
              volatility={portfolio.metrics?.volatility ?? 0.12}
            />
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-5 pt-5"
        >
          <Link
            to="/portfolio"
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-paper-2 hover:bg-paper-3 transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">Voir le détail</p>
              <p className="text-xs text-ink-3 mt-0.5">Allocation, performance et historique</p>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </motion.section>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}

