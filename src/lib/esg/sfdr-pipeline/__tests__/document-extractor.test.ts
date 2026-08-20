import { describe, expect, it } from "vitest";
import { downloadAndExtract, hashBytes, type PdfToText } from "../document-extractor";

/** Fabrique une réponse fetch factice renvoyant `bytes` avec un statut donné. */
function fakeFetch(bytes: Uint8Array, status = 200): typeof fetch {
  return (async () =>
    new Response(bytes as BodyInit, {
      status,
      headers: { "Content-Type": "application/pdf" },
    })) as typeof fetch;
}

const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.7\nThe Fund is classified as an Article 8 product. padding padding padding.",
);

/** Backend PDF qui DÉTACHE le buffer (comme pdf.js/unpdf) puis renvoie du texte. */
const detachingPdfToText: PdfToText = async (bytes) => {
  // Transfère le buffer → détache `bytes` (reproduit le comportement pdf.js).
  structuredClone(bytes, { transfer: [bytes.buffer] });
  return { text: "The Fund is classified as an Article 8 product.", pages: 1 };
};

describe("downloadAndExtract", () => {
  it("hashe AVANT extraction : un backend qui détache le buffer ne fait pas planter", async () => {
    const out = await downloadAndExtract("http://x/kid.pdf", {
      fetchImpl: fakeFetch(PDF_BYTES),
      pdfToText: detachingPdfToText,
      now: () => "2026-08-20T00:00:00Z",
    });
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.doc.text).toContain("Article 8");
      expect(out.doc.documentHash).toMatch(/^[0-9a-f]{64}$/); // hash calculé, buffer vivant
    }
  });

  it("403 → blocked", async () => {
    const out = await downloadAndExtract("http://x/kid.pdf", {
      fetchImpl: fakeFetch(PDF_BYTES, 403),
      pdfToText: detachingPdfToText,
    });
    expect(out.status).toBe("blocked");
  });

  it("contenu non-PDF (HTML de consentement en 200) → parse_failed", async () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html>consent wall</html>");
    const out = await downloadAndExtract("http://x/kid.pdf", {
      fetchImpl: fakeFetch(html),
      pdfToText: detachingPdfToText,
    });
    expect(out.status).toBe("parse_failed");
  });

  it("hashBytes est stable et hex-64", async () => {
    const h = await hashBytes(new TextEncoder().encode("abc"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashBytes(new TextEncoder().encode("abc")));
  });
});
