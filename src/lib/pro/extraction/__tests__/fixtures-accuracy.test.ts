/**
 * Précision de l'extraction sur les annexes de référence, rejouée SANS appel
 * réseau à partir des sorties du modèle mises en cache par
 * `bun run scripts/pro/eval-fixtures.ts` (fixtures/annexes/extractions/).
 *
 * La vérification des citations est recalculée ici contre le texte pdfjs : un
 * changement de `verify.ts` se mesure donc sans ré-extraire. Objectif : 100 %
 * sur les champs des axes (a), (b), (c).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pdfPagesText } from "../../../../../scripts/pro/lib/pdf-text";
import { expectedFileSchema, formatAccuracy, scoreExtractions } from "../accuracy";
import { EXTRACTION_VERSION } from "../prompt";
import { extractionSchema } from "../schema";
import { sustainabilityValues, type SustainabilityValues } from "../to-row";
import { verifyExtraction } from "../verify";

const DIR = "fixtures/annexes";
const expected = expectedFileSchema.parse(
  JSON.parse(await readFile(`${DIR}/expected.json`, "utf8")),
).fixtures;
const names = Object.keys(expected);
const cached = names.filter((n) => existsSync(`${DIR}/extractions/${n}.json`));

describe.skipIf(cached.length < names.length)(
  `précision sur ${names.length} annexes (${EXTRACTION_VERSION})`,
  () => {
    it("100 % sur les axes (a), (b), (c)", async () => {
      const actual: Record<string, SustainabilityValues> = {};
      for (const name of names) {
        const raw = JSON.parse(await readFile(`${DIR}/extractions/${name}.json`, "utf8"));
        expect(raw.extraction_version).toBe(EXTRACTION_VERSION);
        const x = extractionSchema.parse(raw.extraction);
        const pages = await pdfPagesText(new Uint8Array(await readFile(`${DIR}/${name}`)));
        actual[name] = sustainabilityValues(x, verifyExtraction(x, pages));
      }
      const report = scoreExtractions(expected, actual);
      console.log(formatAccuracy(report));
      expect(report.perAxis.a.correct, "axe (a)").toBe(report.perAxis.a.total);
      expect(report.perAxis.b.correct, "axe (b)").toBe(report.perAxis.b.total);
      expect(report.perAxis.c.correct, "axe (c)").toBe(report.perAxis.c.total);
    }, 60_000);
  },
);
