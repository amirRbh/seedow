import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatCurrency, formatPercent } from "@/lib/format";
import { sectorLabel } from "@/lib/demo/labels";
import type { LookThroughHolding } from "@/lib/portfolio/exposure";

/**
 * Les titres sous-jacents, agrégés à travers les fonds. Une ligne par titre,
 * même s'il est détenu par plusieurs fonds : la colonne « via » dit lesquels,
 * et la part directe / indirecte est séparée.
 */
export function LookThroughTable({
  holdings,
  currency,
  limit = 12,
}: {
  holdings: LookThroughHolding[];
  currency: string;
  limit?: number;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-x-1 text-left">
        <caption className="sr-only">{t("fin.lookthrough.caption")}</caption>
        <thead>
          <tr className="text-caption font-semibold text-ink-3">
            <th scope="col" className="pb-2">{t("fin.lookthrough.security")}</th>
            <th scope="col" className="pb-2">{t("fin.lookthrough.via")}</th>
            <th scope="col" className="pb-2 text-right">{t("fin.lookthrough.value")}</th>
            <th scope="col" className="pb-2 text-right">{t("fin.lookthrough.weight")}</th>
          </tr>
        </thead>
        <tbody>
          {holdings.slice(0, limit).map((h) => (
            <tr key={h.key} className="align-top">
              <th scope="row" className="border-t border-paper-3 py-2.5 pr-2 font-normal">
                <span className="block text-label font-semibold text-ink">{h.name}</span>
                {h.sector && <span className="mono-meta">{sectorLabel(h.sector, lang)}</span>}
              </th>
              <td className="border-t border-paper-3 py-2.5 pr-2">
                <span className="flex flex-wrap gap-1">
                  {h.contributions.map((c) => (
                    <span key={c.positionId} className="chip h-6 px-2 text-caption" title={c.label}>
                      {c.direct ? t("fin.lookthrough.direct") : shortFundName(c.label)}
                    </span>
                  ))}
                </span>
              </td>
              <td className="border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums">
                {formatCurrency(h.totalValue, lang, currency)}
              </td>
              <td className="border-t border-paper-3 py-2.5 text-right font-value text-body-sm tabular-nums">
                {formatPercent(h.weightPct / 100, lang, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** « iShares Core MSCI World UCITS ETF » → « Core MSCI World ». */
export function shortFundName(name: string): string {
  return name.replace(/^iShares\s+/i, "").replace(/\s+UCITS ETF.*$/i, "").trim();
}
