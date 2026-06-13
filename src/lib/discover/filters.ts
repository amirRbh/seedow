import type { MockAsset } from "@/lib/mockGarden";

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

/** Normalize the first geo_breakdown label into a coarse bucket. */
export function dominantRegion(asset: MockAsset): string {
  const raw = asset.geo_breakdown?.[0]?.label?.toLowerCase() ?? "";
  if (!raw) return "Autre";
  if (raw.includes("monde") || raw.includes("international") || raw.includes("multi")) return "Monde";
  if (
    raw.includes("europe") ||
    raw.includes("france") ||
    raw.includes("allemagne") ||
    raw.includes("suisse")
  )
    return "Europe";
  if (raw.includes("usa") || raw.includes("amérique") || raw.includes("us")) return "USA";
  if (
    raw.includes("chine") ||
    raw.includes("inde") ||
    raw.includes("corée") ||
    raw.includes("japon") ||
    raw.includes("asie")
  )
    return "Asie";
  if (raw.includes("émerg") || raw.includes("emerg")) return "Émergents";
  return "Autre";
}

export const REGION_OPTIONS = ["Monde", "Europe", "USA", "Asie", "Émergents", "Autre"];

export function uniqueCategories(assets: MockAsset[]): string[] {
  return Array.from(new Set(assets.map((a) => a.category))).sort();
}

export function applyFilters(assets: MockAsset[], f: ScreenerFilters): MockAsset[] {
  const q = f.search.trim().toLowerCase();
  const filtered = assets.filter((a) => {
    if (q) {
      const hay = `${a.ticker} ${a.name} ${a.issuer ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.categories.length > 0 && !f.categories.includes(a.category)) return false;
    if (f.regions.length > 0 && !f.regions.includes(dominantRegion(a))) return false;
    if (a.risk_level != null && a.risk_level > f.maxRisk) return false;
    if (a.ter_pct != null && a.ter_pct > f.maxTer) return false;
    if (a.overall_esg_score < f.minEsg) return false;
    return true;
  });

  switch (f.sort) {
    case "esg_desc":
      return [...filtered].sort((a, b) => b.overall_esg_score - a.overall_esg_score);
    case "ter_asc":
      return [...filtered].sort((a, b) => (a.ter_pct ?? 99) - (b.ter_pct ?? 99));
    case "price_asc":
      return [...filtered].sort((a, b) => a.current_price - b.current_price);
    case "price_desc":
      return [...filtered].sort((a, b) => b.current_price - a.current_price);
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
