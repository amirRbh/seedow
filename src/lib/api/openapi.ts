/**
 * Spécification OpenAPI 3.1 de l'API publique v1 — servie telle quelle sur
 * `/api/public/v1/openapi.json`. Écrite à la main, et testée contre le code
 * (`openapi.test.ts`) : chaque colonne d'export et chaque chemin y figurent.
 */
import { DATA_STATUSES } from "@/lib/data/status";
import { EXPORT_COLUMNS } from "@/lib/compare/universe";
import { API_BASE, API_VERSION, MAX_COMPARE } from "./v1";

const isinParam = {
  name: "isin",
  in: "path",
  required: true,
  description: "ISIN (ISO 6166), 12 characters.",
  schema: { type: "string", pattern: "^[A-Z]{2}[A-Z0-9]{9}[0-9]$" },
} as const;

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, detail: { type: "string" } },
            required: ["code"],
          },
        },
      },
    },
  },
} as const;

export function openApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Seedow public API",
      version: API_VERSION,
      description:
        "Read-only fund data for comparison and screening: identity, SFDR classification (declared vs catalogue), costs, documented exclusion policies, transparency blocks, past performance recomputed from issuer series, published exposures and holdings. Every value carries its data status, source and date. No ranking, no sustainability score, no recommendation. Indicators computed by MSCI ESG Research are not redistributed.",
      termsOfService: "/cgu",
    },
    servers: [{ url: API_BASE }],
    paths: {
      "/funds": {
        get: {
          summary: "List comparable funds",
          description: "Alphabetical order. Filters combine with AND.",
          parameters: [
            { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
            {
              name: "sfdr",
              in: "query",
              schema: { type: "string", enum: ["6", "8", "9", "unknown"] },
            },
            {
              name: "maxTer",
              in: "query",
              description:
                "Maximum ongoing charges, as a fraction (0.002 = 0.20 %). Unknown TER never passes.",
              schema: { type: "number", minimum: 0, maximum: 0.1 },
            },
            { name: "fossilPolicy", in: "query", schema: { type: "string", enum: ["documented"] } },
            { name: "withPerformance", in: "query", schema: { type: "string", enum: ["true"] } },
          ],
          responses: { "200": { description: "Fund summaries" }, "503": errorResponse },
        },
      },
      "/funds/{isin}": {
        get: {
          summary: "Fund detail with per-field provenance",
          parameters: [isinParam],
          responses: {
            "200": { description: "Fund detail" },
            "400": errorResponse,
            "404": errorResponse,
            "503": errorResponse,
          },
        },
      },
      "/compare": {
        get: {
          summary: `Compare 1 to ${MAX_COMPARE} funds`,
          parameters: [
            {
              name: "isins",
              in: "query",
              required: true,
              description: `Comma-separated ISINs, at most ${MAX_COMPARE}.`,
              schema: { type: "string" },
            },
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "csv"], default: "json" },
            },
          ],
          responses: {
            "200": {
              description:
                "Comparison. CSV: RFC 4180, UTF-8, comma separator, dot decimal, stable column ids.",
              content: {
                "application/json": {},
                "text/csv": {
                  schema: { type: "string" },
                  "x-columns": EXPORT_COLUMNS,
                },
              },
            },
            "400": errorResponse,
            "404": errorResponse,
            "503": errorResponse,
          },
        },
      },
      "/openapi.json": {
        get: { summary: "This document", responses: { "200": { description: "OpenAPI 3.1" } } },
      },
    },
    components: {
      schemas: {
        DataStatus: { type: "string", enum: [...DATA_STATUSES] },
        Field: {
          type: "object",
          description: "A value with its provenance. value = null ⇔ status = UNAVAILABLE.",
          properties: {
            value: {},
            status: { $ref: "#/components/schemas/DataStatus" },
            source: { type: ["string", "null"] },
            asOf: { type: ["string", "null"], format: "date" },
          },
          required: ["value", "status", "source", "asOf"],
        },
        ExportColumn: { type: "string", enum: [...EXPORT_COLUMNS] },
      },
    },
  };
}
