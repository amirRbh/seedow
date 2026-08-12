import type { DiscoverAsset } from "@/lib/discover/types";

export type SortKey = "default" | "esg_desc" | "ter_asc" | "price_asc" | "price_desc" | "name_asc";

export interface ScreenerFilters {
  search: string;
  themes: string[]; // empty = all — causes (cause_tag) portées par l'actif
  categories: string[]; // empty = all
  regions: string[]; // empty = all
  maxRisk: number; // 7 = no cap
  maxTer: number; // 1 = no cap (%)
  minEsg: number; // 0 = no floor
  sort: SortKey;
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  search: "",
  themes: [],
  categories: [],
  regions: [],
  maxRisk: 7,
  maxTer: 1,
  minEsg: 0,
  sort: "default",
};

/**
 * Thématiques de découverte (§15) — le langage d'un débutant qui veut « investir
 * pour le climat ». Ce sont les vraies causes (`cause_tag`) portées par les actifs
 * (`DiscoverAsset.themes`), pas des libellés décoratifs : une thématique qui ne
 * matcherait aucun actif n'a pas sa place ici. Libellés en i18n
 * (`onboarding.steps.values.*`, déjà traduits).
 */
export const THEME_OPTIONS = [
  "climat",
  "biodiversite",
  "humain",
  "egalite",
  "tech",
  "circulaire",
] as const;

const REGION_LABEL: Record<string, string> = {
  world: "Monde",
  europe: "Europe",
  us: "USA",
  em: "Émergents",
  japan: "Japon",
  pacific: "Asie-Pacifique",
  asia: "Asie-Pacifique",
};

/** Normalize `region` (code technique en base) en bucket lisible pour le filtre. */
export function dominantRegion(asset: DiscoverAsset): string {
  const key = asset.region?.toLowerCase() ?? "";
  return REGION_LABEL[key] ?? "Autre";
}

// Doit rester aligné avec REGION_LABEL ci-dessus : une option ici sans entrée
// correspondante dans REGION_LABEL ne matcherait jamais aucun actif (voir
// dominantRegion). "Japon" et "Asie-Pacifique" couvrent les fonds japonais et
// pacifiques ajoutés aux vagues d'élargissement de l'univers.
export const REGION_OPTIONS = [
  "Monde",
  "Europe",
  "USA",
  "Japon",
  "Asie-Pacifique",
  "Émergents",
  "Autre",
];

/**
 * Découverte par intentions (analyse UX §04 — P0) : un débutant pense en
 * intentions (« fort impact », « frais bas »), pas en TER/ESG bruts. Chaque
 * intention n'est qu'un raccourci vers les filtres existants — aucune donnée
 * nouvelle. Les libellés vivent en i18n (`discover.intents.*`).
 */
export interface IntentPreset {
  id: "climate" | "low_fees" | "low_risk" | "europe";
  patch: Partial<ScreenerFilters>;
}

export const INTENT_PRESETS: IntentPreset[] = [
  { id: "climate", patch: { minEsg: 7 } },
  { id: "low_fees", patch: { maxTer: 0.3 } },
  { id: "low_risk", patch: { maxRisk: 3 } },
  { id: "europe", patch: { regions: ["Europe"] } },
];

/** Une intention est active si tous les champs de son `patch` sont déjà posés. */
export function isIntentActive(f: ScreenerFilters, patch: Partial<ScreenerFilters>): boolean {
  return (Object.entries(patch) as [keyof ScreenerFilters, unknown][]).every(([key, value]) => {
    const current = f[key];
    if (Array.isArray(value)) {
      return value.every((v) => Array.isArray(current) && (current as unknown[]).includes(v));
    }
    return current === value;
  });
}

/** Applique une intention, ou la retire (remet ses champs à leur défaut). */
export function toggleIntent(f: ScreenerFilters, patch: Partial<ScreenerFilters>): ScreenerFilters {
  if (isIntentActive(f, patch)) {
    const reset: Partial<ScreenerFilters> = {};
    for (const key of Object.keys(patch) as (keyof ScreenerFilters)[]) {
      (reset as Record<string, unknown>)[key] = DEFAULT_FILTERS[key];
    }
    return { ...f, ...reset };
  }
  return { ...f, ...patch };
}

export function uniqueCategories(assets: DiscoverAsset[]): string[] {
  return Array.from(new Set(assets.map((a) => a.category))).sort();
}

export function applyFilters(assets: DiscoverAsset[], f: ScreenerFilters): DiscoverAsset[] {
  const q = f.search.trim().toLowerCase();
  const filtered = assets.filter((a) => {
    if (q) {
      const hay = `${a.ticker} ${a.name} ${a.issuer ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.themes.length > 0 && !f.themes.some((th) => a.themes.includes(th))) return false;
    if (f.categories.length > 0 && !f.categories.includes(a.category)) return false;
    if (f.regions.length > 0 && !f.regions.includes(dominantRegion(a))) return false;
    if (a.risk_level > f.maxRisk) return false;
    if (a.ter_pct > f.maxTer) return false;
    if (a.overall_esg_score < f.minEsg) return false;
    return true;
  });

  switch (f.sort) {
    case "esg_desc":
      return [...filtered].sort((a, b) => b.overall_esg_score - a.overall_esg_score);
    case "ter_asc":
      return [...filtered].sort((a, b) => a.ter_pct - b.ter_pct);
    case "price_asc":
      return [...filtered].sort(
        (a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity),
      );
    case "price_desc":
      return [...filtered].sort(
        (a, b) => (b.current_price ?? -Infinity) - (a.current_price ?? -Infinity),
      );
    case "name_asc":
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return filtered;
  }
}

export function activeFilterCount(f: ScreenerFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.themes.length > 0) n++;
  if (f.categories.length > 0) n++;
  if (f.regions.length > 0) n++;
  if (f.maxRisk < 7) n++;
  if (f.maxTer < 1) n++;
  if (f.minEsg > 0) n++;
  if (f.sort !== "default") n++;
  return n;
}
