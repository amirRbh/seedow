/**
 * Extraction du texte d'un PDF, page par page (pdfjs-dist, build « legacy »
 * pour Node). Sert UNIQUEMENT à vérifier les citations renvoyées par le
 * modèle : la valeur extraite n'est jamais tirée de ce texte.
 *
 * Script local (Node/Bun) — jamais importé par le Worker.
 */
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Texte de chaque page physique du PDF : `pages[0]` = page 1. */
export async function pdfPagesText(bytes: Uint8Array): Promise<string[]> {
  // pdfjs transfère (et détache) le buffer qu'on lui passe : on lui en donne une copie.
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    verbosity: VerbosityLevel.ERRORS,
  });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
      pages.push(text);
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
