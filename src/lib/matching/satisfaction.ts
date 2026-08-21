/**
 * Fonctions de SATISFACTION du moteur de matching (pivot PIU, §6.3).
 *
 * Une satisfaction ∈ [0,1] traduit une valeur MESURÉE (fournie et sourcée par
 * Seedow) en « à quel point cette valeur répond à ce que l'utilisateur veut sur
 * cette dimension ». C'est l'étape « traduire » du §6.1 — décidée par une
 * méthodologie PUBLIÉE et VERSIONNÉE, jamais improvisée. Ce fichier ne contient
 * que les quatre FORMES ; les seuils (et leur provenance) vivent dans
 * `dimensions.ts`, calibrables sur la distribution réelle de l'univers.
 *
 * Aucune de ces fonctions ne pondère : la pondération appartient à l'utilisateur
 * (agrégation, `aggregate.ts`). Fonctions pures, robustes aux entrées non finies.
 */

/** Borne dans [0,1] ; toute entrée non finie → 0 (jamais de NaN qui se propage). */
export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Forme 1 — monotone DÉCROISSANTE bornée. « Moins, c'est mieux » (exposition
 * fossile, WACI, frais). sat = 1 quand `x ≤ good`, 0 quand `x ≥ bad`, linéaire
 * entre les deux. Si `good ≥ bad` (bornes dégénérées), renvoie un pas net.
 */
export function satMonotoneDecreasing(x: number, good: number, bad: number): number {
  if (!Number.isFinite(x)) return 0;
  if (!(bad > good)) return x <= good ? 1 : 0;
  return clamp01((bad - x) / (bad - good));
}

/**
 * Forme 2 — monotone CROISSANTE bornée. « Plus, c'est mieux » (exposition à
 * l'activité durable, score de pilier). sat = 0 quand `x ≤ bad`, 1 quand
 * `x ≥ good`, linéaire entre.
 */
export function satMonotoneIncreasing(x: number, bad: number, good: number): number {
  if (!Number.isFinite(x)) return 0;
  if (!(good > bad)) return x >= good ? 1 : 0;
  return clamp01((x - bad) / (good - bad));
}

/**
 * Forme 3 — CIBLE avec tolérance (gaussienne). Un actif trop PEU risqué pour un
 * profil dynamique n'est pas « parfait » non plus — le monotone serait faux ici
 * (§6.3). sat = exp(−((x − target)/tolerance)²), maximale à `x = target`.
 * Tolérance ≤ 0 → pas net (1 seulement à la cible exacte).
 */
export function satTarget(x: number, target: number, tolerance: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(target)) return 0;
  if (!(tolerance > 0)) return x === target ? 1 : 0;
  const z = (x - target) / tolerance;
  return clamp01(Math.exp(-(z * z)));
}

/**
 * Forme 4 — ORDINALE. Donnée catégorielle (controverses : none/low/moderate/
 * severe) mappée vers une satisfaction documentée. AUCUNE fausse continuité
 * (§6.3) : une clé absente du mapping renvoie null (dimension non évaluable),
 * pas une valeur inventée.
 */
export function satOrdinal(
  key: string | null | undefined,
  mapping: Readonly<Record<string, number>>,
): number | null {
  if (key == null) return null;
  const v = mapping[key];
  return typeof v === "number" ? clamp01(v) : null;
}
