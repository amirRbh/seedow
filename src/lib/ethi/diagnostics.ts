// Pure, deterministic portfolio diagnostics powering Ethi's opening briefing
// and the dynamic action chips. No I/O, no IA call — runs instantly client-side.

import type { ActivePortfolio } from "@/hooks/useActivePortfolio";
import type { PortfolioValuation } from "@/hooks/usePortfolioValuation";

export type DiagSeverity = "positive" | "neutral" | "warning";

export interface Diagnostic {
  id: string;
  severity: DiagSeverity;
  /** Short rendered string used in the briefing bullet list. */
  text: string;
  /** Compact machine-readable payload sent to the LLM context. */
  data?: Record<string, number | string>;
}

export interface ChipAction {
  /** Label shown to the user. */
  label: string;
  /** When set, opens the inline simulation form instead of sending text. */
  kind?: "sim";
  /** Otherwise, the literal question sent to Ethi. */
  query?: string;
}

export interface EthiBriefing {
  /** Markdown greeting injected as the first assistant bubble. */
  message: string;
  /** Action chips shown under the welcome bubble. */
  chips: ChipAction[];
  /** Diagnostics passed to the LLM as ground truth. */
  flags: Diagnostic[];
  /** Aggregates derived once, reused by both the briefing and the LLM context. */
  aggregates: {
    topHoldingTicker: string | null;
    topHoldingPct: number;
    topRegion: string | null;
    topRegionPct: number;
    topCategory: string | null;
    topCategoryPct: number;
    avgEsg: number;
    terPct: number;
  };
}

interface BuildArgs {
  firstName: string;
  portfolio: ActivePortfolio | null;
  valuation: PortfolioValuation;
  lang: "fr" | "en";
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const pct = (n: number, digits = 0) => `${n.toFixed(digits)} %`;

function aggregate(portfolio: ActivePortfolio) {
  const holdings = portfolio.holdings;
  const top = holdings[0] ?? null;

  const byRegion = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const h of holdings) {
    if (h.region) byRegion.set(h.region, (byRegion.get(h.region) ?? 0) + h.allocationPct);
    if (h.category) byCategory.set(h.category, (byCategory.get(h.category) ?? 0) + h.allocationPct);
  }
  const topRegionEntry = [...byRegion.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCatEntry = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const m = portfolio.metrics;
  const avgEsg = m ? m.esg_score : 0;
  const terPct = m ? m.ter * 100 : 0;

  return {
    topHoldingTicker: top?.ticker ?? null,
    topHoldingPct: top?.allocationPct ?? 0,
    topRegion: topRegionEntry?.[0] ?? null,
    topRegionPct: topRegionEntry?.[1] ?? 0,
    topCategory: topCatEntry?.[0] ?? null,
    topCategoryPct: topCatEntry?.[1] ?? 0,
    avgEsg,
    terPct,
  };
}

export function buildBriefing({ firstName, portfolio, valuation, lang }: BuildArgs): EthiBriefing {
  const en = lang === "en";
  const hasPortfolio = (portfolio?.holdings.length ?? 0) > 0;

  // ── No portfolio yet ────────────────────────────────────────────
  if (!hasPortfolio || !portfolio) {
    return {
      message: en
        ? `Hi ${firstName} ✨\n\n**No portfolio yet.** Tell me what matters to you — values, horizon, ticket — and I'll draft an allocation in two minutes.`
        : `Salut ${firstName} ✨\n\n**Pas encore de portefeuille.** Dis-moi ce qui compte pour toi — valeurs, horizon, montant — je propose une allocation en deux minutes.`,
      chips: en
        ? [
            {
              label: "Build my first portfolio",
              query: "Help me build my first portfolio from scratch.",
            },
            { label: "Simulate a monthly plan", kind: "sim" },
            { label: "What is an ESG ETF?", query: "What is an ESG ETF, in simple terms?" },
          ]
        : [
            {
              label: "Construis mon premier portefeuille",
              query: "Aide-moi à construire mon premier portefeuille.",
            },
            { label: "Simuler un versement mensuel", kind: "sim" },
            {
              label: "C'est quoi un ETF ESG ?",
              query: "C'est quoi un ETF ESG, en termes simples ?",
            },
          ],
      flags: [],
      aggregates: {
        topHoldingTicker: null,
        topHoldingPct: 0,
        topRegion: null,
        topRegionPct: 0,
        topCategory: null,
        topCategoryPct: 0,
        avgEsg: 0,
        terPct: 0,
      },
    };
  }

  const agg = aggregate(portfolio);
  const flags: Diagnostic[] = [];

  // Concentration on a single line
  if (agg.topHoldingPct >= 30 && agg.topHoldingTicker) {
    flags.push({
      id: "concentration",
      severity: agg.topHoldingPct >= 45 ? "warning" : "neutral",
      text: en
        ? `**${agg.topHoldingTicker}** weighs **${pct(agg.topHoldingPct)}** of the book — concentration risk.`
        : `**${agg.topHoldingTicker}** pèse **${pct(agg.topHoldingPct)}** du portefeuille — concentration élevée.`,
      data: { ticker: agg.topHoldingTicker, weightPct: +agg.topHoldingPct.toFixed(1) },
    });
  }

  // Regional concentration
  if (agg.topRegion && agg.topRegionPct >= 60) {
    flags.push({
      id: "region_bias",
      severity: agg.topRegionPct >= 75 ? "warning" : "neutral",
      text: en
        ? `**${pct(agg.topRegionPct)}** of exposure sits in **${agg.topRegion}** — geographic bias.`
        : `**${pct(agg.topRegionPct)}** de l'exposition est sur **${agg.topRegion}** — biais géographique.`,
      data: { region: agg.topRegion, weightPct: +agg.topRegionPct.toFixed(1) },
    });
  }

  // Category concentration
  if (agg.topCategory && agg.topCategoryPct >= 70) {
    flags.push({
      id: "category_bias",
      severity: "neutral",
      text: en
        ? `**${pct(agg.topCategoryPct)}** on a single asset class (**${agg.topCategory}**) — limited diversification.`
        : `**${pct(agg.topCategoryPct)}** sur une seule classe d'actifs (**${agg.topCategory}**) — diversification limitée.`,
      data: { category: agg.topCategory, weightPct: +agg.topCategoryPct.toFixed(1) },
    });
  }

  // TER
  if (agg.terPct > 0) {
    if (agg.terPct > 0.6) {
      flags.push({
        id: "ter_high",
        severity: "warning",
        text: en
          ? `Average TER **${agg.terPct.toFixed(2)} %** — fees eat into your returns.`
          : `TER moyen **${agg.terPct.toFixed(2)} %** — les frais grignotent ta performance.`,
        data: { terPct: +agg.terPct.toFixed(2) },
      });
    } else if (agg.terPct < 0.25) {
      flags.push({
        id: "ter_low",
        severity: "positive",
        text: en
          ? `Average TER **${agg.terPct.toFixed(2)} %** — fees are well under control.`
          : `TER moyen **${agg.terPct.toFixed(2)} %** — les frais sont très bien maîtrisés.`,
        data: { terPct: +agg.terPct.toFixed(2) },
      });
    }
  }

  // ESG
  if (agg.avgEsg > 0) {
    if (agg.avgEsg >= 80) {
      flags.push({
        id: "esg_high",
        severity: "positive",
        text: en
          ? `ESG score **${agg.avgEsg.toFixed(0)}/100** — strong sustainability profile.`
          : `Score ESG **${agg.avgEsg.toFixed(0)}/100** — profil durable solide.`,
        data: { esg: +agg.avgEsg.toFixed(0) },
      });
    } else if (agg.avgEsg < 55) {
      flags.push({
        id: "esg_low",
        severity: "warning",
        text: en
          ? `ESG score **${agg.avgEsg.toFixed(0)}/100** — below your ambition, worth a review.`
          : `Score ESG **${agg.avgEsg.toFixed(0)}/100** — en dessous de ton ambition, à revoir.`,
        data: { esg: +agg.avgEsg.toFixed(0) },
      });
    }
  }

  // Diversification (single line portfolios)
  if (portfolio.holdings.length <= 2) {
    flags.push({
      id: "few_lines",
      severity: "warning",
      text: en
        ? `Only **${portfolio.holdings.length} line${portfolio.holdings.length > 1 ? "s" : ""}** — too thin to absorb a shock.`
        : `Seulement **${portfolio.holdings.length} ligne${portfolio.holdings.length > 1 ? "s" : ""}** — trop fin pour absorber un choc.`,
      data: { lines: portfolio.holdings.length },
    });
  }

  // Keep the top 4 by severity (warning > neutral > positive)
  const order: Record<DiagSeverity, number> = { warning: 0, neutral: 1, positive: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
  const top = flags.slice(0, 4);

  // Header KPIs
  const value = valuation.hasQuotes ? valuation.currentValue : valuation.totalInvested;
  const pnlSign = valuation.pnl >= 0 ? "+" : "−";
  const pnlAbs = Math.abs(valuation.pnl);
  const retSign = valuation.returnPct >= 0 ? "+" : "−";
  const retAbs = Math.abs(valuation.returnPct);

  const header = en
    ? `Hey ${firstName} — here's where you stand.\n\n**€${fmtEUR(value)}** · ${valuation.hasQuotes ? `${pnlSign}€${fmtEUR(pnlAbs)} (${retSign}${retAbs.toFixed(2)} %)` : "live quotes unavailable"} · **${portfolio.holdings.length} lines**`
    : `Hop ${firstName} — voilà où tu en es.\n\n**${fmtEUR(value)} €** · ${valuation.hasQuotes ? `${pnlSign}${fmtEUR(pnlAbs)} € (${retSign}${retAbs.toFixed(2)} %)` : "cotations indisponibles"} · **${portfolio.holdings.length} lignes**`;

  const observationsTitle = en ? "**What I see**" : "**Ce que je vois**";
  const observations = top.length
    ? `\n\n${observationsTitle}\n${top.map((f) => `- ${f.text}`).join("\n")}`
    : en
      ? `\n\n**Healthy book.** Nothing flagged — diversification, ESG and fees look balanced.`
      : `\n\n**Portefeuille sain.** Rien à signaler — diversification, ESG et frais sont équilibrés.`;

  const ask = en
    ? `\n\nPick an angle below, or ask me anything.`
    : `\n\nChoisis un angle ci-dessous, ou pose-moi ta question.`;

  const message = header + observations + ask;

  // Build dynamic chips from flags
  const chips: ChipAction[] = [];
  if (
    top.some((f) => f.id === "concentration") ||
    top.some((f) => f.id === "region_bias") ||
    top.some((f) => f.id === "category_bias")
  ) {
    chips.push({
      label: en ? "How do I rebalance?" : "Comment je rééquilibre ?",
      query: en
        ? "Based on my current diagnostics, suggest a concrete rebalancing plan."
        : "Vu mes diagnostics actuels, propose-moi un plan de rééquilibrage concret.",
    });
  }
  if (top.some((f) => f.id === "ter_high")) {
    chips.push({
      label: en ? "Lower my fees" : "Réduire mes frais",
      query: en
        ? "How can I reduce the total expense ratio of my portfolio?"
        : "Comment je peux réduire le TER moyen de mon portefeuille ?",
    });
  }
  if (top.some((f) => f.id === "esg_low")) {
    chips.push({
      label: en ? "Improve my ESG score" : "Améliorer mon score ESG",
      query: en
        ? "Which lines hurt my ESG score most and what could I swap them for?"
        : "Quelles lignes pèsent le plus sur mon score ESG et par quoi je pourrais les remplacer ?",
    });
  }
  // Always offer simulation + crash scenario
  chips.push({
    label: en ? "Simulate a monthly plan" : "Simuler un versement mensuel",
    kind: "sim",
  });
  if (chips.length < 3) {
    chips.push({
      label: en ? "What if the market drops 20%?" : "Et si le marché baisse de 20 % ?",
      query: en
        ? "Stress-test my portfolio against a sudden 20% market drop."
        : "Fais un stress-test : mon portefeuille face à une baisse brutale de 20 % du marché.",
    });
  }
  if (chips.length < 3) {
    chips.push({
      label: en ? "Full analysis" : "Analyse complète",
      query: en
        ? "Give me a full diagnostic of my portfolio: strengths, weaknesses, and 3 priority actions."
        : "Fais-moi un diagnostic complet de mon portefeuille : forces, faiblesses, 3 actions prioritaires.",
    });
  }

  return { message, chips: chips.slice(0, 4), flags: top, aggregates: agg };
}
