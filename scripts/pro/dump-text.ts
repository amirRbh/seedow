/** Outil de diagnostic : imprime le texte page par page d'un PDF. */
import { readFile } from "node:fs/promises";
import { pdfPagesText } from "./lib/pdf-text";

const file = process.argv[2];
if (!file) {
  console.error("Usage : bun run scripts/pro/dump-text.ts <fichier.pdf>");
  process.exit(1);
}
const pages = await pdfPagesText(new Uint8Array(await readFile(file)));
pages.forEach((t, i) => console.log(`\n===== PAGE ${i + 1} =====\n${t}`));
