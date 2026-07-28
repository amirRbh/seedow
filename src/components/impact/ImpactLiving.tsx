import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioValuation } from "@/hooks/usePortfolioValuation";
import { EASE_REVEAL } from "@/lib/motion";
import { buildThemeBreakdown } from "@/lib/impact/themeBreakdown";
import { buildOrganism } from "@/lib/impact/leVivant";
import { buildImpactFeed } from "@/lib/impact/leFil";
import { buildPortfolioImpact } from "@/lib/impact/portfolioImpact";
import { ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";
import { LeVivant } from "@/components/impact/LeVivant";
import { LeFil } from "@/components/impact/LeFil";

/**
 * ImpactLiving — « La Preuve Vivante ».
 *
 * Nouvelle tête de la section Impact : au lieu d'un tableau de bord ESG, un
 * organisme vivant unique (Le Vivant), une phrase d'ouverture d'Ethi, puis un fil
 * de dépêches datées et sourcées (Le Fil). Toute la donnée brute reste accessible
 * en dessous, repliée derrière « la preuve » (voir portfolio.tsx) — rien n'est
 * caché, tout est mis à distance d'un geste (architecture §2 du concept).
 *
 * Aucune donnée inventée : l'organisme et le fil sont construits à partir de la
 * composition réelle du portefeuille (cf. lib/impact/leVivant & leFil).
 */
export function ImpactLiving() {
  const { t } = useTranslation();
  const { portfolio } = useActivePortfolio();
  const valuation = usePortfolioValuation();

  const model = useMemo(() => {
    if (!portfolio) return null;
    const holdings = portfolio.holdings ?? [];
    const breakdown = buildThemeBreakdown(holdings);
    const organism = buildOrganism({
      portfolioId: portfolio.id,
      breakdown,
      holdings,
    });
    const invested = valuation.totalInvested || portfolio.initial_amount || 0;
    const impact = portfolio.metrics
      ? buildPortfolioImpact(portfolio.metrics, invested)
      : buildPortfolioImpact(
          {
            carbon_intensity_gco2e_per_eur: null,
            carbon_intensity_coverage: 0,
            esg_score: 0,
          },
          invested,
        );
    const dispatches = buildImpactFeed({
      portfolioId: portfolio.id,
      generatedAt: portfolio.generated_at,
      now: new Date(),
      holdingsCount: holdings.length,
      breakdown,
      impact,
      benchmarkSource: ACWI_WACI_SOURCE,
      benchmarkAsOf: ACWI_WACI_ASOF,
    });
    return { organism, breakdown, dispatches };
  }, [portfolio, valuation.totalInvested]);

  if (!portfolio || !model) return null;

  const { organism, breakdown, dispatches } = model;
  const germinating = organism.branches.length === 0;

  // Texte alternatif de l'organisme — l'info par thème n'est jamais portée par la
  // seule couleur (§4). On liste les convictions et leur poids réel.
  const ariaLabel = germinating
    ? t("impact_living.vivant.aria_germination")
    : `${t("impact_living.vivant.aria_intro")} ${breakdown.slices
        .map((s) => `${t(`impact_living.cause.${s.cause}`)} ${Math.round(s.pct)} %`)
        .join(", ")}.`;

  const ethiLine = germinating
    ? t("impact_living.ethi.germination")
    : t("impact_living.ethi.alive", {
        seeds: organism.totalSeeds,
        themes: organism.branches.length,
      });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_REVEAL }}
      className="space-y-6"
      aria-label={t("impact_living.title")}
    >
      {/* Le Vivant — plein cadre, sans chiffre, sans chrome. */}
      <article className="relative overflow-hidden rounded-3xl border border-paper-3 bg-ink">
        <div className="absolute inset-0">
          <LeVivant organism={organism} ariaLabel={ariaLabel} className="h-full w-full" />
        </div>
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 md:min-h-[360px] md:p-8">
          <header className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] font-semibold text-paper/70">
              {t("impact_living.eyebrow")}
            </p>
            <Link
              to="/methodologie"
              className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-paper/50 transition-colors hover:text-paper"
            >
              {t("impact_living.how_it_works")}
            </Link>
          </header>

          <div className="mt-auto max-w-md">
            <div className="mb-3 inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60">
                {t("impact_living.live")}
              </span>
            </div>
            <p className="text-lg font-medium leading-snug tracking-[-0.01em] text-paper md:text-xl">
              {ethiLine}
            </p>
          </div>
        </div>
      </article>

      {/* Le Fil — les dépêches datées et sourcées. */}
      <div className="space-y-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-ink-3">
          {t("impact_living.fil.title")}
        </h3>
        <LeFil dispatches={dispatches} />
      </div>
    </motion.section>
  );
}
