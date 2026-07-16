import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { AssetRow } from "./AssetRow";
import { AssetDetailSheet } from "./AssetDetailSheet";
import {
  DEFAULT_FILTERS,
  REGION_OPTIONS,
  activeFilterCount,
  applyFilters,
  uniqueCategories,
  type ScreenerFilters,
  type SortKey,
} from "@/lib/discover/filters";
import { useAssetUniverse } from "@/hooks/useAssetUniverse";
import type { DiscoverAsset } from "@/lib/discover/types";

export function AssetScreener() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [detail, setDetail] = useState<DiscoverAsset | null>(null);
  const { assets, loading, error } = useAssetUniverse();

  const categories = useMemo(() => uniqueCategories(assets), [assets]);
  const results = useMemo(() => applyFilters(assets, filters), [assets, filters]);
  const activeCount = activeFilterCount(filters);

  const update = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggleInArray = (key: "categories" | "regions", value: string) => {
    setFilters((f) => {
      const arr = f[key];
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "default", label: t("discover.sort.default") },
    { value: "esg_desc", label: t("discover.sort.esg_desc") },
    { value: "ter_asc", label: t("discover.sort.ter_asc") },
    { value: "price_asc", label: t("discover.sort.price_asc") },
    { value: "price_desc", label: t("discover.sort.price_desc") },
    { value: "name_asc", label: t("discover.sort.name_asc") },
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="px-5">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder={t("discover.search_placeholder")}
            className="w-full bg-card border border-paper-3 rounded-full pl-9 pr-4 py-2.5 text-body-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink/40 transition-colors"
          />
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="px-5 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className={`flex items-center gap-1.5 text-caption uppercase tracking-[0.12em] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            panelOpen || activeCount > 0
              ? "bg-ink text-paper border-ink"
              : "bg-card text-ink border-paper-3 hover:border-ink/40"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          {t("discover.filters_btn")}
          {activeCount > 0 && (
            <span className="bg-gold text-ink text-tag font-bold rounded-full px-1.5 leading-none py-0.5 ml-0.5">
              {activeCount}
            </span>
          )}
        </button>

        <div className="relative">
          <select
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value as SortKey)}
            className="appearance-none bg-card border border-paper-3 rounded-full pl-3 pr-7 py-1.5 text-caption uppercase tracking-[0.12em] font-semibold text-ink hover:border-ink/40 transition-colors cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {t("discover.sort.label")} : {o.label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption text-ink-3 font-semibold">
            {t("discover.results_count", { count: results.length })}
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-caption uppercase tracking-[0.12em] font-semibold text-rust hover:text-ink transition-colors"
            >
              {t("discover.reset")}
            </button>
          )}
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-5 overflow-hidden"
          >
            <div className="paper-card p-4 space-y-5">
              {/* Categories */}
              <FilterGroup label={t("discover.filters.category")}>
                {categories.map((c) => (
                  <Chip
                    key={c}
                    active={filters.categories.includes(c)}
                    onClick={() => toggleInArray("categories", c)}
                  >
                    {c}
                  </Chip>
                ))}
              </FilterGroup>

              {/* Regions */}
              <FilterGroup label={t("discover.filters.region")}>
                {REGION_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    active={filters.regions.includes(r)}
                    onClick={() => toggleInArray("regions", r)}
                  >
                    {r}
                  </Chip>
                ))}
              </FilterGroup>

              {/* Risk */}
              <SliderGroup
                label={t("discover.filters.risk")}
                value={filters.maxRisk}
                min={1}
                max={7}
                step={1}
                suffix="/7"
                hint={t("discover.filters.risk_hint", { value: filters.maxRisk })}
                onChange={(v) => update("maxRisk", v)}
              />

              {/* TER */}
              <SliderGroup
                label={t("discover.filters.ter")}
                value={filters.maxTer}
                min={0}
                max={1}
                step={0.05}
                suffix="%"
                hint={t("discover.filters.ter_hint", {
                  value: filters.maxTer.toFixed(2).replace(".", ","),
                })}
                onChange={(v) => update("maxTer", v)}
              />

              {/* ESG */}
              <SliderGroup
                label={t("discover.filters.esg")}
                value={filters.minEsg}
                min={0}
                max={10}
                step={0.5}
                suffix="/10"
                hint={t("discover.filters.esg_hint", {
                  value: filters.minEsg.toFixed(1).replace(".", ","),
                })}
                onChange={(v) => update("minEsg", v)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="px-5 pt-2 space-y-2.5">
        {loading ? (
          <p className="text-label text-ink-3 text-center py-8">{t("discover.loading")}</p>
        ) : error ? (
          <div className="paper-card p-8 text-center">
            <p className="font-value text-xl text-ink">{t("discover.load_error_title")}</p>
            <p className="text-sm text-ink-3 mt-2">{t("discover.load_error_desc")}</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="font-value text-xl text-ink">{t("discover.universe_empty_title")}</p>
            <p className="text-sm text-ink-3 mt-2">{t("discover.universe_empty_desc")}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="font-value text-xl text-ink">{t("discover.empty_title")}</p>
            <p className="text-sm text-ink-3 mt-2">{t("discover.empty_desc")}</p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 text-caption uppercase tracking-[0.14em] font-semibold text-ink underline underline-offset-4 decoration-gold"
            >
              {t("discover.reset")}
            </button>
          </div>
        ) : (
          results.map((asset, i) => (
            <AssetRow key={asset.id} asset={asset} index={i} onOpen={() => setDetail(asset)} />
          ))
        )}
      </div>

      <AssetDetailSheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        asset={detail}
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-tag uppercase tracking-[0.18em] text-gold font-semibold mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-caption font-semibold transition-colors border ${
        active
          ? "bg-ink text-paper border-ink"
          : "bg-paper-2 text-ink-2 border-paper-3 hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  );
}

function SliderGroup({
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-tag uppercase tracking-[0.18em] text-gold font-semibold">{label}</p>
        <span className="font-value text-sm text-ink">
          {step < 1 ? value.toFixed(2).replace(".", ",") : value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
      <p className="text-tag text-ink-3 mt-1.5">{hint}</p>
    </div>
  );
}
