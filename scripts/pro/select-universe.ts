/**
 * Génère la liste versionnée des fonds de départ de la base UC (`data/pro/`).
 *
 *   bun run scripts/pro/select-universe.ts [--max-per-manager 4]
 *
 * Entrée : l'extrait GECO du repo (`data/prospects/geco-fonds-esg-2026-10-09.json`,
 * produit par `scripts/build-sgp-prospects.ts`). Sortie : `data/pro/uc-universe-v1.json`
 * (déterministe : même entrée → même fichier, relisible en revue de code).
 * Règles : `src/lib/pro/funds/universe.ts`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { gecoFundSchema, selectUniverse } from "../../src/lib/pro/funds/universe";

const SOURCE = "data/prospects/geco-fonds-esg-2026-10-09.json";
const SOURCE_DATE = "2026-10-09";
const OUT = "data/pro/uc-universe-v1.json";

const { values } = parseArgs({ options: { "max-per-manager": { type: "string", default: "4" } } });
const maxPerManager = Number(values["max-per-manager"]);

const raw = gecoFundSchema.array().parse(JSON.parse(await readFile(SOURCE, "utf8")));
const r = selectUniverse(raw, { maxPerManager, sourceDate: SOURCE_DATE });

await writeFile(
  OUT,
  JSON.stringify(
    {
      version: 1,
      source: { file: SOURCE, provider: "AMF — base GECO", retrieved_on: SOURCE_DATE },
      rules: {
        max_per_management_company: maxPerManager,
        description:
          "ISIN valide ; OPCVM ou FIVG ouverts à tous souscripteurs ; hors fonds à formule et monétaires ; " +
          "un ISIN par compartiment ; plafond par société de gestion (ordre alphabétique). " +
          "Ne dit pas qu'un fonds est plus durable, plus vendu ou plus présent en assurance-vie qu'un autre.",
      },
      input_count: raw.length,
      excluded: r.excluded,
      count: r.selected.length,
      funds: r.selected,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${r.selected.length} fonds retenus sur ${raw.length} → ${OUT}`);
console.log(`exclus : ${JSON.stringify(r.excluded)}`);
