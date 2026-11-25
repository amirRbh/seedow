/**
 * Libellés partagés par le rapport PDF et l'interface `/pro` (module léger :
 * l'interface ne doit pas embarquer pdf-lib).
 */
import type { AlertCode, AxisResult, AxisStatus, Verdict } from "./matching/types";

export const VERDICT_LABELS: Record<Verdict, string> = {
  ADEQUAT: "Adéquat",
  PARTIEL: "Partiel",
  NON_ADEQUAT: "Non adéquat",
  A_VERIFIER: "À vérifier",
  NEUTRE: "Neutre (aucune préférence)",
};
export const AXIS_STATUS_LABELS: Record<AxisStatus, string> = {
  PASS: "conforme",
  FAIL: "non conforme",
  DONNEE_MANQUANTE: "donnée manquante",
  A_CONFIRMER: "à confirmer",
};
export const AXIS_TITLES: Record<AxisResult["axis"], string> = {
  a: "(a) Alignement sur la taxinomie de l'UE",
  b: "(b) Investissements durables (art. 2(17) SFDR)",
  c: "(c) Principales incidences négatives (PAI)",
};
export const ALERT_LABELS: Record<AlertCode, string> = {
  NOM_ESG_ALLOCATION_FAIBLE: "Nom ESG, #1 < 80 %",
  NOM_DURABLE_SANS_ID: "Nom « durable », 0 % durable",
  NOM_EXCLUSIONS_NON_MENTIONNEES: "Nom ESG, exclusions PAB/CTB non mentionnées",
  ART8_ZERO_INVEST_DURABLE: "Art. 8 sans part durable",
  TAXO_ZERO: "Taxinomie 0 %",
  PAI_NON: "PAI : non",
  DOC_ANCIEN: "Annexe > 12 mois",
  NON_VALIDE: "Données non revues",
};

export const LEGAL_NOTICE =
  "Outil d'aide à la documentation. Ne constitue pas un conseil en investissement. L'appréciation de l'adéquation relève de la responsabilité du CIF.";

/** Pourcentage lisible, « — » si la donnée est absente. */
export function pctOrDash(v: number | null): string {
  return v === null ? "—" : `${String(Math.round(v * 100) / 100).replace(".", ",")} %`;
}
