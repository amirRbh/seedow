/**
 * Contrôles qualité des holdings AVANT persistance (N2, item 5).
 *
 * Regroupe en un seul rapport auditable les garde-fous exigés :
 *   - poids impossibles (< 0 ou > 100) ;
 *   - somme des poids hors tolérance (couverture partielle tolérée, > 100 rejetée) ;
 *   - ISIN présent mais incohérent (échoue la validation clé/format) ;
 *   - doublons (même titre deux fois dans le même fonds à la même date) ;
 *   - date de référence (`as_of`) manquante ;
 *   - source manquante (ni source_id ni source_url).
 *
 * Fonction PURE, sans I/O. Ne corrige rien et n'invente rien : elle constate.
 * Le pire statut trouvé (`valid` < `review_required` < `rejected`) décide si le
 * lot est publiable — l'orchestrateur ne persiste pas un lot `rejected`.
 */

import {
  validateWeight,
  validateHoldingsSum,
  validateReferenceDate,
  worstOf,
  type ValidationResult,
  type ValidationStatus,
} from "./validation";
import { isValidIsin } from "./isin";
import type { ParsedHolding } from "./holdings";

export interface HoldingsQualityIssue {
  kind:
    | "impossible_weight"
    | "sum_out_of_range"
    | "incoherent_isin"
    | "duplicate_security"
    | "missing_as_of"
    | "missing_source";
  detail: string;
  /** Nom du titre concerné quand la ligne est identifiable. */
  security?: string;
}

export interface HoldingsQualityReport {
  status: ValidationStatus;
  issues: HoldingsQualityIssue[];
  holdingsCount: number;
  /** Somme des poids renseignés (%), pour le journal d'audit. */
  weightSumPct: number;
  /** Part des lignes portant un ISIN valide (0..1). */
  isinCoveredShare: number;
}

export interface HoldingsQualityInput {
  asOf: string | null;
  holdings: ParsedHolding[];
  sourceId: string | null;
  sourceUrl: string | null;
  /** Tolérance sur l'écart de la somme à 100 % (défaut 2 points). */
  sumTolerancePct?: number;
}

export function runHoldingsQualityChecks(input: HoldingsQualityInput): HoldingsQualityReport {
  const { holdings, asOf, sourceId, sourceUrl, sumTolerancePct = 2 } = input;
  const issues: HoldingsQualityIssue[] = [];
  const results: ValidationResult[] = [];

  // 1) Date de référence : obligatoire (§12) et pas dans le futur / trop vieille.
  if (!asOf) {
    issues.push({ kind: "missing_as_of", detail: "Aucune date de référence (as_of) — non publiable." });
    results.push({ status: "rejected", reason: "as_of manquant" });
  } else {
    const dateRes = validateReferenceDate(asOf);
    if (dateRes.status !== "valid") {
      issues.push({ kind: "missing_as_of", detail: `Date de référence : ${dateRes.reason ?? ""}`.trim() });
      results.push(dateRes);
    }
  }

  // 2) Source obligatoire (traçabilité §1.2 : jamais un chiffre sans origine).
  if (!sourceId && !sourceUrl) {
    issues.push({ kind: "missing_source", detail: "Ni source_id ni source_url — traçabilité impossible." });
    results.push({ status: "rejected", reason: "source manquante" });
  }

  // 3) Poids ligne à ligne + doublons + ISIN.
  const seen = new Set<string>();
  let weightSum = 0;
  let isinValid = 0;
  for (const h of holdings) {
    const wr = validateWeight(h.weightPct);
    if (wr.status !== "valid") {
      issues.push({
        kind: "impossible_weight",
        detail: `Poids invalide (${h.weightPct}) : ${wr.reason ?? ""}`.trim(),
        security: h.name,
      });
    }
    results.push(wr);
    if (typeof h.weightPct === "number" && Number.isFinite(h.weightPct)) weightSum += h.weightPct;

    const dupKey = (h.isin?.trim() || h.name.trim().toLowerCase()).toString();
    if (seen.has(dupKey)) {
      issues.push({ kind: "duplicate_security", detail: `Titre en double dans le fonds`, security: h.name });
      results.push({ status: "review_required", reason: "doublon" });
    } else {
      seen.add(dupKey);
    }

    if (h.isin) {
      if (isValidIsin(h.isin)) isinValid++;
      else {
        issues.push({ kind: "incoherent_isin", detail: `ISIN incohérent : ${h.isin}`, security: h.name });
        results.push({ status: "review_required", reason: "isin incohérent" });
      }
    }
  }

  // 4) Somme globale (couverture partielle OK, dépassement rejeté).
  const sumRes = validateHoldingsSum(
    holdings.map((h) => h.weightPct ?? 0),
    sumTolerancePct,
  );
  if (sumRes.status !== "valid") {
    issues.push({ kind: "sum_out_of_range", detail: `Somme des poids ${weightSum.toFixed(2)}% : ${sumRes.reason ?? ""}`.trim() });
  }
  results.push(sumRes);

  const status = results.length > 0 ? worstOf(results).status : "valid";
  return {
    status,
    issues,
    holdingsCount: holdings.length,
    weightSumPct: weightSum,
    isinCoveredShare: holdings.length > 0 ? isinValid / holdings.length : 0,
  };
}
