import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { SeedCard } from "@/components/discover/SeedCard";
import { ThemeFilter } from "@/components/discover/ThemeFilter";
import { DepositSheet } from "@/components/discover/DepositSheet";
import { MOCK_ASSETS } from "@/lib/mockGarden";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/discover")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: "/discover", mode: "login" } });
    }
  },
  component: Discover,
});

function Discover() {
  const [activeTheme, setActiveTheme] = useState("all");
  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [planted, setPlanted] = useState<string[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositTarget, setDepositTarget] = useState<string | undefined>(undefined);

  const assets = useMemo(() => {
    if (activeTheme === "all") return MOCK_ASSETS;
    return MOCK_ASSETS.filter((a) => a.themes.includes(activeTheme));
  }, [activeTheme]);

  const current = assets[currentIndex];
  const next = assets[currentIndex + 1];

  const handleSwipe = (action: "plant" | "pass") => {
    if (action === "plant" && current) setPlanted((p) => [...p, current.id]);
    setCurrentIndex((i) => i + 1);
  };

  const reset = () => setCurrentIndex(0);

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) handleSwipe("plant");
    else if (info.offset.x < -120) handleSwipe("pass");
  };

  const openDeposit = (assetName?: string) => {
    setDepositTarget(assetName);
    setDepositOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow="Découvrir" title="Quels actifs ?" />

        <div className="px-5 pb-2 flex items-center justify-between gap-3">
          {planted.length > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-moss-1 font-semibold bg-moss-5 px-2.5 py-1 rounded-full border border-moss-4">
              <span>✓</span>
              <span>
                {planted.length} actif{planted.length > 1 ? "s" : ""} sélectionné{planted.length > 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex bg-paper-2 rounded-full p-1 text-[11px] font-semibold border border-paper-3">
            <button
              onClick={() => setViewMode("swipe")}
              className={`px-3 py-1 rounded-full transition-all ${viewMode === "swipe" ? "bg-card text-ink shadow-leaf" : "text-ink-3"}`}
            >
              Swipe
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-full transition-all ${viewMode === "list" ? "bg-card text-ink shadow-leaf" : "text-ink-3"}`}
            >
              Liste
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-3">
          <ThemeFilter active={activeTheme} onChange={(t) => { setActiveTheme(t); setCurrentIndex(0); }} />
        </div>

        {/* Bandeau Investir — accès rapide au dépôt */}
        <div className="px-5 pb-4">
          <button
            onClick={() => openDeposit()}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-paper hover:opacity-95 transition-all active:scale-[0.99] shadow-deep"
            style={{
              background:
                "linear-gradient(120deg, var(--moss-1) 0%, var(--moss-2) 45%, var(--bloom) 100%)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-paper/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-paper/30">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="text-left min-w-0">
                <p className="text-[13px] font-semibold">Déposer pour investir</p>
                <p className="text-[10px] opacity-85 mt-0.5">Carte · Apple Pay · Virement SEPA</p>
              </div>
            </div>
            <span className="text-base opacity-90">→</span>
          </button>
        </div>

        {viewMode === "swipe" ? (
          <div className="px-5">
            {!current ? (
              <div className="pt-12 text-center">
                <p className="font-value text-3xl text-ink">Tu as tout vu !</p>
                <p className="text-sm text-ink-3 mt-3">Tu as parcouru tous les actifs de ce thème.</p>
                <button onClick={reset} className="btn-plant mt-8">Recommencer</button>
              </div>
            ) : (
              <>
                <div className="relative" style={{ height: 480 }}>
                  {next && (
                    <motion.div key={next.id} className="absolute inset-0" initial={{ scale: 0.92, opacity: 0.7, y: 12 }} animate={{ scale: 0.92, opacity: 0.7, y: 12 }}>
                      <SeedCard asset={next} static />
                    </motion.div>
                  )}
                  <AnimatePresence>
                    <motion.div
                      key={current.id}
                      drag="x"
                      dragConstraints={{ left: -200, right: 200 }}
                      dragElastic={0.7}
                      onDragEnd={handleDrag}
                      whileDrag={{ cursor: "grabbing" }}
                      initial={{ scale: 1, opacity: 1 }}
                      exit={{ x: 500, opacity: 0, rotate: 25, transition: { duration: 0.3 } }}
                      className="absolute inset-0 cursor-grab active:cursor-grabbing"
                      style={{ transformOrigin: "bottom center" }}
                    >
                      <SeedCard asset={current} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <button onClick={() => handleSwipe("pass")} aria-label="Passer" className="w-14 h-14 rounded-full bg-card border border-paper-3 flex items-center justify-center hover:border-rust transition-all active:scale-95">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                  <button
                    onClick={() => openDeposit(current.name)}
                    aria-label="Investir"
                    className="px-5 h-14 rounded-full bg-paper border border-ink text-ink text-[12px] font-medium hover:bg-ink hover:text-paper transition-colors active:scale-95"
                  >
                    Investir
                  </button>
                  <button onClick={() => handleSwipe("plant")} aria-label="Sélectionner" className="w-14 h-14 rounded-full bg-moss-1 text-paper flex items-center justify-center hover:bg-moss-2 transition-all active:scale-95">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                </div>

                <p className="text-center text-[11px] text-ink-3 mt-4">Glisse à droite pour sélectionner · à gauche pour passer · ou investis directement</p>
              </>
            )}
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {assets.map((asset, i) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="paper-card p-3.5 flex items-center gap-3 leaf-hover hover:shadow-leaf transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-leaf"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--moss-1) 75%, white), var(--moss-1))`,
                  }}
                >
                  <span className="text-paper text-[10px] font-bold tracking-tight">{asset.ticker.slice(0, 4)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate leading-tight">{asset.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold">{asset.category}</span>
                    <span className="text-[9px] text-moss-1 font-bold bg-moss-5 px-1.5 py-0.5 rounded-full">
                      ESG {asset.overall_esg_score.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-value text-base text-ink leading-none">
                    {asset.current_price.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-ink-3 mt-1">prix unitaire</p>
                </div>
                <button
                  onClick={() => openDeposit(asset.name)}
                  className="flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold border border-ink text-ink rounded-full hover:bg-ink hover:text-paper transition-colors"
                >
                  Investir
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} assetName={depositTarget} />
      <BottomNavigation />
    </motion.div>
  );
}
