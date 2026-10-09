/**
 * Pré-contrôle documentaire des noms de fonds — livrable du pilote B2B.
 *
 *   bun run scripts/precheck-fund-names.ts <entree.json> [sortie.md]
 *
 * Entrée : { "client": string, "demo": boolean, "funds": FundDocumentation[] }
 * (voir data/demo/precheck-demo.json). Chaque engagement saisi doit porter sa
 * source : la saisie se fait à partir de l'annexe précontractuelle SFDR, du
 * prospectus et des documents commerciaux transmis par le client.
 *
 * Aucune donnée n'est inventée ni complétée : un champ absent reste `null` et
 * devient un point « écart documentaire » ou « à vérifier » dans le rapport.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  checkFundName,
  renderNameCheckReport,
  type FundDocumentation,
} from "../src/lib/esg/naming/esma-fund-names";

interface Input {
  client: string;
  demo: boolean;
  funds: FundDocumentation[];
}

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath) {
  console.error("Usage : bun run scripts/precheck-fund-names.ts <entree.json> [sortie.md]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf8")) as Input;
if (!Array.isArray(input.funds) || typeof input.client !== "string") {
  console.error("Entrée invalide : attendu { client, demo, funds[] }.");
  process.exit(1);
}

const checks = input.funds.map(checkFundName);
const report = renderNameCheckReport(checks, {
  client: input.client,
  generatedOn: new Date().toISOString().slice(0, 10),
  demo: input.demo === true,
});

if (outputPath) {
  writeFileSync(outputPath, report);
  console.log(`Rapport écrit : ${outputPath} (${checks.length} fonds)`);
} else {
  console.log(report);
}
