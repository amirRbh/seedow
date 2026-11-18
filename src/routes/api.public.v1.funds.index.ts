import { createFileRoute } from "@tanstack/react-router";
import { loadApiData } from "@/lib/api/data.server";
import {
  apiMeta,
  errorResponse,
  fundSummary,
  jsonResponse,
  parseFundFilters,
  preflightResponse,
} from "@/lib/api/v1";
import { screen } from "@/lib/compare/universe";

/**
 * GET /api/public/v1/funds — l'univers comparable, filtrable.
 * Filtres : q, sfdr (6|8|9|unknown), maxTer (fraction), fossilPolicy=documented,
 * withPerformance=true. Ordre alphabétique : l'API ne classe pas.
 */
export const Route = createFileRoute("/api/public/v1/funds/")({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET: async ({ request }) => {
        try {
          const data = await loadApiData();
          const filters = parseFundFilters(new URL(request.url).searchParams);
          const funds = screen(data.universe, filters).map(fundSummary);
          return jsonResponse({
            meta: {
              ...apiMeta({
                generatedAt: new Date().toISOString(),
                dataSnapshotAt: data.snapshotGeneratedAt,
              }),
              catalogAvailable: data.catalogAvailable,
              filters,
              count: funds.length,
            },
            data: funds,
          });
        } catch (e) {
          console.error("[api.v1.funds]", e);
          return errorResponse("unavailable", 503);
        }
      },
    },
  },
});
