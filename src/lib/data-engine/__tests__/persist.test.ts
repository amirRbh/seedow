import { describe, expect, it } from "vitest";
import {
  buildObservationRows,
  canonicalAssetUpdate,
  observationToRow,
  persistObservations,
  type ObservationRow,
  type ObservationWriter,
} from "../persist";
import type { Observation } from "../connectors/types";

function o(
  field: string,
  value: number | string,
  status: Observation["validation"]["status"] = "valid",
): Observation {
  return {
    field,
    value,
    sourceKey: "ishares_factsheet",
    sourceUrl: "http://x/ESGU.pdf",
    referenceDate: "2026-04-17",
    retrievedAt: "2026-08-12T00:00:00Z",
    confidence: "high",
    method: "pdf_parse:ishares_factsheet",
    validation: { status, reason: null },
  };
}

describe("observationToRow", () => {
  it("range les nombres dans value_num et le texte dans value_text", () => {
    const num = observationToRow("a1", o("esg_score", 70.7), "src1");
    expect(num.value_num).toBe(70.7);
    expect(num.value_text).toBeNull();
    const txt = observationToRow("a1", o("msci_esg_rating", "A"), "src1");
    expect(txt.value_text).toBe("A");
    expect(txt.value_num).toBeNull();
    expect(txt.source_id).toBe("src1");
    expect(txt.reference_date).toBe("2026-04-17");
  });
});

describe("buildObservationRows", () => {
  it("exclut les observations rejetées, résout les source_id", () => {
    const obs = [o("esg_score", 70.7), o("waci_tco2e_per_musd_sales", 9999, "rejected")];
    const rows = buildObservationRows("a1", obs, { ishares_factsheet: "src1" });
    expect(rows).toHaveLength(1);
    expect(rows[0].field).toBe("esg_score");
    expect(rows[0].source_id).toBe("src1");
  });

  it("source inconnue → source_id null (pas d'invention)", () => {
    const rows = buildObservationRows("a1", [o("esg_score", 70.7)], {});
    expect(rows[0].source_id).toBeNull();
  });
});

describe("canonicalAssetUpdate", () => {
  it("mappe les champs valides vers les colonnes + provenance", () => {
    const upd = canonicalAssetUpdate([
      o("esg_score", 70.7),
      o("waci_tco2e_per_musd_sales", 69.03),
      o("msci_esg_rating", "A"), // pas de colonne canonique → ignoré
    ])!;
    expect(upd.esg_score).toBe(70.7);
    expect(upd.waci_tco2e_per_musd_sales).toBe(69.03);
    expect(upd.esg_score_source).toBe("ishares_factsheet");
    expect(upd.esg_data_asof).toBe("2026-04-17");
    expect(upd.carbon_intensity_updated_at).toBe("2026-04-17T00:00:00Z");
    expect("msci_esg_rating" in upd).toBe(false);
  });

  it("ignore review_required et rejected (§11)", () => {
    expect(canonicalAssetUpdate([o("esg_score", 70.7, "review_required")])).toBeNull();
    expect(canonicalAssetUpdate([o("esg_score", 70.7, "rejected")])).toBeNull();
  });

  it("null si rien de canonique", () => {
    expect(canonicalAssetUpdate([o("msci_esg_rating", "A")])).toBeNull();
  });
});

describe("persistObservations (orchestration via fake writer)", () => {
  function fakeWriter() {
    const calls = { rows: [] as ObservationRow[], update: null as Record<string, unknown> | null };
    const writer: ObservationWriter = {
      async resolveSourceIds() {
        return { ishares_factsheet: "src1" };
      },
      async insertObservations(rows) {
        calls.rows = rows;
        return rows.length;
      },
      async updateAssetCanonical(_assetId, update) {
        calls.update = update;
      },
    };
    return { writer, calls };
  }

  it("écrit le ledger + les colonnes canoniques", async () => {
    const { writer, calls } = fakeWriter();
    const r = await persistObservations(writer, "a1", [
      o("esg_score", 70.7),
      o("waci_tco2e_per_musd_sales", 69.03),
    ]);
    expect(r.observationsInserted).toBe(2);
    expect(r.canonicalFieldsUpdated).toContain("esg_score");
    expect(calls.rows).toHaveLength(2);
    expect(calls.update?.esg_score).toBe(70.7);
  });

  it("lot sans observation publiable → no-op (n'écrit rien)", async () => {
    const { writer, calls } = fakeWriter();
    const r = await persistObservations(writer, "a1", [o("esg_score", 70.7, "rejected")]);
    expect(r.observationsInserted).toBe(0);
    expect(r.canonicalFieldsUpdated).toHaveLength(0);
    expect(calls.rows).toHaveLength(0);
    expect(calls.update).toBeNull();
  });
});
