/**
 * Briefing signals — déterministes, dérivés du portefeuille actif.
 * Aucun appel IA : les signaux sont calculés client-side à partir de l'état
 * réel du portefeuille pour garantir cohérence et zéro hallucination.
 */

import type { ActivePortfolio, ActiveHolding } from "@/hooks/useActivePortfolio";
import type { ValuedHolding } from "@/hooks/usePortfolioValuation";

export type SignalKind = "drift" | "opportunity" | "market";

export interface BriefingSignal {
  kind: SignalKind;
  label: string;
  detail: string;
  tone: "neutral" | "gold" | "highlight" | "rust";
  /** Prompt pré-rempli pour l'Ethi bubble. */
  prompt: string;
}

export interface BriefingInputs {
  portfolio: ActivePortfolio | null;
  holdings: ValuedHolding[];
  returnPct: number;
}

/**
 * Recompose le thème leader à partir des holdings pondérés par leur perf.
 * Approximation simple : on prend la catégorie qui contribue le plus à la perf.
 */
function leadingClass(holdings: ValuedHolding[]): { cls: string; contrib: number } | null {
  if (holdings.length === 0) return null;
  const byClass = new Map<string, number>();
  for (const h of holdings) {
    const contrib = h.weight * h.returnPct;
    byClass.set(h.asset_class, (byClass.get(h.asset_class) ?? 0) + contrib);
  }
  let best: { cls: string; contrib: number } | null = null;
  for (const [cls, contrib] of byClass) {
    if (!best || contrib > best.contrib) best = { cls, contrib };
  }
  return best;
}

const CLASS_LABEL: Record<string, string> = {
  equity_dev: "Actions développées",
  equity_em: "Actions émergentes",
  thematic: "Thématiques",
  green_bond: "Obligations vertes",
  social_bond: "Obligations sociales",
  sov_bond: "Souveraines",
  reit: "Immobilier coté",
  commodity: "Matières premières",
  cash: "Liquidités",
};

/**
 * Détection de drift : écart entre allocation actuelle (valorisée) et cible.
 * On compare la part valorisée vs la part initiale, par holding.
 */
function detectDrift(
  active: ActiveHolding[],
  valued: ValuedHolding[],
): { ticker: string; delta: number } | null {
  if (active.length === 0 || valued.length === 0) return null;
  const totalValued = valued.reduce((s, h) => s + h.currentValue, 0);
  if (totalValued <= 0) return null;

  const targetByTicker = new Map(active.map((h) => [h.ticker, h.allocationPct / 100]));

  let worst: { ticker: string; delta: number } | null = null;
  for (const h of valued) {
    const target = targetByTicker.get(h.ticker);
    if (target == null) continue;
    const actual = h.currentValue / totalValued;
    const delta = (actual - target) * 100; // en points de %
    if (!worst || Math.abs(delta) > Math.abs(worst.delta)) {
      worst = { ticker: h.ticker, delta };
    }
  }
  return worst && Math.abs(worst.delta) >= 1.5 ? worst : null;
}

/**
 * Signal "opportunité" : la ligne la moins performante du jour, dont la perte
 * relative est notable. Suggère un arbitrage potentiel.
 */
function detectOpportunity(valued: ValuedHolding[]): ValuedHolding | null {
  if (valued.length < 2) return null;
  const sorted = [...valued].sort((a, b) => a.returnPct - b.returnPct);
  const worst = sorted[0];
  return worst && worst.returnPct <= -2 ? worst : null;
}

/**
 * Signal marché : journée nettement haussière ou baissière (> 1 %).
 */
function detectMarket(returnPct: number): "up" | "down" | null {
  if (returnPct >= 1) return "up";
  if (returnPct <= -1) return "down";
  return null;
}

export function computeBriefing({ portfolio, holdings, returnPct }: BriefingInputs): {
  headline: string;
  signals: BriefingSignal[];
} {
  if (!portfolio || holdings.length === 0) {
    return {
      headline:
        "Ton portefeuille n'est pas encore valorisé. Reviens après la prochaine mise à jour des cours.",
      signals: [],
    };
  }

  const leader = leadingClass(holdings);
  const dir = returnPct >= 0 ? "gagne" : "recule de";
  const valAbs = Math.abs(returnPct).toFixed(2).replace(".", ",");
  const sign = returnPct >= 0 ? "+" : "−";
  const leaderTxt = leader ? `, porté par ${CLASS_LABEL[leader.cls] ?? leader.cls}` : "";
  const headline = `Ton portefeuille ${dir} ${sign}${valAbs} % aujourd'hui${leaderTxt}.`;

  const signals: BriefingSignal[] = [];

  const drift = detectDrift(portfolio.holdings, holdings);
  if (drift) {
    const sense = drift.delta > 0 ? "+" : "−";
    signals.push({
      kind: "drift",
      label: "Allocation",
      detail: `${drift.ticker} dérive de ${sense}${Math.abs(drift.delta).toFixed(1)} pt vs cible`,
      tone: "gold",
      prompt: `Pourquoi mon allocation sur ${drift.ticker} dérive-t-elle de ${sense}${Math.abs(drift.delta).toFixed(1)} points vs ma cible ? Faut-il rééquilibrer ?`,
    });
  }

  const opp = detectOpportunity(holdings);
  if (opp) {
    signals.push({
      kind: "opportunity",
      label: "Opportunité",
      detail: `${opp.ticker} ${opp.returnPct.toFixed(1).replace(".", ",")} % — à surveiller`,
      tone: "rust",
      prompt: `${opp.ticker} affiche ${opp.returnPct.toFixed(1)} %. Est-ce un point d'entrée intéressant ou un signal de sortie ?`,
    });
  }

  const market = detectMarket(returnPct);
  if (market) {
    signals.push({
      kind: "market",
      label: "Marché",
      detail:
        market === "up"
          ? `Journée nettement positive (${sign}${valAbs} %)`
          : `Journée nettement baissière (${sign}${valAbs} %)`,
      tone: market === "up" ? "highlight" : "rust",
      prompt:
        market === "up"
          ? `Pourquoi le marché est-il aussi positif aujourd'hui ? Que dois-je en retenir pour mon portefeuille ?`
          : `Le marché recule fortement aujourd'hui. Que faire pour mon portefeuille ?`,
    });
  }

  // Toujours au moins un signal pour ne pas laisser le briefing nu
  if (signals.length === 0) {
    signals.push({
      kind: "market",
      label: "Tendance",
      detail: "Journée calme — pas de signal fort",
      tone: "neutral",
      prompt: "Fais-moi un point synthétique sur l'état de mon portefeuille.",
    });
  }

  return { headline, signals: signals.slice(0, 3) };
}
