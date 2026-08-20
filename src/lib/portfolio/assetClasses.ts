/**
 * Palette catégorielle des classes d'actifs — une classe = une teinte de la
 * planche de marque (les données catégorielles sont le seul cas où l'on
 * mélange les accents, cf. CLAUDE.md §4).
 *
 * Source unique : `AllocationBreakdown` et le nœud « Ce que je finance » du Fil
 * partagent la même correspondance, sinon la même classe change de couleur d'un
 * écran à l'autre. La couleur ne porte jamais l'information seule : chaque
 * usage est doublé d'un intitulé texte.
 */
export const ASSET_CLASS_COLOR: Record<string, string> = {
  equity_dev: "var(--mint)",
  equity_em: "var(--ice)",
  thematic: "var(--volt)",
  green_bond: "var(--highlight-2)",
  social_bond: "var(--sky)",
  sov_bond: "var(--ink-2)",
  corporate_bond: "var(--solar-ink)",
  reit: "var(--solar)",
  commodity: "var(--alert)",
  cash: "var(--paper-3)",
  other: "var(--paper-3)",
};

/** Teinte d'une classe d'actif, avec repli pour une classe inconnue. */
export function assetClassColor(assetClass: string, fallback = "var(--paper-3)"): string {
  return ASSET_CLASS_COLOR[assetClass] ?? fallback;
}
