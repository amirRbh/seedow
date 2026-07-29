/**
 * Narratif d'impact — traduit la composition RÉELLE d'un portefeuille en un
 * récit lisible et émotionnel, SANS jamais fabriquer un chiffre (CLAUDE.md §1.2,
 * §1.3, §5.4). Deux briques, toutes deux PURES et testables isolément :
 *
 *  1. `buildConvictions` — « Où va ton argent » : chaque conviction (thème) avec
 *     son poids réel et sa vitalité (score ESG pondéré réel des lignes exposées).
 *     C'est le « je peux voir précisément comment » : rien d'inventé, la part non
 *     classée est représentée honnêtement.
 *
 *  2. `buildImpactSignal` — LE fait le plus porteur de sens à mettre en avant
 *     (dashboard + hero). On sélectionne parmi des données déjà honnêtes
 *     (intensité WACI vs indice sourcé, empreinte mesurée, score ESG) — jamais une
 *     valeur nouvelle. Chaque signal porte sa source (et sa date si externe).
 *
 * Aucune dépendance UI/DB. Le texte affiché vit dans l'i18n ; ce module ne produit
 * que des identifiants de clés + paramètres, pour rester traduisible.
 */
import type { CauseTag } from "@/lib/portfolio/types";
import type { ThemeBreakdown } from "@/lib/impact/themeBreakdown";
import type { PortfolioImpactView } from "@/lib/impact/portfolioImpact";
import { ACWI_WACI_SOURCE, ACWI_WACI_ASOF } from "@/lib/esg/benchmark";

/* ─────────────────────────── Convictions ─────────────────────────── */

/**
 * Palier de vitalité d'une conviction, dérivé du score ESG pondéré RÉEL des
 * lignes qui la portent. Le palier est doublé d'un libellé (jamais porté par la
 * seule couleur, §4).
 * - solid   : ESG moyen ≥ 66/100
 * - growing : ≥ 40/100
 * - watch   : < 40/100
 * - unknown : aucune donnée ESG exploitable sur ce thème
 */
export type ConvictionTier = "solid" | "growing" | "watch" | "unknown";

export function convictionTier(vitality: number | null): ConvictionTier {
  if (vitality == null || !Number.isFinite(vitality)) return "unknown";
  const v = Math.max(0, Math.min(1, vitality));
  if (v >= 0.66) return "solid";
  if (v >= 0.4) return "growing";
  return "watch";
}

export interface Conviction {
  cause: CauseTag;
  /** Poids du thème dans le portefeuille, en % (0..100). */
  pct: number;
  /** Vitalité (0..1) = score ESG pondéré des lignes exposées, ou null si inconnu. */
  vitality: number | null;
  tier: ConvictionTier;
  /** Nombre de lignes du portefeuille réellement exposées à ce thème. */
  holdingsCount: number;
}

export interface ConvictionsModel {
  /** Convictions triées desc par poids. */
  convictions: Conviction[];
  /** Part du portefeuille non rattachable à un thème (0..100). */
  unclassifiedPct: number;
  /** Conviction dominante, ou null si le portefeuille n'a aucun thème. */
  topCause: CauseTag | null;
  /** Nombre de convictions représentées. */
  themesCount: number;
}

export interface ConvictionHolding {
  allocationPct: number; // 0..100
  esgScore: number; // 0..100
  causeExposure: Partial<Record<CauseTag, number>>;
}

/**
 * Vitalité d'une cause : moyenne du score ESG des lignes exposées, pondérée par
 * (poids d'allocation × intensité de la ligne sur cette cause). Retourne null si
 * aucune donnée exploitable — on préfère « inconnu » à un 0 trompeur.
 */
function causeVitality(holdings: ConvictionHolding[], cause: CauseTag): number | null {
  let wSum = 0;
  let esgSum = 0;
  for (const h of holdings) {
    const alloc = Number.isFinite(h.allocationPct) ? Math.max(0, h.allocationPct) : 0;
    const exp = h.causeExposure?.[cause];
    if (alloc <= 0 || typeof exp !== "number" || !Number.isFinite(exp) || exp <= 0) continue;
    const esg = Number.isFinite(h.esgScore) ? Math.max(0, Math.min(100, h.esgScore)) : 0;
    const w = alloc * exp;
    wSum += w;
    esgSum += w * esg;
  }
  if (wSum <= 0) return null;
  return Math.max(0, Math.min(1, esgSum / wSum / 100));
}

/** Nombre de lignes réellement exposées à une cause (exposition > 0, poids > 0). */
function causeHoldingsCount(holdings: ConvictionHolding[], cause: CauseTag): number {
  let n = 0;
  for (const h of holdings) {
    const alloc = Number.isFinite(h.allocationPct) ? Math.max(0, h.allocationPct) : 0;
    const exp = h.causeExposure?.[cause];
    if (alloc > 0 && typeof exp === "number" && Number.isFinite(exp) && exp > 0) n++;
  }
  return n;
}

/**
 * Construit le modèle « convictions » d'un portefeuille à partir de sa
 * répartition par thème (déjà agrégée honnêtement) et de ses lignes.
 */
export function buildConvictions(
  holdings: ConvictionHolding[],
  breakdown: ThemeBreakdown,
): ConvictionsModel {
  const convictions: Conviction[] = breakdown.slices.map((s) => {
    const vitality = causeVitality(holdings, s.cause);
    return {
      cause: s.cause,
      pct: s.pct,
      vitality,
      tier: convictionTier(vitality),
      holdingsCount: causeHoldingsCount(holdings, s.cause),
    };
  });

  return {
    convictions,
    unclassifiedPct: Math.max(0, breakdown.unclassifiedPct),
    topCause: convictions[0]?.cause ?? null,
    themesCount: convictions.length,
  };
}

/* ──────────────────────────── Signal ──────────────────────────── */

export type SignalTone = "positive" | "caution" | "neutral";

/**
 * Le fait d'impact le plus porteur de sens à mettre en avant. `kind` documente
 * d'où vient le signal (pour le rendu) ; `tone` code la charge (mint/alert/neutre),
 * toujours doublé d'un libellé côté UI (§4).
 */
export interface ImpactSignal {
  kind: "cleaner" | "dirtier" | "footprint" | "esg";
  tone: SignalTone;
  headlineKey: string;
  params: Record<string, string | number>;
  /** Source vérifiable du fait. */
  source: string;
  /** Date « as of » de la source externe, si applicable. */
  asOf?: string | number;
}

/**
 * Sélectionne LE signal à afficher, par ordre de force et de disponibilité :
 *  1. Intensité carbone nettement plus faible qu'un ETF Monde (bonne nouvelle réelle).
 *  2. Intensité plus forte (mauvaise nouvelle, dite calmement — §1.7).
 *  3. Empreinte carbone mesurée, rendue tangible (km voiture), si couverture suffisante.
 *  4. Repli honnête : score d'impact ESG /100 (toujours réel).
 *
 * Ne renvoie jamais un chiffre nouveau : tout provient de `PortfolioImpactView`.
 */
export function buildImpactSignal(impact: PortfolioImpactView): ImpactSignal {
  const intensity = impact.intensity;
  if (intensity && intensity.vsBenchmarkDeltaPct != null) {
    const pct = Math.round(Math.abs(intensity.vsBenchmarkDeltaPct) * 100);
    if (intensity.cleaner && pct > 0) {
      return {
        kind: "cleaner",
        tone: "positive",
        headlineKey: "impact_signal.cleaner",
        params: { pct },
        source: ACWI_WACI_SOURCE,
        asOf: ACWI_WACI_ASOF,
      };
    }
    if (!intensity.cleaner && pct > 0) {
      return {
        kind: "dirtier",
        tone: "caution",
        headlineKey: "impact_signal.dirtier",
        params: { pct },
        source: ACWI_WACI_SOURCE,
        asOf: ACWI_WACI_ASOF,
      };
    }
  }

  if (impact.measured && impact.presentation.show) {
    const carEquiv = impact.presentation.equivalences.find((e) => e.factorId === "car_km");
    if (carEquiv) {
      return {
        kind: "footprint",
        tone: "neutral",
        headlineKey: "impact_signal.footprint",
        params: {
          km: Math.round(Math.abs(carEquiv.value)),
          coverage: Math.round(impact.coverage * 100),
        },
        source: carEquiv.source,
        asOf: carEquiv.asOf,
      };
    }
  }

  return {
    kind: "esg",
    tone: "neutral",
    headlineKey: "impact_signal.esg",
    params: { score: Math.round(Math.max(0, Math.min(100, impact.esgScore))) },
    source: "Moteur Seedow",
  };
}
