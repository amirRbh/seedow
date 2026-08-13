import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { formatCurrency, formatPercent } from "@/lib/format";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

export const Route = createFileRoute("/le-fil")({
  beforeLoad: () => requireAuthedUser("/le-fil"),
  component: LeFil,
});

/**
 * « Le Fil » — accueil nouvelle génération (concept Seedow 2.0).
 * On ne consulte plus des pages juxtaposées : on remonte un fil unique,
 * du concret (mon argent) vers le sens (le monde réel). Chaque nœud répond
 * à une seule question ; l'info secondaire se déplie ailleurs (Ethi, détail).
 */
function LeFil() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  const holdings = useMemo(() => portfolio?.holdings ?? [], [portfolio]);
  const totalInvested = valuation.totalInvested || (portfolio?.initial_amount ?? 0);
  const totalValue = valuation.currentValue || totalInvested;
  const gain = valuation.pnl;
  const returnPct = valuation.returnPct;
  const isGrowing = gain >= 0;

  // Score d'impact : moyenne ESG pondérée par l'allocation (0–100).
  const impactScore = useMemo(() => {
    if (holdings.length === 0) return null;
    let sumW = 0;
    let sum = 0;
    for (const h of holdings) {
      const w = h.allocationPct ?? 0;
      const s = h.esgScore ?? 0;
      sumW += w;
      sum += w * s;
    }
    if (sumW === 0) return null;
    return Math.round(sum / sumW);
  }, [holdings]);

  // « Ce que je finance » : catégories dominantes du portefeuille.
  const convictions = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const h of holdings) {
      const cat = h.category ?? "Autres";
      byCat.set(cat, (byCat.get(cat) ?? 0) + (h.allocationPct ?? 0));
    }
    return [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);
  }, [holdings]);

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.06 * i, duration: 0.4 },
  });

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow="Le Fil" title={userName} showPortfolioSelector />

        <div className="relative px-5 pt-4">
          {/* Le fil vertical qui relie les nœuds */}
          <div
            aria-hidden
            className="absolute left-[26px] top-6 bottom-6 w-px bg-gradient-to-b from-mint/70 via-paper-3 to-paper-3"
          />

          <div className="flex flex-col gap-3">
            {/* NŒUD 1 — MON ARGENT */}
            <Node index={1} active {...reveal(1)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                Mon argent
              </p>
              <h2 className="font-value text-figure-hero text-ink mt-1 leading-none">
                {formatCurrency(totalValue, lang)}
              </h2>
              <p
                className={`font-mono text-sm mt-1 ${isGrowing ? "text-mint-ink" : "text-alert-ink"}`}
              >
                {isGrowing ? "+" : ""}
                {formatPercent(returnPct, lang)} · {isGrowing ? "+" : ""}
                {formatCurrency(gain, lang)}
              </p>
            </Node>

            {/* NŒUD 2 — MES CONVICTIONS */}
            <Node index={2} active {...reveal(2)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                Ce que je finance
              </p>
              {convictions.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {convictions.map((c, i) => (
                    <span
                      key={c}
                      className={`font-mono text-xs px-3 py-1.5 rounded-full border ${
                        i === 0
                          ? "text-mint-ink border-mint/40 bg-mint/5"
                          : "text-ink-2 border-paper-3"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-3 mt-2">
                  Définis tes convictions pour composer ton portefeuille.
                </p>
              )}
            </Node>

            {/* NŒUD 3 — MON IMPACT */}
            <Node index={3} active {...reveal(3)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                Mon impact
              </p>
              <div className="flex items-center gap-4 mt-2">
                <ImpactRing score={impactScore} />
                <div className="text-sm text-ink-2 leading-snug">
                  {impactScore !== null ? (
                    <>
                      Score d'impact pondéré.
                      <br />
                      <Link to="/certificat" className="text-mint-ink font-medium">
                        Voir ce que ton argent finance →
                      </Link>
                    </>
                  ) : (
                    "Ajoute des actifs pour mesurer ton impact."
                  )}
                </div>
              </div>
            </Node>

            {/* NŒUD 4 — LE MONDE RÉEL */}
            <Node index={4} active={false} {...reveal(4)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                Le monde réel
              </p>
              <p className="text-sm text-ink-2 mt-1">
                Les faits, les sources et le droit de réponse derrière chaque chiffre.
              </p>
              <Link
                to="/methodologie"
                className="inline-block mt-2 font-mono text-xs text-ink-3 hover:text-ink"
              >
                Méthodologie &amp; sources →
              </Link>
            </Node>
          </div>

          {/* Ethi — actions contextuelles, jamais un chat vide */}
          <motion.div {...reveal(5)} className="mt-5">
            <p className="text-caption uppercase tracking-wider text-ink-3 font-mono mb-2">
              Demander à Ethi
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Pourquoi ces actifs ?", intent: "why", primary: true },
                { label: "Compare au MSCI World", intent: "compare", primary: false },
                { label: "Challenge mon portefeuille", intent: "challenge", primary: false },
                { label: "Et si je privilégiais le climat ?", intent: "simulate", primary: false },
              ].map((a) => (
                <Link
                  key={a.label}
                  to="/ethi"
                  search={{ intent: a.intent, q: undefined }}
                  className={`font-mono text-xs px-3 py-2 rounded-full border transition-transform hover:scale-[1.03] ${
                    a.primary
                      ? "text-white bg-mint border-mint"
                      : "text-ink-2 border-paper-3 bg-card"
                  }`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}

/** Un nœud du fil : puce sur la ligne + carte de contenu. */
function Node({
  index,
  active,
  children,
  ...motionProps
}: {
  index: number;
  active: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div {...motionProps} className="relative pl-9">
      <span
        aria-hidden
        className={`absolute left-[18px] top-2 -translate-x-1/2 w-3 h-3 rounded-full bg-paper border-[2.5px] ${
          active ? "border-mint" : "border-paper-3"
        }`}
      />
      <div className="rounded-[14px] border border-paper-3 bg-card p-4 shadow-sm">{children}</div>
    </motion.div>
  );
}

/** Anneau d'impact — la note n'est jamais un badge A/B/C, c'est une jauge. */
function ImpactRing({ score }: { score: number | null }) {
  const pct = score ?? 0;
  return (
    <div
      className="relative w-16 h-16 rounded-full grid place-items-center shrink-0"
      style={{
        background: `conic-gradient(var(--color-mint) ${pct}%, var(--paper-3) ${pct}% 100%)`,
      }}
    >
      <div className="absolute w-11 h-11 rounded-full bg-card" />
      <span className="relative font-mono text-base font-bold text-ink">{score ?? "—"}</span>
    </div>
  );
}
