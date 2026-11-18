import { createFileRoute } from "@tanstack/react-router";
import { loadApiData } from "@/lib/api/data.server";
import {
  apiMeta,
  errorResponse,
  findFund,
  fundDetail,
  isIsin,
  jsonResponse,
  preflightResponse,
} from "@/lib/api/v1";

/** GET /api/public/v1/funds/{isin} — fiche complète, provenance champ par champ. */
export const Route = createFileRoute("/api/public/v1/funds/$isin")({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET: async ({ params }) => {
        const isin = params.isin.trim().toUpperCase();
        if (!isIsin(isin)) return errorResponse("invalid_isin", 400);
        try {
          const data = await loadApiData();
          const fund = findFund(data.universe, isin);
          if (!fund) return errorResponse("not_found", 404, isin);
          const analytics =
            data.analytics.find((a) => a.isin === (fund.snapshot?.isin ?? isin)) ?? null;
          return jsonResponse({
            meta: {
              ...apiMeta({
                generatedAt: new Date().toISOString(),
                dataSnapshotAt: data.snapshotGeneratedAt,
              }),
              catalogAvailable: data.catalogAvailable,
            },
            data: fundDetail(fund, analytics),
          });
        } catch (e) {
          console.error("[api.v1.fund]", e);
          return errorResponse("unavailable", 503);
        }
      },
    },
  },
});
