import { MIN_PORTFOLIO_ESG } from "@/lib/portfolio/types";
import { ALIGNED_MIN_ESG } from "@/lib/portfolio/badges";

export type EsgTone = "attention" | "correct" | "excellent";

// Mêmes seuils que le moteur de portefeuille (plancher ESG, badge "aligné"),
// convertis sur l'échelle 0..10 utilisée côté Discover/fiches actif.
const FLOOR_10 = MIN_PORTFOLIO_ESG / 10;
const EXCELLENT_10 = ALIGNED_MIN_ESG;

/** Détermine la bande de couleur d'un score ESG donné sur une échelle 0..10. */
export function esgTone(score10: number): EsgTone {
  if (score10 < FLOOR_10) return "attention";
  if (score10 >= EXCELLENT_10) return "excellent";
  return "correct";
}

/** Score ESG sur 0..100 (composite portefeuille) → même bande, normalisée sur 0..10. */
export function esgToneFrom100(score100: number): EsgTone {
  return esgTone(score100 / 10);
}

interface ToneClasses {
  text: string;
  dot: string;
  chipBg: string;
  chipBorder: string;
}

export const ESG_TONE_CLASSES: Record<EsgTone, ToneClasses> = {
  attention: { text: "text-rust", dot: "bg-rust", chipBg: "bg-rust/5", chipBorder: "border-rust/30" },
  correct: { text: "text-ink", dot: "bg-ink-3", chipBg: "bg-paper-2", chipBorder: "border-paper-3" },
  excellent: { text: "text-gold", dot: "bg-gold", chipBg: "bg-gold/5", chipBorder: "border-gold/30" },
};
