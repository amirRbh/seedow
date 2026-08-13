import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { HoldingDetailSheet } from "@/components/portfolio/HoldingDetailSheet";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { useActivePortfolio, type ActiveHolding } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { AnimatedFigure } from "@/components/ui/AnimatedFigure";
import { formatCurrency, formatPercent } from "@/lib/format";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { requireAuthedUser } from "@/lib/auth/requireAuthedUser";

// Référence de comparaison : ETF MSCI World (IWDA / EUNL). Rendement et
// volatilité annualisés (mêmes conventions que le comparatif détaillé).
const MSCI_WORLD = { expectedReturn: 0.072, volatility: 0.155 } as const;

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
  const { t } = useTranslation();
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

  // Principales lignes, du plus gros poids au plus petit.
  const topHoldings = useMemo(
    () => [...holdings].sort((a, b) => (b.allocationPct ?? 0) - (a.allocationPct ?? 0)).slice(0, 4),
    [holdings],
  );

  // Impact carbone réel via le moteur d'impact honnête : n'expose un écart
  // chiffré que si la couverture des données émetteurs est suffisante (sinon
  // `cleaner` reste faux / delta null). Aucun chiffre fabriqué.
  const impact = useMemo(() => {
    const m = portfolio?.metrics;
    if (!m) return null;
    return buildPortfolioImpact(m, totalInvested || totalValue);
  }, [portfolio, totalInvested, totalValue]);
  const carbonDelta = impact?.intensity?.cleaner ? impact.intensity.vsBenchmarkDeltaPct : null;

  const expectedReturn = portfolio?.metrics?.expected_return ?? null;
  const volatility = portfolio?.metrics?.volatility ?? null;

  // Fiche détaillée d'un actif (bottom sheet) — « pourquoi cet actif est là ».
  const [selectedHolding, setSelectedHolding] = useState<ActiveHolding | null>(null);

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.06 * i, duration: 0.4 },
  });

  const ethiActions = [
    { key: "le_fil.ethi_why", intent: "why", primary: true },
    { key: "le_fil.ethi_compare", intent: "compare", primary: false },
    { key: "le_fil.ethi_challenge", intent: "challenge", primary: false },
    { key: "le_fil.ethi_simulate", intent: "simulate", primary: false },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto pb-28">
        <AppHeader eyebrow={t("le_fil.eyebrow")} title={userName} showPortfolioSelector />

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
                {t("le_fil.money")}
              </p>
              <h2 className="font-value text-figure-hero text-ink mt-1 leading-none">
                <AnimatedFigure
                  value={totalValue}
                  from={0}
                  format={(v) => formatCurrency(v, lang)}
                />
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
                {t("le_fil.finance")}
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
                <p className="text-sm text-ink-3 mt-2">{t("le_fil.define_convictions")}</p>
              )}
              <Link
                to="/discover"
                search={{ theme: portfolio?.causes?.[0] }}
                className="mt-3 inline-block font-mono text-xs text-mint-ink"
              >
                {t("le_fil.explore_aligned")} →
              </Link>
            </Node>

            {/* NŒUD 3 — MES INVESTISSEMENTS */}
            <Node index={3} active {...reveal(3)}>
              <div className="flex items-center justify-between">
                <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                  {t("le_fil.investments")}
                </p>
                {holdings.length > 0 && (
                  <Link to="/portfolio" className="font-mono text-xs text-mint-ink">
                    {t("le_fil.see_all")} →
                  </Link>
                )}
              </div>
              {topHoldings.length > 0 ? (
                <ul className="mt-3 flex flex-col divide-y divide-paper-3">
                  {topHoldings.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setSelectedHolding(h)}
                        aria-label={t("le_fil.asset_detail", { name: h.name })}
                        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-highlight-1 rounded-sm"
                      >
                        <p className="truncate text-sm font-medium text-ink">{h.name}</p>
                        <p className="font-mono text-tag uppercase tracking-wide text-ink-3">
                          {h.category ?? "—"} · {formatPercent(h.allocationPct ?? 0, lang, 0)}
                        </p>
                      </button>
                      <span className="font-mono text-sm text-ink tabular-nums">
                        {formatCurrency(((h.allocationPct ?? 0) / 100) * totalValue, lang)}
                      </span>
                      <Link
                        to="/ethi"
                        search={{ intent: "why", q: h.ticker }}
                        aria-label={t("le_fil.why_asset", { name: h.name })}
                        className="shrink-0 rounded-full border border-paper-3 px-2.5 py-1 font-mono text-xs text-ink-2 transition-colors hover:border-mint/40 hover:text-ink"
                      >
                        {t("le_fil.why")}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3 mt-2">{t("le_fil.empty_holdings")}</p>
              )}
            </Node>

            {/* NŒUD 4 — MON IMPACT */}
            <Node index={4} active {...reveal(4)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                {t("le_fil.impact")}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <ImpactRing score={impactScore} />
                <div className="text-sm text-ink-2 leading-snug">
                  {impactScore !== null ? (
                    <>
                      {t("le_fil.impact_weighted")}
                      {carbonDelta != null && (
                        <>
                          {" "}
                          {t("le_fil.carbon_prefix")}{" "}
                          <span className="text-mint-ink font-medium">
                            −{formatPercent(carbonDelta, lang, 0)}
                          </span>{" "}
                          {t("le_fil.carbon_suffix")}
                        </>
                      )}
                      <br />
                      <Link to="/certificat" className="text-mint-ink font-medium">
                        {t("le_fil.impact_link")} →
                      </Link>
                    </>
                  ) : (
                    t("le_fil.impact_empty")
                  )}
                </div>
              </div>
              {carbonDelta != null && (
                <p className="mt-2 font-mono text-tag text-ink-3">{t("le_fil.carbon_source")}</p>
              )}
              {/* Équivalences concrètes — affichées UNIQUEMENT si le moteur
                  d'impact le juge honnête (empreinte mesurée + couverture ≥ 50 %). */}
              {impact?.presentation?.show && impact.presentation.equivalences.length > 0 && (
                <div className="mt-3 border-t border-paper-3 pt-3">
                  <p className="font-mono text-tag uppercase tracking-wide text-ink-3">
                    {t("le_fil.equivalences_title")}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {impact.presentation.equivalences.slice(0, 3).map((e) => (
                      <li key={e.factorId} className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink-2">{t(e.labelKey)}</span>
                        <span className="shrink-0 font-mono text-sm text-mint-ink tabular-nums">
                          ≈ {Math.round(e.value).toLocaleString(lang, { maximumFractionDigits: 0 })}{" "}
                          {t(e.unitKey)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-mono text-tag text-ink-3">
                    {t("le_fil.equivalences_source")} :{" "}
                    {impact.presentation.equivalences[0]?.source}
                  </p>
                </div>
              )}
            </Node>

            {/* NŒUD 5 — COMPARAISON */}
            <Node index={5} active {...reveal(5)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                {t("le_fil.compare_title")}
              </p>
              {expectedReturn != null && volatility != null ? (
                <div className="mt-3 flex flex-col gap-3">
                  <CompareRow
                    label={t("le_fil.expected_return")}
                    mineLabel={t("le_fil.mine")}
                    mine={expectedReturn}
                    benchmark={MSCI_WORLD.expectedReturn}
                    lang={lang}
                    higherIsBetter
                  />
                  <CompareRow
                    label={t("le_fil.risk_vol")}
                    mineLabel={t("le_fil.mine")}
                    mine={volatility}
                    benchmark={MSCI_WORLD.volatility}
                    lang={lang}
                    higherIsBetter={false}
                  />
                  <Link to="/comparatif" className="font-mono text-xs text-mint-ink">
                    {t("le_fil.compare_detail")} →
                  </Link>
                  <p className="font-mono text-tag text-ink-3">{t("le_fil.returns_disclaimer")}</p>
                </div>
              ) : (
                <p className="text-sm text-ink-3 mt-2">{t("le_fil.compare_empty")}</p>
              )}
            </Node>

            {/* NŒUD 6 — LE MONDE RÉEL */}
            <Node index={6} active={false} {...reveal(6)}>
              <p className="text-caption uppercase tracking-wider text-ink-3 font-mono">
                {t("le_fil.real_world")}
              </p>
              <p className="text-sm text-ink-2 mt-1">{t("le_fil.real_world_desc")}</p>
              <Link
                to="/methodologie"
                className="inline-block mt-2 font-mono text-xs text-ink-3 hover:text-ink"
              >
                {t("le_fil.methodology")} →
              </Link>
            </Node>
          </div>

          {/* Ethi — actions contextuelles, jamais un chat vide */}
          <motion.div {...reveal(7)} className="mt-5">
            <p className="text-caption uppercase tracking-wider text-ink-3 font-mono mb-2">
              {t("le_fil.ask_ethi")}
            </p>
            <div className="flex flex-wrap gap-2">
              {ethiActions.map((a) => (
                <Link
                  key={a.intent}
                  to="/ethi"
                  search={{ intent: a.intent, q: undefined }}
                  className={`font-mono text-xs px-3 py-2 rounded-full border transition-transform hover:scale-[1.03] ${
                    a.primary
                      ? "text-white bg-mint border-mint"
                      : "text-ink-2 border-paper-3 bg-card"
                  }`}
                >
                  {t(a.key)}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <HoldingDetailSheet
        open={selectedHolding !== null}
        onClose={() => setSelectedHolding(null)}
        holding={selectedHolding}
      />

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

/**
 * Ligne de comparaison honnête : deux barres (mon Fil vs indice), la couleur
 * mint signalant simplement quel côté est le plus favorable pour cette métrique.
 */
function CompareRow({
  label,
  mineLabel,
  mine,
  benchmark,
  lang,
  higherIsBetter,
}: {
  label: string;
  mineLabel: string;
  mine: number;
  benchmark: number;
  lang: Parameters<typeof formatPercent>[1];
  higherIsBetter: boolean;
}) {
  const max = Math.max(mine, benchmark) || 1;
  const better = higherIsBetter ? mine >= benchmark : mine <= benchmark;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-tag uppercase tracking-wide text-ink-3">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 font-mono text-tag text-ink-2">{mineLabel}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${(mine / max) * 100}%`,
              background: better ? "var(--color-mint)" : "var(--ink-3)",
            }}
          />
        </div>
        <span
          className={`w-12 shrink-0 text-right font-mono text-tag tabular-nums ${better ? "text-mint-ink" : "text-ink-2"}`}
        >
          {formatPercent(mine, lang, 1)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 font-mono text-tag text-ink-2">MSCI</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
          <span
            className="block h-full rounded-full bg-ink-3"
            style={{ width: `${(benchmark / max) * 100}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-tag text-ink-2 tabular-nums">
          {formatPercent(benchmark, lang, 1)}
        </span>
      </div>
    </div>
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
      <span className="relative font-mono text-base font-bold text-ink">
        {score === null ? (
          "—"
        ) : (
          <AnimatedFigure value={score} from={0} format={(v) => String(Math.round(v))} />
        )}
      </span>
    </div>
  );
}
