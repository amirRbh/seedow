import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseISharesHoldings } from "../ishares-holdings";
import { buildHoldingRows, holdingIdentity } from "../holdings";
import { runHoldingsQualityChecks } from "../holdings-quality";

/**
 * Régressions tirées de FICHIERS RÉELS.
 *
 * Les deux fixtures sont des extraits verbatim de classeurs officiels
 * BlackRock téléchargés le 26 août 2026 : l'en-tête du tableau des positions,
 * la ligne « as of » qui le précède, et les lignes qui mettaient le pipeline en
 * défaut. Rien n'a été réécrit — c'est tout l'intérêt : ces cas n'avaient été
 * imaginés par personne, ils ont été trouvés en confrontant le pipeline aux
 * documents que les émetteurs publient vraiment.
 *
 * Ce que chacune protège :
 *
 *   · `ishares-bond-extract.xml` (iShares Global Corp Bond, IE00B7J7TB45) —
 *     deux obligations AT&T de même nom et de même émetteur, séparées par leur
 *     seule échéance, plus la ligne « EUR CASH » à poids négatif. Le fichier
 *     complet porte 14 978 lignes dont 2 077 noms répétés : sous l'ancienne clé
 *     `(fonds, nom, date)`, 41 % des positions du catalogue disparaissaient
 *     silencieusement à l'insertion.
 *
 *   · `ishares-equity-extract.xml` (iShares Core MSCI World, IE00B4L5Y983) —
 *     les deux lignes Lindt : l'action nominative (LISN) et le bon de
 *     participation (LISP), même nom, deux titres cotés distincts.
 */

const FIXTURES = join(import.meta.dirname, "fixtures");
const read = (f: string) => readFileSync(join(FIXTURES, f), "utf-8");

const META = { sourceId: null, sourceUrl: "https://example.test/doc", retrievedAt: "2026-08-26" };

describe("classeur obligataire réel", () => {
  const parsed = parseISharesHoldings(read("ishares-bond-extract.xml"));

  it("lit la date de référence publiée", () => {
    expect(parsed.asOf).toBe("2026-08-25");
  });

  it("décode les entités XML des noms d'émetteurs", () => {
    // « AT&amp;T INC » dans le document : sans décodage, le nom stocké serait faux.
    expect(parsed.holdings.some((h) => h.name === "AT&T INC")).toBe(true);
  });

  it("capte l'échéance et le coupon, qui distinguent deux obligations homonymes", () => {
    const att = parsed.holdings.filter((h) => h.name === "AT&T INC");
    expect(att).toHaveLength(2);
    expect(att[0].maturity).toBeTruthy();
    expect(att[1].maturity).toBeTruthy();
    expect(att[0].maturity).not.toBe(att[1].maturity);
    // Même nom, mais deux identités : c'est exactement ce que l'ancienne clé
    // ne voyait pas.
    expect(holdingIdentity(att[0])).not.toBe(holdingIdentity(att[1]));
  });

  it("conserve une ligne de liquidités à poids négatif", () => {
    const neg = parsed.holdings.filter((h) => (h.weightPct ?? 0) < 0);
    expect(neg.length).toBeGreaterThan(0);
    // Elle doit survivre jusqu'à la ligne persistable : une composition
    // amputée de son compte à découvert n'est pas celle qui a été publiée.
    const rows = buildHoldingRows("asset-1", parsed, META);
    const negRow = rows.find((r) => (r.weight_pct ?? 0) < 0);
    expect(negRow).toBeDefined();
    expect(negRow!.validation_status).not.toBe("rejected");
  });

  it("ne signale plus deux obligations du même émetteur comme un doublon", () => {
    const qc = runHoldingsQualityChecks({
      holdings: parsed.holdings,
      asOf: parsed.asOf,
      sourceId: null,
      sourceUrl: META.sourceUrl,
    });
    expect(qc.issues.filter((i) => i.kind === "duplicate_security")).toHaveLength(0);
  });
});

describe("classeur actions réel", () => {
  const parsed = parseISharesHoldings(read("ishares-equity-extract.xml"));

  it("lit les positions et leurs poids publiés", () => {
    expect(parsed.holdings.length).toBeGreaterThanOrEqual(3);
    expect(parsed.holdings.some((h) => h.name === "NVIDIA")).toBe(true);
  });

  it("laisse échéance et coupon absents — l'export actions ne les porte pas", () => {
    const nvidia = parsed.holdings.find((h) => h.name === "NVIDIA")!;
    expect(nvidia.maturity).toBeNull();
    expect(nvidia.couponPct).toBeNull();
    // La classe d'actif, elle, est bien publiée.
    expect(nvidia.assetClass).toBe("Equity");
  });

  it("distingue l'action nominative du bon de participation par leur ticker", () => {
    const lindt = parsed.holdings.filter((h) => h.name.startsWith("CHOCOLADEFABRIKEN"));
    expect(lindt).toHaveLength(2);
    expect(new Set(lindt.map((h) => h.ticker)).size).toBe(2);
    expect(holdingIdentity(lindt[0])).not.toBe(holdingIdentity(lindt[1]));
  });
});

describe("fidélité au document", () => {
  it("numérote les lignes dans l'ordre publié, sans collision", () => {
    const parsed = parseISharesHoldings(read("ishares-bond-extract.xml"));
    const rows = buildHoldingRows("asset-1", parsed, META);
    expect(rows.map((r) => r.line_no)).toEqual(parsed.holdings.map((_, i) => i));
    // La clé (fonds, date, rang) est ce qui garantit qu'aucune ligne n'en
    // écrase une autre, y compris quand l'émetteur publie deux lignes que ses
    // propres colonnes ne séparent pas.
    const keys = rows.map((r) => `${r.asset_id}|${r.as_of}|${r.line_no}`);
    expect(new Set(keys).size).toBe(rows.length);
  });
});

/**
 * ── Classeur AMÉRICAIN ────────────────────────────────────────────────────
 *
 * Le catalogue Seedow est composé d'ETF cotés aux États-Unis, pas d'UCITS
 * irlandais. Le registre ne connaissait que les seconds : l'ingestion trouvait
 * zéro cible et s'arrêtait en code 0, ce qui ressemblait à un succès.
 *
 * L'extrait est une tranche CONTIGUË d'un classeur officiel : le préambule
 * (qui porte deux dates — celle de la composition et celle de création du
 * fonds), l'en-tête, deux positions, puis le tableau qui suit immédiatement.
 */
describe("classeur américain réel", () => {
  const parsed = parseISharesHoldings(read("ishares-us-extract.xml"));

  it("lit la date au format américain « Aug 26, 2026 »", () => {
    // Ce format n'était pas reconnu : `asOf` restait null, le lot était rejeté
    // (§12) et `buildHoldingRows` ne rendait aucune ligne. Tout fonds américain
    // était donc lu correctement, puis jeté.
    expect(parsed.asOf).toBe("2026-08-26");
  });

  it("prend la date de la composition, pas celle de création du fonds", () => {
    // Le préambule annonce « Inception Date | Jun 24, 2008 » juste avant
    // « Fund Holdings as of | Aug 26, 2026 ». Confondre les deux daterait la
    // composition de dix-huit ans.
    expect(parsed.asOf).not.toBe("2008-06-24");
  });

  it("s'arrête à la fin du tableau au lieu de lire le suivant", () => {
    // L'export enchaîne les tableaux sans ligne vide : la composition est
    // suivie d'un « As Of | NAV per Share | … » de cinq colonnes. Le parser
    // sautait ces lignes puis continuait, ramassant quarante lignes d'un
    // historique de distributions — avec une date en guise de nom de titre.
    expect(parsed.holdings).toHaveLength(2);
    expect(parsed.holdings.map((h) => h.name)).toEqual([
      "FIRST SOLAR",
      "CHINA YANGTZE POWER LTD A",
    ]);
  });

  it("lit le secteur, sur lequel s'ouvre le bloc de composition", () => {
    expect(parsed.holdings[0].sector).toBe("Information Technology");
    expect(parsed.holdings[1].sector).toBe("Utilities");
  });
});
