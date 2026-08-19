/**
 * Thème de graphiques — DA V2 « Preuve » (docs/DA-V2-PREUVE.md §4.5).
 *
 * Règles :
 *  — traits 1px, bouts droits, pas de point sauf le dernier ;
 *  — AUCUN aplat, AUCUN dégradé : les remplissages sont des hachures SVG,
 *    lisibles en daltonisme et à l'impression (la couleur ne porte jamais
 *    seule l'information, CLAUDE.md §4) ;
 *  — grille pointillée horizontale uniquement, axes en mono 10px ;
 *  — tout graphique porte son crochet de provenance (composant `Provenance`).
 */

export const HATCH_INK = "seedow-hatch-ink";
export const HATCH_MINT = "seedow-hatch-mint";
export const HATCH_ICE = "seedow-hatch-ice";
export const HATCH_ALERT = "seedow-hatch-alert";

const PATTERNS: [id: string, cssVar: string][] = [
  [HATCH_INK, "var(--color-ink)"],
  [HATCH_MINT, "var(--color-mint)"],
  [HATCH_ICE, "var(--color-ice)"],
  [HATCH_ALERT, "var(--color-alert)"],
];

/**
 * À placer une fois dans chaque graphique (recharts accepte des enfants
 * arbitraires). Les motifs sont référencés via `fill="url(#seedow-hatch-…)"`.
 */
export function ChartHatchDefs() {
  return (
    <defs>
      {PATTERNS.map(([id, color]) => (
        <pattern
          key={id}
          id={id}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1" opacity="0.5" />
        </pattern>
      ))}
    </defs>
  );
}

/** Axes : mono 10px, encre pâle, aucun titre d'axe, aucune ligne d'axe. */
export const CHART_AXIS = {
  stroke: "var(--color-ink-3)",
  tickLine: false,
  axisLine: false,
  tick: {
    fill: "var(--color-ink-3)",
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.04em",
  },
} as const;

/** Grille : pointillés 1px, horizontaux uniquement. */
export const CHART_GRID = {
  stroke: "var(--color-paper-3)",
  strokeDasharray: "1 4",
  vertical: false,
} as const;

/** Trait de série : 1px, bouts droits, pas de point intermédiaire. */
export const CHART_LINE = {
  strokeWidth: 1.25,
  strokeLinecap: "butt",
  dot: false,
  activeDot: { r: 2.5, strokeWidth: 0 },
} as const;

/** Référence (ETF MSCI World, dépôts cumulés…) : encre pointillée. */
export const CHART_REFERENCE = {
  stroke: "var(--color-ink-3)",
  strokeWidth: 1,
  strokeDasharray: "3 3",
  dot: false,
} as const;

/** Infobulle : un feuillet, pas une carte flottante arrondie. */
export const CHART_TOOLTIP_STYLE = {
  background: "var(--color-paper)",
  border: "1px solid var(--color-ink)",
  borderRadius: 2,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-ink)",
  boxShadow: "none",
  padding: "8px 10px",
} as const;
