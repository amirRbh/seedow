import { describe, expect, it } from "vitest";
import snapshotsJson from "@/content/demo/fund-snapshots.json";
import {
  energySectorPct,
  snapshotStatus,
  snapshotThirdPartyEsg,
  type SnapshotFile,
} from "../snapshots";

const data = snapshotsJson as unknown as SnapshotFile;
const byRole = (role: string) => data.funds.find((f) => f.role === role)!;

describe("part du secteur Énergie publiée", () => {
  it("granularité SECTEUR : la ligne « Energy »", () => {
    expect(
      energySectorPct({
        sectorExposure: [
          { label: "Information Technology", weightPct: 30 },
          { label: "Energy", weightPct: 3.6 },
        ],
      }),
    ).toBe(3.6);
  });

  it("granularité SECTEUR sans ligne Énergie : 0, la répartition est complète", () => {
    expect(
      energySectorPct({
        sectorExposure: [
          { label: "Information Technology", weightPct: 60 },
          { label: "Health Care", weightPct: 40 },
        ],
      }),
    ).toBe(0);
  });

  it("granularité SOUS-INDUSTRIE (ETF thématique) : somme des lignes pétrole, gaz, charbon", () => {
    expect(
      energySectorPct({
        sectorExposure: [
          { label: "Renewable Electricity", weightPct: 29.06 },
          { label: "Oil & Gas Refining & Marketing & Transportation", weightPct: 1.58 },
          { label: "Coal & Consumable Fuels", weightPct: 0.4 },
          { label: "Cash and/or Derivatives", weightPct: 0.46 },
        ],
      }),
    ).toBe(1.98);
  });

  it("aucune répartition → null, jamais 0", () => {
    expect(energySectorPct({ sectorExposure: [] })).toBeNull();
    expect(
      energySectorPct({ sectorExposure: [{ label: "Cash and/or Derivatives", weightPct: 100 }] }),
    ).toBeNull();
  });

  it("sur l'instantané réel : ICLN lu par sous-industrie", () => {
    expect(energySectorPct(byRole("us_clean_energy"))).toBeGreaterThan(0);
  });
});

describe("instantané : fonds américains", () => {
  it("chaque ETF américain porte ses indicateurs MSCI datés, sauf s'il n'en publie pas", () => {
    for (const role of [
      "us_low_carbon_world",
      "us_esg_aware",
      "us_esg_leaders",
      "us_clean_energy",
    ]) {
      const f = byRole(role);
      expect(f.isin.startsWith("US")).toBe(true);
      expect(f.sustainability?.msciRating).toMatch(/^(AAA|AA|A|BBB|BB|B|CCC)$/);
      expect(f.sustainability?.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const tp = snapshotThirdPartyEsg(f)!;
      expect(tp.provider).toBe("MSCI ESG Research");
      expect(tp.publishedBy).toBe(f.issuer);
    }
    // Le S&P 500 classique ne publie pas ces feuilles : rien n'est inventé.
    expect(snapshotThirdPartyEsg(byRole("us_core"))).toBeNull();
  });

  it("une série mensuelle fraîche de moins de 45 jours n'est pas « périmée »", () => {
    const f = byRole("us_clean_energy");
    const last = f.history.dates.at(-1)!;
    const now = new Date(Date.parse(`${last}T00:00:00Z`) + 30 * 86_400_000);
    expect(snapshotStatus(f, now).performance).toBe("VERIFIED");
    const later = new Date(Date.parse(`${last}T00:00:00Z`) + 60 * 86_400_000);
    expect(snapshotStatus(f, later).performance).toBe("STALE");
  });
});
