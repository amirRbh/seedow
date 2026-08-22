import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseXlsxSheet, unescapeXml, unzipEntry } from "../xlsx-reader";

/**
 * Construit une archive ZIP en mémoire. `streamed` reproduit le cas qui a
 * réellement cassé un premier lecteur : drapeau « data descriptor » (bit 3)
 * posé et taille compressée à 0 dans l'en-tête LOCAL, la taille réelle
 * n'existant que dans le répertoire central. C'est la forme que publie SBTi.
 */
function buildZip(
  entries: { name: string; content: string }[],
  opts: { streamed?: boolean; deflate?: boolean } = {},
): Buffer {
  const { streamed = false, deflate = true } = opts;
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const raw = Buffer.from(e.content, "utf8");
    const data = deflate ? deflateRawSync(raw) : raw;
    const method = deflate ? 8 : 0;
    const flags = streamed ? 0x808 : 0;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    // En mode « streamed », l'en-tête local ment : tailles à 0.
    local.writeUInt32LE(streamed ? 0 : data.length, 18);
    local.writeUInt32LE(streamed ? 0 : raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20); // le répertoire central, lui, dit vrai
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += local.length + data.length;
  }

  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const SHARED = `<sst><si><t>company_name</t></si><si><t>isin</t></si><si><t>Apple Inc.</t></si><si><t>Soci&amp;#233;t&amp;#233; &amp;amp; Fils</t></si></sst>`;
const SHEET = `<worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="str"><v>US0378331005</v></c></row>
<row r="3"><c r="A3" t="s"><v>3</v></c></row>
</sheetData></worksheet>`;

function workbook(opts?: { streamed?: boolean; deflate?: boolean }): Buffer {
  return buildZip(
    [
      { name: "xl/worksheets/sheet1.xml", content: SHEET },
      { name: "xl/sharedStrings.xml", content: SHARED },
    ],
    opts,
  );
}

describe("unzipEntry", () => {
  it("lit une entrée deflate via le répertoire central", () => {
    const zip = buildZip([{ name: "a.txt", content: "bonjour" }]);
    expect(unzipEntry(zip, "a.txt")).toBe("bonjour");
  });

  it("lit une entrée stockée (non compressée)", () => {
    const zip = buildZip([{ name: "a.txt", content: "brut" }], { deflate: false });
    expect(unzipEntry(zip, "a.txt")).toBe("brut");
  });

  it("lit une archive écrite en flux, dont l'en-tête local annonce une taille nulle", () => {
    // Régression : un lecteur s'appuyant sur l'en-tête local renvoie ici du vide,
    // silencieusement. C'est exactement la forme publiée par SBTi (flags=0x808).
    const zip = buildZip([{ name: "a.txt", content: "malgré le flux" }], { streamed: true });
    expect(unzipEntry(zip, "a.txt")).toBe("malgré le flux");
  });

  it("trouve la bonne entrée parmi plusieurs", () => {
    const zip = buildZip([
      { name: "premier.xml", content: "un" },
      { name: "second.xml", content: "deux" },
      { name: "troisieme.xml", content: "trois" },
    ]);
    expect(unzipEntry(zip, "second.xml")).toBe("deux");
    expect(unzipEntry(zip, "troisieme.xml")).toBe("trois");
  });

  it("rend null sur entrée absente ou données non ZIP, sans lever", () => {
    expect(unzipEntry(buildZip([{ name: "a.txt", content: "x" }]), "absent.txt")).toBeNull();
    expect(unzipEntry(Buffer.from("pas une archive"), "a.txt")).toBeNull();
    expect(unzipEntry(Buffer.alloc(0), "a.txt")).toBeNull();
  });
});

describe("unescapeXml", () => {
  it("déséchappe sans double décodage", () => {
    expect(unescapeXml("a &lt;b&gt; c")).toBe("a <b> c");
    // « &amp;lt; » doit rendre « &lt; », pas « < ».
    expect(unescapeXml("&amp;lt;")).toBe("&lt;");
  });
});

describe("parseXlsxSheet", () => {
  it("rend des lignes clé→valeur en utilisant la 1re ligne comme en-têtes", () => {
    const rows = parseXlsxSheet(workbook());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ company_name: "Apple Inc.", isin: "US0378331005" });
  });

  it("résout les chaînes partagées comme les valeurs littérales", () => {
    const rows = parseXlsxSheet(workbook());
    expect(rows[0].company_name).toBe("Apple Inc."); // t="s" → table partagée
    expect(rows[0].isin).toBe("US0378331005"); // t="str" → littéral
  });

  it("rend une chaîne vide pour une cellule absente, jamais une valeur inventée", () => {
    const rows = parseXlsxSheet(workbook());
    expect(rows[1].isin).toBe("");
  });

  it("fonctionne aussi sur un classeur écrit en flux", () => {
    expect(parseXlsxSheet(workbook({ streamed: true }))).toHaveLength(2);
  });

  it("rend [] plutôt que de lever quand le fichier n'est pas exploitable", () => {
    expect(parseXlsxSheet(Buffer.from("<html>404</html>"))).toEqual([]);
    expect(parseXlsxSheet(buildZip([{ name: "autre.xml", content: "x" }]))).toEqual([]);
  });
});
