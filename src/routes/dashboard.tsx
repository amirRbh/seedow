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
import { useDeposits } from "@/hooks/useDeposits";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
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
  const { total: walletTotal, pending: walletPending, deposits } = useDeposits();
  const valuation = usePortfolioValuation();
  const [greeting, setGreeting] = useState("Bonjour");
  const hasSeenPortfolioRef = useRef(false);

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (portfolio) {
      hasSeenPortfolioRef.current = true;
    }
  }, [portfolio]);

  // On ne redirige vers l'onboarding que pour un vrai "nouvel utilisateur".
  // Si un portefeuille a déjà été vu dans cette session, on évite toute boucle
  // causée par une latence de re-fetch ou un refresh intermédiaire.
  useEffect(() => {
    if (loading || portfolio || hasSeenPortfolioRef.current) return;
    const timer = setTimeout(() => {
      if (!hasSeenPortfolioRef.current) {
        navigate({ to: "/onboarding", search: { new: undefined } });
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, portfolio, navigate]);

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

  // Real-money valuation (initial_amount + settled deposits, valued via live quotes)
  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0) + walletTotal;
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
          {walletPending > 0 && (
            <p className="text-[11px] text-ink-3 mt-2">
              + {walletPending.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en attente de virement SEPA
            </p>
          )}
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
            <p className="text-[12px] text-ink-3">Chargement de votre jardin…</p>
          ) : plants.length === 0 ? (
            <div className="border border-dashed border-paper-3 rounded p-6 text-center">
              <p className="text-[13px] text-ink-2 mb-3">Votre jardin est encore vide.</p>
              <Link
                to="/onboarding"
                search={{ new: undefined }}
                className="inline-block px-4 py-2 text-[12px] font-medium border border-ink rounded hover:bg-ink hover:text-paper transition-colors"
              >
                Planter mes premières graines
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

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-5 pt-6"
        >
          <WalletCard
            balance={walletTotal}
            pending={walletPending}
            depositCount={deposits.length}
            onAdd={() => navigate({ to: "/discover" })}
          />
        </motion.section>

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
              <p className="text-sm font-semibold text-ink">Voir les racines</p>
              <p className="text-xs text-ink-3 mt-0.5">L'histoire complète de ton jardin</p>
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

function WalletCard({
  balance,
  pending,
  depositCount,
  onAdd,
}: {
  balance: number;
  pending: number;
  depositCount: number;
  onAdd: () => void;
}) {
  return (
    <div className="border border-paper-3 rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.15em] text-ink-3 font-medium">Solde investi</p>
        <span className="text-[11px] text-ink-3">{depositCount} dépôt{depositCount > 1 ? "s" : ""}</span>
      </div>
      <p className="font-value text-3xl text-ink mt-1.5 tabular-nums">
        {balance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </p>
      {pending > 0 && (
        <p className="text-[11px] text-ink-3 mt-1">
          {pending.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en attente
        </p>
      )}
      <button
        onClick={onAdd}
        className="mt-3 w-full py-2.5 text-[12px] font-medium border border-ink rounded-lg hover:bg-ink hover:text-paper transition-colors"
      >
        + Faire un nouveau dépôt
      </button>
    </div>
  );
}
