import type { DiscoverAsset } from "@/lib/discover/types";

export type SortKey = "default" | "esg_desc" | "ter_asc" | "price_asc" | "price_desc" | "name_asc";

export interface ScreenerFilters {
  search: string;
  categories: string[]; // empty = all
  regions: string[]; // empty = all
  maxRisk: number; // 7 = no cap
  maxTer: number; // 1 = no cap (%)
  minEsg: number; // 0 = no floor
  sort: SortKey;
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  search: "",
  categories: [],
  regions: [],
  maxRisk: 7,
  maxTer: 1,
  minEsg: 0,
  sort: "default",
};

const REGION_LABEL: Record<string, string> = {
  world: "Monde",
  europe: "Europe",
  us: "USA",
  em: "Émergents",
};

/** Normalize `region` (code technique en base) en bucket lisible pour le filtre. */
export function dominantRegion(asset: DiscoverAsset): string {
  const key = asset.region?.toLowerCase() ?? "";
  return REGION_LABEL[key] ?? "Autre";
}

export const REGION_OPTIONS = ["Monde", "Europe", "USA", "Asie", "Émergents", "Autre"];

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
  if (f.categories.length > 0) n++;
  if (f.regions.length > 0) n++;
  if (f.maxRisk < 7) n++;
  if (f.maxTer < 1) n++;
  if (f.minEsg > 0) n++;
  if (f.sort !== "default") n++;
  return n;
}
