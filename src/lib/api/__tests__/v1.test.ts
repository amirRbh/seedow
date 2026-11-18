import { describe, expect, it } from "vitest";
import snapshotsJson from "@/content/demo/fund-snapshots.json";
import { openApiSpec } from "../openapi";
import {
  apiMeta,
  comparison,
  csvResponse,
  errorResponse,
  findFund,
  fundDetail,
  fundSummary,
  jsonResponse,
  MAX_COMPARE,
  parseFundFilters,
  parseIsinList,
} from "../v1";
import {
  buildUniverse,
  comparisonCsv,
  EXPORT_COLUMNS,
  exportRow,
  toSnapshotSide,
} from "@/lib/compare/universe";
import { analyze } from "@/lib/demo/analytics";
import type { SnapshotFile } from "@/lib/demo/snapshots";

const file = snapshotsJson as unknown as SnapshotFile;
const analytics = file.funds.map(analyze);
// Univers sans catalogue : le cas « base injoignable » que l'API doit tenir.
const universe = buildUniverse([], analytics.map(toSnapshotSide));

const ICLN = "US4642882249";
const IWDA = "IE00B4L5Y983";

/** Toutes les valeurs MSCI de l'instantané : aucune ne doit sortir dans un export. */
const msciNeedles = file.funds.flatMap((f) =>
  f.sustainability
    ? [
        `"msciRating"`,
        `"waci"`,
        `"impliedTempRise"`,
        String(f.sustainability.waci),
        f.sustainability.impliedTempRise ?? "__none__",
      ]
    : [],
);

describe("paramètres", () => {
  it("liste d'ISIN : validée, dédoublonnée, bornée", () => {
    expect(parseIsinList(`${ICLN}, ${IWDA.toLowerCase()},${ICLN}`)).toEqual({
      ok: true,
      isins: [ICLN, IWDA],
    });
    expect(parseIsinList(null)).toEqual({ ok: false, error: "missing_isins" });
    expect(parseIsinList("FR123")).toEqual({ ok: false, error: "invalid_isin" });
    const many = Array.from({ length: MAX_COMPARE + 1 }, (_, i) => `IE00B4L5Y98${i % 10}`);
    expect(parseIsinList(many.join(","))).toEqual({ ok: false, error: "too_many_isins" });
  });

  it("filtres de liste : une valeur illisible est ignorée, pas interprétée", () => {
    const f = parseFundFilters(
      new URLSearchParams("sfdr=7&maxTer=abc&q=world&withPerformance=true"),
    );
    expect(f.sfdr).toBe("all");
    expect(f.maxTer).toBeNull();
    expect(f.query).toBe("world");
    expect(f.withPerformance).toBe(true);
    expect(parseFundFilters(new URLSearchParams("maxTer=0.003")).maxTer).toBe(0.003);
    expect(parseFundFilters(new URLSearchParams("maxTer=5")).maxTer).toBeNull();
  });
});

describe("fiche fonds", () => {
  const icln = fundDetail(findFund(universe, ICLN)!, analytics.find((a) => a.isin === ICLN)!);
  const iwda = fundDetail(findFund(universe, IWDA)!, analytics.find((a) => a.isin === IWDA)!);

  it("provenance champ par champ : valeur, statut, source, date", () => {
    expect(iwda.costs.ter.value).toBe(0.002);
    expect(iwda.costs.ter.source).toContain("iShares");
    // IWDA déclare « Other » : ni article 8 ni article 9, rangé en 6.
    expect(iwda.regulatory.sfdrDeclared.value).toBe(6);
    expect(iwda.identity.domicile.value).toBe("Ireland");
  });

  it("une valeur inconnue est null ET UNAVAILABLE — jamais 0", () => {
    expect(iwda.regulatory.taxonomyAlignment).toEqual({
      value: null,
      status: "UNAVAILABLE",
      source: null,
      asOf: null,
    });
    expect(icln.regulatory.sfdrDeclared.value).toBeNull();
    expect(icln.regulatory.sfdrDeclared.status).toBe("UNAVAILABLE");
  });

  it("fonds américain : cadre européen non applicable, série mensuelle déclarée", () => {
    expect(icln.regulatory.euFrameworkApplies).toBe(false);
    expect(iwda.regulatory.euFrameworkApplies).toBe(true);
    expect(icln.performance?.frequency).toBe("monthly");
    expect(iwda.performance?.frequency).toBe("daily");
  });

  it("indicateurs MSCI : signalés, jamais redistribués", () => {
    expect(icln.issuerEsgIndicators).toMatchObject({ available: true, redistributed: false });
    const body = JSON.stringify(icln);
    for (const needle of msciNeedles) expect(body).not.toContain(needle);
    expect(iwda.issuerEsgIndicators).toEqual({ available: false });
  });

  it("aucun ratio de Sharpe, aucun score, aucun rang", () => {
    const body = JSON.stringify(iwda);
    expect(body).not.toMatch(/"sharpe"|"score"|"rank"/i);
  });
});

describe("comparaison et export", () => {
  it("garde l'ordre demandé et liste les introuvables", () => {
    const r = comparison(universe, analytics, [ICLN, "FR0000000000", IWDA]);
    expect(r.funds.map((f) => f.isin)).toEqual([ICLN, IWDA]);
    expect(r.notFound).toEqual(["FR0000000000"]);
    expect(r.rows).toHaveLength(2);
  });

  it("CSV : colonnes stables, une ligne par fonds, aucune donnée MSCI", () => {
    const csv = comparisonCsv([findFund(universe, ICLN)!, findFund(universe, IWDA)!]);
    const [header, ...lines] = csv.trim().split("\r\n");
    expect(header.split(",")).toEqual([...EXPORT_COLUMNS]);
    expect(lines).toHaveLength(2);
    for (const needle of msciNeedles.filter((n) => !n.startsWith('"'))) {
      expect(csv).not.toContain(needle);
    }
  });

  it("ligne d'export : valeur inconnue vide, pas zéro", () => {
    const row = exportRow(findFund(universe, ICLN)!);
    expect(row.sfdr_declared).toBeNull();
    expect(row.exclusion_fossil).toBeNull();
    expect(row.performance_frequency).toBe("monthly");
    expect(row.domicile).toBe("United States");
  });

  it("résumé de liste : drapeau d'indicateurs émetteur, sans les valeurs", () => {
    const s = fundSummary(findFund(universe, ICLN)!);
    expect(s.hasIssuerEsgIndicators).toBe(true);
    expect(s.links.self).toBe(`/api/public/v1/funds/${ICLN}`);
  });
});

describe("réponses HTTP", () => {
  it("JSON : CORS ouvert en lecture, cache en bordure, nosniff", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("erreurs : jamais mises en cache", async () => {
    const res = errorResponse("not_found", 404, "X");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: { code: "not_found", detail: "X" } });
  });

  it("CSV : type et nom de fichier", () => {
    const res = csvResponse("a\r\n", "x.csv");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="x.csv"');
  });

  it("méta : version, avertissement, conditions — sans promesse de conseil", () => {
    const m = apiMeta({ generatedAt: "2026-11-18T00:00:00Z", dataSnapshotAt: null });
    expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(m.disclaimer).toMatch(/not investment advice/i);
    expect(m.terms).toMatch(/MSCI ESG Research are not redistributed/);
  });
});

describe("spécification OpenAPI", () => {
  const spec = openApiSpec();
  it("décrit chaque point d'accès servi", () => {
    expect(Object.keys(spec.paths).sort()).toEqual(
      ["/compare", "/funds", "/funds/{isin}", "/openapi.json"].sort(),
    );
    expect(spec.openapi).toBe("3.1.0");
  });
  it("liste exactement les colonnes de l'export CSV", () => {
    expect(spec.components.schemas.ExportColumn.enum).toEqual([...EXPORT_COLUMNS]);
  });
});
