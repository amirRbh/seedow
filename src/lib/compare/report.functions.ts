/**
 * Données du rapport institutionnel de comparaison (`/comparer/rapport`).
 *
 * Même assemblage que l'API publique (`lib/api/data.server.ts`) : le rapport
 * imprimé, le CSV et le JSON disent donc exactement la même chose.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_REPORT } from "./report";

export const getComparisonReport = createServerFn({ method: "GET" })
  .validator((input: string[]) =>
    z
      .array(
        z
          .string()
          .trim()
          .regex(/^[A-Z]{2}[A-Z0-9]{9}\d$/i),
      )
      .min(1)
      .max(MAX_REPORT)
      .parse(input)
      .map((s) => s.toUpperCase()),
  )
  .handler(async ({ data: isins }) => {
    const { loadApiData } = await import("@/lib/api/data.server");
    const { findFund } = await import("@/lib/api/v1");
    const data = await loadApiData();
    const rows = isins
      .map((isin) => {
        const fund = findFund(data.universe, isin);
        if (!fund) return null;
        const analytics =
          data.analytics.find((a) => a.isin === (fund.snapshot?.isin ?? isin)) ?? null;
        const catalogFund =
          data.catalog.find((c) => c.isins.some((i) => i.toUpperCase() === fund.isin)) ?? null;
        // Le rapport n'a pas besoin des séries de graphique : on les retire.
        return {
          fund,
          catalogFund,
          analytics: analytics ? { ...analytics, chart: { fund: [], benchmark: [] } } : null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return {
      generatedAt: new Date().toISOString(),
      snapshotGeneratedAt: data.snapshotGeneratedAt,
      catalogAvailable: data.catalogAvailable,
      requested: isins,
      notFound: isins.filter(
        (i) => !rows.some((r) => r.fund.isin === i || r.fund.snapshot?.isin === i),
      ),
      rows,
    };
  });
