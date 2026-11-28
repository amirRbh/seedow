/**
 * Frais courants lus dans le KID / DIC PRIIPs, avec leur preuve (module pur).
 *
 * La lecture du chiffre reprend le parseur déterministe existant
 * (`lib/esg/kid-parser`, calibré sur des KID GECO réels) — aucune IA. On y ajoute
 * la page et la ligne citée : une valeur sans page retrouvée part en revue.
 */
import { parseKidOngoingCharges } from "../../esg/kid-parser";

export interface KidCosts {
  /** En % de l'actif par an (1,2 = 1,2 %), ou null si non lu. */
  ongoing_charges_pct: number | null;
  page: number | null;
  quote: string | null;
  status: "auto" | "needs_review" | "not_found";
}

const LABEL =
  /frais courants|frais de gestion et autres frais|ongoing charges|management fees and other/i;

export function kidCosts(pages: readonly string[]): KidCosts {
  const whole = parseKidOngoingCharges(pages.join("\n"));
  if (whole == null) {
    return { ongoing_charges_pct: null, page: null, quote: null, status: "not_found" };
  }
  const pct = Math.round(whole * 100 * 100) / 100;
  for (let i = 0; i < pages.length; i++) {
    const v = parseKidOngoingCharges(pages[i]!);
    if (v == null || Math.abs(v - whole) > 1e-9) continue;
    const lines = pages[i]!.split("\n");
    const at = lines.findIndex((l) => LABEL.test(l));
    const quote =
      at >= 0
        ? lines
            .slice(at, at + 3)
            .map((l) => l.trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .slice(0, 300)
        : null;
    return {
      ongoing_charges_pct: pct,
      page: i + 1,
      quote,
      status: quote ? "auto" : "needs_review",
    };
  }
  // Lu sur le document entier seulement (valeur à cheval sur deux pages) : à revoir.
  return { ongoing_charges_pct: pct, page: null, quote: null, status: "needs_review" };
}
