import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ExposureRow {
  label: string;
  weightPct: number;
}

/**
 * Barres d'exposition. La part NON VENTILÉE est toujours affichée, hachurée,
 * en dernière ligne : une répartition partielle ne se lit jamais comme
 * complète. Le pourcentage est écrit à côté de chaque barre.
 */
export function ExposureBars({
  rows,
  unclassifiedPct = 0,
  max = 8,
  formatLabel = (l) => l,
  tone = "mint",
  highlight,
}: {
  rows: ExposureRow[];
  unclassifiedPct?: number;
  max?: number;
  formatLabel?: (label: string) => string;
  tone?: "mint" | "ice" | "volt";
  /** Libellé source mis en évidence (ex. « Energy »). */
  highlight?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const shown = rows.slice(0, max);
  const rest = rows.slice(max).reduce((s, r) => s + r.weightPct, 0);
  const scale = Math.max(...shown.map((r) => r.weightPct), unclassifiedPct, rest, 1);
  const bar = { mint: "bg-mint", ice: "bg-ice", volt: "bg-volt" }[tone];

  const line = (key: string, label: string, pct: number, cls: string, emphasis = false) => (
    <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
      <span className={cn("truncate text-label", emphasis ? "font-bold text-ink" : "text-ink-2")}>
        {label}
      </span>
      <span className="font-value text-label tabular-nums text-ink">
        {formatPercent(pct / 100, lang, 1)}
      </span>
      <span aria-hidden className="col-span-2 h-1.5 overflow-hidden rounded-full bg-paper-inset">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-700 ease-brand motion-reduce:transition-none",
            cls,
          )}
          style={{ width: `${Math.max(0.5, (pct / scale) * 100)}%` }}
        />
      </span>
    </li>
  );

  return (
    <ul className="flex flex-col gap-3">
      {shown.map((r) =>
        // Mise en évidence NEUTRE (encre + gras) : une exposition sectorielle est
        // une information, pas un jugement — --alert reste réservé au négatif réel.
        line(
          r.label,
          formatLabel(r.label),
          r.weightPct,
          highlight === r.label ? "bg-ink" : bar,
          highlight === r.label,
        ),
      )}
      {rest > 0.05 &&
        line(
          "__rest",
          t("fin.exposure.other_buckets", { count: rows.length - max }),
          rest,
          "bg-ink-3",
        )}
      {unclassifiedPct > 0.05 &&
        line(
          "__unclassified",
          t("fin.exposure.unclassified"),
          unclassifiedPct,
          "bg-[repeating-linear-gradient(135deg,var(--color-ink-3)_0_4px,transparent_4px_8px)]",
        )}
    </ul>
  );
}
