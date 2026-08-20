/**
 * Thème de graphiques — DA V3 (docs/DA-V3.md §Graphiques).
 *
 * Convention Trade Republic, éprouvée : un trait unique de 2,4px à bouts
 * arrondis, un remplissage d'aire très faible, aucune grille, aucun axe
 * visible, et un point terminal marqué. La V2 hachurait les aires et
 * affichait des grilles pointillées — ça lisait « graphe imprimé », pas
 * « produit financier ».
 *
 * La couleur ne porte jamais seule l'information : le signe (+/−) et le
 * libellé accompagnent toujours la série (CLAUDE.md §4).
 */

export const AREA_UP = "seedow-area-up";
export const AREA_DOWN = "seedow-area-down";

const AREAS: [id: string, color: string][] = [
  [AREA_UP, "var(--color-mint)"],
  [AREA_DOWN, "var(--color-alert)"],
];

/**
 * À placer une fois dans chaque graphique (recharts accepte des enfants
 * arbitraires). Référencé via `fill="url(#seedow-area-…)"`.
 */
export function ChartAreaDefs() {
  return (
    <defs>
      {AREAS.map(([id, color]) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.14} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}

/** Axes : masqués par défaut. Quand un axe X est nécessaire, il reste discret. */
export const CHART_AXIS = {
  stroke: "var(--color-ink-3)",
  tickLine: false,
  axisLine: false,
  tick: {
    fill: "var(--color-ink-3)",
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
  },
} as const;

/** Pas de grille — la courbe se lit seule. */
export const CHART_GRID = {
  stroke: "transparent",
  vertical: false,
  horizontal: false,
} as const;

/** Série principale : trait épais, bouts arrondis, point terminal seul. */
export const CHART_LINE = {
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
} as const;

/** Référence (indice, dépôts cumulés) : trait fin pointillé, neutre. */
export const CHART_REFERENCE = {
  stroke: "var(--color-ink-3)",
  strokeWidth: 1.5,
  strokeDasharray: "4 4",
  strokeLinecap: "round",
  dot: false,
} as const;

/** Infobulle : une carte, pas une boîte système. */
export const CHART_TOOLTIP_STYLE = {
  background: "var(--color-paper)",
  border: "none",
  borderRadius: 14,
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink)",
  boxShadow: "var(--shadow-layer)",
  padding: "10px 14px",
} as const;
