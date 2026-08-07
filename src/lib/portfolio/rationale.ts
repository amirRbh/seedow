/**
 * « Pourquoi ? » — explications dérivées des VRAIS choix de l'utilisateur et du
 * rôle réel de chaque classe d'actif. Aucune donnée inventée : on ne fait que
 * reformuler des paramètres existants (causes, exclusions, horizon, risque) et
 * la fonction connue d'une classe d'actif dans un portefeuille.
 *
 * Comme la couche `plain-language`, ces fonctions renvoient des identifiants
 * i18n stables + des variables d'interpolation. Le texte vit en i18n
 * (`portfolio_glance.why.*` et `portfolio_glance.role.*`).
 */

import type { AssetClass, CauseTag, ExclusionTag } from "./types";
import { riskBand } from "./plain-language";

export interface Reason {
  /** Clé i18n complète, ex. "portfolio_glance.why.long_horizon". */
  key: string;
  /** Variables d'interpolation i18n éventuelles. */
  vars?: Record<string, string | number>;
}

/** Grands seaux lisibles pour « Où va votre argent ? ». */
export type MoneyBucket = "actions" | "obligations" | "autres";

/**
 * Regroupe une classe d'actif technique en un seau parlant pour un débutant.
 * Volontairement grossier (3 seaux) : la finesse par classe reste dans le détail.
 */
export function assetBucket(assetClass: AssetClass): MoneyBucket {
  switch (assetClass) {
    case "equity_dev":
    case "equity_em":
    case "thematic":
      return "actions";
    case "green_bond":
    case "social_bond":
    case "sov_bond":
    case "corporate_bond":
      return "obligations";
    default:
      return "autres";
  }
}

/**
 * Rôle d'une classe d'actif dans un portefeuille, en une clé i18n.
 * Sert le « Pourquoi Seedow le propose ? » par ligne.
 */
export function assetRoleKey(assetClass: AssetClass): string {
  const suffix = ((): string => {
    switch (assetClass) {
      case "equity_dev":
        return "equity_dev";
      case "equity_em":
        return "equity_em";
      case "thematic":
        return "thematic";
      case "green_bond":
        return "green_bond";
      case "social_bond":
        return "social_bond";
      case "sov_bond":
        return "sov_bond";
      case "corporate_bond":
        return "corporate_bond";
      case "reit":
        return "reit";
      case "commodity":
        return "commodity";
      case "cash":
        return "cash";
      default:
        return "generic";
    }
  })();
  return `portfolio_glance.role.${suffix}`;
}

export interface HoldingContext {
  asset_class: AssetClass;
  /** Exposition déclarée par cause (0..1). Vide si non renseigné. */
  causeExposure?: Partial<Record<CauseTag, number>>;
}

export interface HoldingRationale {
  /** Rôle principal de la ligne (toujours présent). */
  roleKey: string;
  /** Cause active de l'utilisateur à laquelle cette ligne répond réellement. */
  matchedCause: CauseTag | null;
}

/** Seuil minimal d'exposition pour affirmer qu'une ligne « répond » à une cause. */
const CAUSE_MATCH_MIN = 0.15;

/**
 * « Pourquoi Seedow propose cette ligne ? » — rôle de la classe + éventuel
 * lien avec une cause que l'utilisateur a réellement choisie. On ne rattache
 * une cause que si l'actif y est réellement exposé (donnée `cause_exposure`).
 */
export function explainHolding(ctx: HoldingContext, activeCauses: CauseTag[]): HoldingRationale {
  let matchedCause: CauseTag | null = null;
  let best = CAUSE_MATCH_MIN;
  const exposure = ctx.causeExposure ?? {};
  for (const cause of activeCauses) {
    const e = exposure[cause];
    if (typeof e === "number" && e >= best) {
      best = e;
      matchedCause = cause;
    }
  }
  return { roleKey: assetRoleKey(ctx.asset_class), matchedCause };
}

export interface PortfolioRationaleInput {
  causes: CauseTag[];
  exclusions: ExclusionTag[];
  horizon_years: number;
  risk_target: number;
  /** Volatilité réelle si disponible ; sinon on retombe sur `risk_target`. */
  metrics: { volatility?: number } | null | undefined;
}

/**
 * « Pourquoi cette proposition ? » au niveau du portefeuille.
 * Reformule les réponses de l'utilisateur — horizon, tolérance au risque,
 * nombre de causes, nombre d'exclusions — en 1 à 4 raisons lisibles.
 */
export function explainPortfolio(input: PortfolioRationaleInput): Reason[] {
  const reasons: Reason[] = [];

  // Horizon → court / moyen / long terme.
  const h = input.horizon_years;
  if (h >= 15) reasons.push({ key: "portfolio_glance.why.horizon_long", vars: { years: h } });
  else if (h >= 6) reasons.push({ key: "portfolio_glance.why.horizon_medium", vars: { years: h } });
  else reasons.push({ key: "portfolio_glance.why.horizon_short", vars: { years: h } });

  // Tolérance au risque — dérivée de la volatilité réelle si dispo, sinon de la cible.
  const vol = input.metrics?.volatility ?? input.risk_target;
  const { level } = riskBand(vol);
  reasons.push({ key: `portfolio_glance.why.risk_${level}` });

  // Causes choisies.
  if (input.causes.length > 0) {
    reasons.push({ key: "portfolio_glance.why.causes", vars: { count: input.causes.length } });
  }

  // Exclusions demandées.
  if (input.exclusions.length > 0) {
    reasons.push({
      key: "portfolio_glance.why.exclusions",
      vars: { count: input.exclusions.length },
    });
  }

  return reasons;
}
