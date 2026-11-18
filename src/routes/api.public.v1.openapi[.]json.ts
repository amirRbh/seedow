import { createFileRoute } from "@tanstack/react-router";
import { openApiSpec } from "@/lib/api/openapi";
import { jsonResponse, preflightResponse } from "@/lib/api/v1";

/** GET /api/public/v1/openapi.json — la spécification de l'API publique. */
export const Route = createFileRoute("/api/public/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET: async () => jsonResponse(openApiSpec()),
    },
  },
});
