import { createFileRoute } from "@tanstack/react-router";
import { loadApiData } from "@/lib/api/data.server";
import {
  apiMeta,
  comparison,
  csvResponse,
  errorResponse,
  findFund,
  jsonResponse,
  MAX_COMPARE,
  parseIsinList,
  preflightResponse,
} from "@/lib/api/v1";
import { comparisonCsv } from "@/lib/compare/universe";

/**
 * GET /api/public/v1/compare?isins=A,B[&format=csv] — comparaison de 1 à 8
 * fonds. JSON : fiches complètes + lignes d'export. CSV : colonnes stables
 * (`EXPORT_COLUMNS`), une ligne par fonds trouvé, dans l'ordre demandé.
 */
export const Route = createFileRoute("/api/public/v1/compare")({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = parseIsinList(url.searchParams.get("isins"));
        if (!parsed.ok)
          return errorResponse(parsed.error, 400, `1 to ${MAX_COMPARE} ISINs, comma-separated`);
        const format = url.searchParams.get("format") ?? "json";
        if (format !== "json" && format !== "csv") return errorResponse("invalid_format", 400);
        try {
          const data = await loadApiData();
          const result = comparison(data.universe, data.analytics, parsed.isins);
          if (result.funds.length === 0)
            return errorResponse("not_found", 404, result.notFound.join(","));
          if (format === "csv") {
            const funds = parsed.isins
              .map((i) => findFund(data.universe, i))
              .filter((f): f is NonNullable<typeof f> => !!f);
            return csvResponse(comparisonCsv(funds), "seedow-comparaison.csv");
          }
          return jsonResponse({
            meta: {
              ...apiMeta({
                generatedAt: new Date().toISOString(),
                dataSnapshotAt: data.snapshotGeneratedAt,
              }),
              catalogAvailable: data.catalogAvailable,
              requested: parsed.isins,
              notFound: result.notFound,
            },
            data: result,
          });
        } catch (e) {
          console.error("[api.v1.compare]", e);
          return errorResponse("unavailable", 503);
        }
      },
    },
  },
});
