/**
 * Libellés lisibles du matching (bandes, dimensions, motifs d'absence).
 *
 * Chaque libellé a une clé i18n ET un repli FR (les clés ne sont pas encore dans
 * les locales — elles y passeront via update_locales.ts au moment voulu). Le repli
 * n'est jamais du jargon : « correspondance forte », « frais », « climat »… (§20).
 * Pur, aucune dépendance UI.
 */
import type { MatchDimension } from "@/lib/preferences/dimensions";
import type { MatchBand, UncoveredReason } from "./types";

export interface LabelEntry {
  i18nKey: string;
  fr: string;
}

export const BAND_LABELS: Record<MatchBand, LabelEntry> = {
  strong: { i18nKey: "match.band.strong", fr: "Correspondance forte" },
  good: { i18nKey: "match.band.good", fr: "Bonne correspondance" },
  partial: { i18nKey: "match.band.partial", fr: "Correspondance partielle" },
  weak: { i18nKey: "match.band.weak", fr: "Correspondance faible" },
  not_scored: { i18nKey: "match.band.not_scored", fr: "Non évaluable" },
};

export const DIMENSION_LABELS: Record<MatchDimension, LabelEntry> = {
  values_alignment: { i18nKey: "preferences.dimensions.values_alignment.label", fr: "Tes valeurs" },
  harm_avoidance: {
    i18nKey: "preferences.dimensions.harm_avoidance.label",
    fr: "Ce que tu refuses",
  },
  climate: { i18nKey: "preferences.dimensions.climate.label", fr: "Climat" },
  esg_quality: { i18nKey: "preferences.dimensions.esg_quality.label", fr: "Qualité ESG" },
  controversy: { i18nKey: "preferences.dimensions.controversy.label", fr: "Controverses" },
  cost: { i18nKey: "preferences.dimensions.cost.label", fr: "Frais" },
  risk_fit: { i18nKey: "preferences.dimensions.risk_fit.label", fr: "Risque" },
  diversification: {
    i18nKey: "preferences.dimensions.diversification.label",
    fr: "Diversification",
  },
  disclosure: { i18nKey: "preferences.dimensions.disclosure.label", fr: "Transparence" },
};

export const UNCOVERED_REASON_LABELS: Record<UncoveredReason, LabelEntry> = {
  no_data: { i18nKey: "match.uncovered.no_data", fr: "donnée non disponible" },
  requires_holdings: {
    i18nKey: "match.uncovered.requires_holdings",
    fr: "dépend de la composition (bientôt)",
  },
  requires_collection: {
    i18nKey: "match.uncovered.requires_collection",
    fr: "se juge sur une collection",
  },
  requires_user_context: {
    i18nKey: "match.uncovered.requires_user_context",
    fr: "précise ta tolérance au risque",
  },
  no_spec: { i18nKey: "match.uncovered.no_spec", fr: "non évaluée" },
};

/** Satisfaction 0..1 → mot qualitatif (le sens ne repose jamais sur la couleur seule). */
export function satisfactionWord(s: number): LabelEntry {
  if (s >= 0.8) return { i18nKey: "match.sat.strong", fr: "fort" };
  if (s >= 0.6) return { i18nKey: "match.sat.good", fr: "bon" };
  if (s >= 0.4) return { i18nKey: "match.sat.ok", fr: "moyen" };
  return { i18nKey: "match.sat.low", fr: "faible" };
}
