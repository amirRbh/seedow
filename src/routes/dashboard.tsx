import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { GardenVisualization, type GardenPlant } from "@/components/garden/GardenVisualization";
import { IntentCards } from "@/components/garden/IntentCards";
import { ImpactRibbon } from "@/components/garden/ImpactRibbon";
import { useLexicon } from "@/hooks/useLexicon";
import { MOCK_HOLDINGS, MOCK_PORTFOLIO, MOCK_WALLET, MOCK_USER_NAME } from "@/lib/mockGarden";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function getGreeting(hour: number) {
  if (hour < 12) return "Belle matinée";
  if (hour < 18) return "Bel après-midi";
  return "Belle soirée";
}

function Dashboard() {
  const { L } = useLexicon();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("Bonjour");
  useEffect(() => { setGreeting(getGreeting(new Date().getHours())); }, []);

  const plants: GardenPlant[] = useMemo(
    () =>
      MOCK_HOLDINGS.map((h) => ({
        id: h.id,
        ticker: h.asset.ticker,
        name: h.asset.name,
        allocationPct: h.allocationPct,
        performancePct: h.performancePct,
        esgScore: h.asset.overall_esg_score,
        category: h.asset.category,
      })),
    [],
  );

  const totalValue = MOCK_PORTFOLIO.total_value;
  const totalInvested = MOCK_PORTFOLIO.total_invested;
  const gain = totalValue - totalInvested;
  const returnPct = (gain / totalInvested) * 100;
  const isGrowing = gain >= 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <header className="flex items-start justify-between px-5 pt-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{greeting}</p>
            <h1 className="font-value text-3xl text-ink mt-0.5">{MOCK_USER_NAME}</h1>
          </div>
          <Link to="/portfolio" aria-label="Profil" className="w-9 h-9 rounded-full bg-moss-1 text-paper font-semibold text-sm flex items-center justify-center hover:bg-moss-2 transition-colors">
            {MOCK_USER_NAME.charAt(0)}
          </Link>
        </header>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-5 pt-8">
          <p className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{L.labels.total_value}</p>
          <h2 className="font-value text-6xl text-ink leading-none mt-1">
            <sup className="text-2xl align-super mr-1">€</sup>
            {totalValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
          </h2>
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${isGrowing ? "bg-moss-5 text-moss-1" : "bg-[oklch(0.93_0.05_45)] text-rust"}`}>
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isGrowing ? <polyline points="2,12 6,7 10,9 14,3" /> : <polyline points="2,4 6,9 10,7 14,13" />}
            </svg>
            {isGrowing ? "+" : ""}
            {gain.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € · {returnPct.toFixed(1)}%
            <span className="text-ink-3 font-normal ml-1">depuis la plantation</span>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="px-5 pt-8">
          <GardenVisualization plants={plants} maxSlots={Math.max(5, plants.length + 1)} onEmptySlotClick={() => navigate({ to: "/discover" })} />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-5 pt-6">
          <IntentCards wallet={MOCK_WALLET} />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="px-5 pt-5">
          <ImpactRibbon
            co2Avoided={MOCK_PORTFOLIO.co2_avoided}
            treesEquivalent={MOCK_PORTFOLIO.trees_equivalent}
            energyFinanced={MOCK_PORTFOLIO.energy_financed}
            esgScore={MOCK_PORTFOLIO.overall_score}
          />
        </motion.section>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="px-5 pt-5">
          <Link to="/portfolio" className="w-full flex items-center justify-between p-4 rounded-2xl bg-paper-2 hover:bg-paper-3 transition-colors">
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">Voir les racines</p>
              <p className="text-xs text-ink-3 mt-0.5">L'histoire complète de ton jardin</p>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        </motion.section>
      </div>

      <BottomNavigation />
    </motion.div>
  );
}
