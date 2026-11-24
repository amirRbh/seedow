/**
 * Scan d'un contrat d'assurance-vie : la liste de ses unités de compte (UC)
 * passée au moteur pour trois profils types (src/lib/pro/matching/profiles.ts).
 *
 *   bun run scripts/pro/scan-contract.ts uc.csv --insurer "Assureur" --contract "Contrat"
 *        [--list-date 2026-10-01] [--source-url https://…] [--profile FORT] [--out dossier]
 *        [--data fonds.json]   # hors ligne : données fonds lues dans un fichier, aucune écriture
 *
 * Sans --data : la liste est enregistrée dans `pro_contract_uc_lists` et les
 * données lues dans `pro_fund_current_data` (SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY).
 *
 * Sorties : `<out>/<contrat>-<date>.pdf` (synthèse 1 page) et `.csv` (détail
 * par UC et par profil, couverture comprise).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { currentDataRowSchema, toFundData } from "../../src/lib/pro/app/data";
import { parseIsinList } from "../../src/lib/pro/app/isin";
import { DEFAULT_SCAN_PROFILES } from "../../src/lib/pro/matching/profiles";
import { fundDataSchema, type FundData } from "../../src/lib/pro/matching/types";
import { parisDate } from "../../src/lib/pro/report/model";
import { renderScanPdf } from "../../src/lib/pro/report/scan-pdf";
import { scanContract, scanCsv } from "../../src/lib/pro/scan/scan";
import { loadReportFonts } from "./lib/fonts";
import { serviceClient } from "./lib/supabase";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    insurer: { type: "string" },
    contract: { type: "string" },
    "list-date": { type: "string" },
    "source-url": { type: "string" },
    profile: { type: "string", default: "FORT" },
    out: { type: "string", default: "." },
    data: { type: "string" },
    "as-of": { type: "string" },
  },
});

const args = z
  .object({
    csv: z.string().min(1),
    insurer: z.string().trim().min(1, "--insurer requis"),
    contract: z.string().trim().min(1, "--contract requis"),
    listDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sourceUrl: z.string().url().nullable(),
    profile: z.enum(DEFAULT_SCAN_PROFILES.map((p) => p.key) as [string, ...string[]]),
  })
  .parse({
    csv: positionals[0],
    insurer: opts.insurer,
    contract: opts.contract,
    asOf: opts["as-of"] ?? parisDate(new Date().toISOString()),
    listDate: opts["list-date"] ?? opts["as-of"] ?? parisDate(new Date().toISOString()),
    sourceUrl: opts["source-url"] ?? null,
    profile: opts.profile,
  });

const parsed = parseIsinList(await readFile(args.csv, "utf8"), 5000);
if (parsed.invalid.length)
  console.warn(`⚠ clé de contrôle invalide, ignoré : ${parsed.invalid.join(", ")}`);
if (parsed.isins.length === 0) {
  console.error("Aucun ISIN valide dans le fichier.");
  process.exit(1);
}

const funds = new Map<string, FundData>();
if (opts.data) {
  for (const f of z.array(fundDataSchema).parse(JSON.parse(await readFile(opts.data, "utf8")))) {
    funds.set(f.isin, f);
  }
} else {
  const db = serviceClient();
  const up = await db.from("pro_contract_uc_lists").upsert(
    parsed.isins.map((isin) => ({
      insurer: args.insurer,
      contract_name: args.contract,
      isin,
      source_url: args.sourceUrl,
      list_date: args.listDate,
    })),
    { onConflict: "insurer,contract_name,isin,list_date", ignoreDuplicates: true },
  );
  if (up.error) throw up.error;
  for (let i = 0; i < parsed.isins.length; i += 200) {
    const { data, error } = await db
      .from("pro_fund_current_data")
      .select("*")
      .in("isin", parsed.isins.slice(i, i + 200));
    if (error) throw error;
    for (const row of z.array(currentDataRowSchema).parse(data ?? []))
      funds.set(row.isin, toFundData(row));
  }
}

const result = scanContract(
  {
    insurer: args.insurer,
    contract_name: args.contract,
    list_date: args.listDate,
    source_url: args.sourceUrl,
    as_of: args.asOf,
  },
  parsed.isins,
  funds,
  DEFAULT_SCAN_PROFILES,
);

const slug = `${args.contract}-${args.asOf}`
  .normalize("NFD")
  .replace(/\p{M}/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "");
await mkdir(opts.out!, { recursive: true });
const pdfPath = join(opts.out!, `${slug}.pdf`);
const csvPath = join(opts.out!, `${slug}.csv`);
await writeFile(pdfPath, await renderScanPdf(result, args.profile, await loadReportFonts()));
await writeFile(csvPath, scanCsv(result, DEFAULT_SCAN_PROFILES));

for (const p of result.profiles) {
  console.log(
    `${p.label.padEnd(7)} ${p.adequate} adéquates · ${p.non_adequate + p.partial} non adéquates · ` +
      `${p.to_verify} à vérifier  (${p.hypothesis})`,
  );
}
console.log(
  `Couverture : ${result.coverage.with_data}/${result.coverage.total} UC avec données` +
    (result.coverage.without_data.length
      ? ` · sans donnée : ${result.coverage.without_data.join(", ")}`
      : ""),
);
console.log(`→ ${pdfPath}\n→ ${csvPath}`);
