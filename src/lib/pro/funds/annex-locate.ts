/**
 * Repère l'annexe précontractuelle SFDR (RTS 2022/1288, annexes II et III) dans
 * un prospectus, page par page (module pur).
 *
 * Une annexe commence à la page qui porte le titre réglementaire du modèle
 * (« Informations précontractuelles pour les produits financiers visés à
 * l'article 8/9… », « Pre-contractual disclosure for the financial products
 * referred to in Article 8/9… »), ou à défaut l'en-tête fixe du modèle
 * (« Dénomination du produit … Identifiant d'entité juridique »), et s'arrête à la page de sa dernière question
 * (« Où puis-je trouver en ligne davantage d'informations… » / « Where can I find
 * more product specific information online? »), ou juste avant l'annexe suivante.
 *
 * Un prospectus à compartiments contient plusieurs annexes : on ne retient que
 * celle dont les premières pages nomment le fonds. Rien de deviné : sans
 * correspondance nette, le résultat est `ambiguous` et le fonds part en revue.
 */
import { normalizeLabel } from "../extraction/accuracy";

const START =
  /(informations? precontractuelles? pour les produits financiers vises a l ?article [89])|(pre ?contractual disclosure for the financial products referred to in article [89])/;
/** En-tête fixe du modèle, quand le titre réglementaire manque (observé sur 3 annexes réelles). */
const START_HEADER =
  /(denominat?ion du produit( financier)?|product name) .{0,200}(identifiant d ?entite juridique|legal entity identifier)/;
const END =
  /(ou (puis je|peut on) trouver en ligne (davantage|plus) d ?informations)|(where can i find more product specific information online)/;

/** Pages au-delà desquelles une annexe sans fin repérée est jugée suspecte. */
export const MAX_ANNEX_PAGES = 20;

export interface AnnexRange {
  /** Pages physiques, 1 = première page du fichier, bornes incluses. */
  start: number;
  end: number;
  /** Fin repérée par la dernière question du modèle (sinon : borne de repli). */
  endFound: boolean;
}

export type LocateResult =
  | { status: "found"; range: AnnexRange; annexCount: number; nameScore: number | null }
  | { status: "ambiguous"; reason: string; candidates: AnnexRange[] }
  | { status: "not_found"; reason: string };

const norm = (t: string) => normalizeLabel(t.replace(/[’']/g, " "));

export function findAnnexRanges(pages: readonly string[]): AnnexRange[] {
  const n = pages.map(norm);
  const starts = n.flatMap((t, i) => (START.test(t) || START_HEADER.test(t) ? [i] : []));
  return starts.map((s, k) => {
    const limit = Math.min(
      k + 1 < starts.length ? starts[k + 1]! - 1 : pages.length - 1,
      s + MAX_ANNEX_PAGES - 1,
    );
    for (let i = s; i <= limit; i++) {
      if (END.test(n[i]!)) return { start: s + 1, end: i + 1, endFound: true };
    }
    return { start: s + 1, end: limit + 1, endFound: false };
  });
}

/** Part des mots du nom (≥ 3 lettres) présents dans le texte. */
export function nameScore(fundName: string, text: string): number {
  const words = [
    ...new Set(
      norm(fundName)
        .split(" ")
        .filter((w) => w.length >= 3),
    ),
  ];
  if (words.length === 0) return 0;
  const hay = ` ${norm(text)} `;
  return words.filter((w) => hay.includes(` ${w} `)).length / words.length;
}

export function locateAnnex(pages: readonly string[], fundName: string): LocateResult {
  const ranges = findAnnexRanges(pages);
  if (ranges.length === 0) {
    return { status: "not_found", reason: "aucun titre d'annexe précontractuelle SFDR repéré" };
  }
  const scored = ranges.map((r) => ({
    r,
    score: nameScore(fundName, pages.slice(r.start - 1, Math.min(r.end, r.start + 1)).join("\n")),
  }));
  if (ranges.length === 1) {
    const only = scored[0]!;
    if (!only.r.endFound) {
      return { status: "ambiguous", reason: "fin de l'annexe non repérée", candidates: ranges };
    }
    return { status: "found", range: only.r, annexCount: 1, nameScore: only.score };
  }
  const best = [...scored].sort((a, b) => b.score - a.score);
  const [first, second] = best;
  if (first!.score >= 0.8 && first!.score > second!.score && first!.r.endFound) {
    return { status: "found", range: first!.r, annexCount: ranges.length, nameScore: first!.score };
  }
  return {
    status: "ambiguous",
    reason: `${ranges.length} annexes dans le document, aucune ne nomme clairement le fonds`,
    candidates: ranges,
  };
}
