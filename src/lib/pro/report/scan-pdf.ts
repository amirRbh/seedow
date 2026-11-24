/**
 * Synthèse d'un scan de contrat sur UNE page A4 : « X UC sur Y non adéquates
 * pour un profil Fort, voici lesquelles », les trois profils types (affichés
 * comme hypothèses), la couverture des données. Le détail complet est dans le
 * CSV livré avec. Même DA et mêmes polices que le rapport d'adéquation.
 */
import { PDFDocument, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { ALERT_LABELS, LEGAL_NOTICE, pctOrDash } from "../labels";
import type { ScanResult, ScanRow } from "../scan/scan";
import { REPORT_TOKENS as C, embedReportFonts, sanitize, wrapText, type ReportFonts } from "./pdf";

const A4: [number, number] = [595.28, 841.89];
const L = 48;
const W = A4[0] - 2 * L;
const BOTTOM = 70;

interface Ctx {
  page: PDFPage;
  y: number;
}

function text(
  c: Ctx,
  s: string,
  font: PDFFont,
  size: number,
  o: { x?: number; width?: number; color?: RGB; lead?: number; maxLines?: number } = {},
): void {
  const x = o.x ?? L;
  const lead = o.lead ?? size * 1.35;
  let lines = wrapText(sanitize(font, s), font, size, o.width ?? W - (x - L));
  if (o.maxLines && lines.length > o.maxLines)
    lines = [...lines.slice(0, o.maxLines - 1), `${lines[o.maxLines - 1]}…`];
  for (const line of lines) {
    c.page.drawText(line, { x, y: c.y - size, size, font, color: o.color ?? C.ink });
    c.y -= lead;
  }
}

function cellLine(
  c: Ctx,
  font: PDFFont,
  size: number,
  x: number,
  width: number,
  s: string,
  color: RGB = C.ink,
) {
  let t = sanitize(font, s);
  while (t.length > 1 && font.widthOfTextAtSize(t, size) > width) t = t.slice(0, -2) + "…";
  c.page.drawText(t, { x, y: c.y - size, size, font, color });
}

const MAX_LISTED = 20;

export async function renderScanPdf(
  r: ScanResult,
  focusProfile: string,
  fonts: ReportFonts,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await embedReportFonts(doc, fonts);
  const created = new Date(`${r.meta.as_of}T12:00:00Z`);
  doc.setTitle(`Scan de contrat — ${r.meta.contract_name} (${r.meta.insurer}) — ${r.meta.as_of}`);
  doc.setCreator("Seedow Pro");
  doc.setProducer(`Seedow Pro (moteur ${r.engine_version})`);
  doc.setCreationDate(created);
  doc.setModificationDate(created);
  doc.setLanguage("fr-FR");

  const page = doc.addPage(A4);
  const c: Ctx = { page, y: A4[1] - 40 };
  const focus = r.profiles.find((p) => p.key === focusProfile) ?? r.profiles[r.profiles.length - 1];

  page.drawText("SEEDOW PRO · SCAN DE CONTRAT", {
    x: L,
    y: c.y - 7.5,
    size: 7.5,
    font: f.monoBold,
    color: C.mint,
  });
  c.y -= 22;
  text(c, `${r.meta.contract_name} — ${r.meta.insurer}`, f.bold, 15, { lead: 20 });
  text(
    c,
    `Liste d'unités de compte du ${r.meta.list_date} · scan du ${r.meta.as_of} · moteur ${r.engine_version}`,
    f.mono,
    7.5,
    { color: C.ink2, lead: 11 },
  );
  c.y -= 12;

  // Titre-chiffre.
  const nonAdequate = focus.non_adequate + focus.partial;
  text(
    c,
    `${nonAdequate} UC sur ${focus.total} non adéquates pour un profil ${focus.label.toLowerCase()}`,
    f.bold,
    18,
    {
      lead: 23,
    },
  );
  const noData = r.coverage.without_data.length;
  text(
    c,
    `${focus.adequate} adéquates · ${focus.to_verify} à vérifier` +
      (noData ? `, dont ${noData} sans annexe ingérée` : "") +
      ` · hypothèse « ${focus.label} » : ${focus.hypothesis}.`,
    f.text,
    9.5,
    { lead: 13 },
  );
  c.y -= 10;

  // Les trois profils, côte à côte.
  const colW = W / r.profiles.length;
  const top = c.y;
  let lowest = c.y;
  r.profiles.forEach((p, i) => {
    const cc: Ctx = { page, y: top };
    const x = L + i * colW;
    text(cc, `PROFIL ${p.label.toUpperCase()}`, f.mono, 7.5, {
      x,
      width: colW - 14,
      color: C.ink2,
      lead: 11,
    });
    text(cc, p.hypothesis, f.text, 8.5, { x, width: colW - 14, lead: 11, maxLines: 3 });
    cc.y -= 2;
    text(cc, `Adéquates : ${p.adequate}`, f.mono, 8.5, { x, lead: 11.5 });
    text(cc, `Non adéquates : ${p.non_adequate + p.partial}`, f.mono, 8.5, { x, lead: 11.5 });
    text(cc, `À vérifier : ${p.to_verify}`, f.mono, 8.5, { x, lead: 11.5 });
    lowest = Math.min(lowest, cc.y);
  });
  c.y = lowest - 8;
  page.drawLine({
    start: { x: L, y: c.y },
    end: { x: L + W, y: c.y },
    thickness: 0.75,
    color: C.ink,
  });
  c.y -= 10;

  // Liste des UC non adéquates pour le profil retenu.
  text(c, `UC non adéquates pour le profil ${focus.label.toLowerCase()}`, f.bold, 11, { lead: 16 });
  const cols = [
    { title: "ISIN", w: 78 },
    { title: "Fonds", w: 170 },
    { title: "Durable min.", w: 56 },
    { title: "Taxinomie min.", w: 62 },
    { title: "PAI", w: 26 },
    { title: "Constats", w: W - 78 - 170 - 56 - 62 - 26 },
  ];
  let x = L;
  for (const col of cols) {
    page.drawText(col.title.toUpperCase(), {
      x,
      y: c.y - 7,
      size: 6.5,
      font: f.mono,
      color: C.ink2,
    });
    x += col.w;
  }
  c.y -= 12;
  const listed = r.rows.filter((row) => focus.non_adequate_isins.includes(row.isin));
  const shown = listed.slice(0, MAX_LISTED);
  const rowValues = (row: ScanRow): [string, string, string, string, string, string] => [
    row.isin,
    row.name ?? "—",
    pctOrDash(row.min_sustainable_pct),
    pctOrDash(row.min_taxonomy_pct),
    row.considers_pai === null ? "—" : row.considers_pai ? "oui" : "non",
    row.alerts.map((a) => ALERT_LABELS[a]).join(", ") || "—",
  ];
  let drawn = 0;
  for (const row of shown) {
    if (c.y < BOTTOM + 120) break; // la page doit garder la couverture et la méthode
    drawn++;
    page.drawLine({
      start: { x: L, y: c.y + 2 },
      end: { x: L + W, y: c.y + 2 },
      thickness: 0.4,
      color: C.rule,
    });
    x = L;
    rowValues(row).forEach((v, i) => {
      const font = i === 0 || i === 2 || i === 3 ? f.mono : f.text;
      cellLine(c, font, i === 5 ? 7.5 : 8.5, x, cols[i].w - 6, v);
      x += cols[i].w;
    });
    c.y -= 13;
  }
  if (listed.length === 0) text(c, "Aucune.", f.text, 9);
  else if (listed.length > drawn) {
    text(c, `… et ${listed.length - drawn} autre(s) : voir le CSV détaillé.`, f.text, 8.5, {
      color: C.ink,
    });
  }
  c.y -= 8;

  // Couverture et méthode.
  page.drawLine({
    start: { x: L, y: c.y },
    end: { x: L + W, y: c.y },
    thickness: 0.5,
    color: C.rule,
  });
  c.y -= 8;
  text(
    c,
    `Couverture : ${r.coverage.with_data} UC sur ${r.coverage.total} ont une annexe précontractuelle SFDR ingérée ` +
      `(${r.coverage.validated} validées par revue humaine, ${r.coverage.needs_review} en attente de revue).` +
      (noData
        ? ` Sans donnée (${noData}) : ${r.coverage.without_data.slice(0, 12).join(", ")}${noData > 12 ? ", …" : ""}.`
        : ""),
    f.text,
    8.5,
    { lead: 11.5 },
  );
  c.y -= 4;
  text(
    c,
    "Profils types : hypothèses de travail Seedow pour un premier tri, non des catégories réglementaires ; " +
      "l'adéquation se juge sur les préférences effectivement recueillies auprès de chaque client. Verdicts établis à " +
      "partir des engagements minimums des annexes précontractuelles SFDR ; une UC sans donnée ou dont les données " +
      "attendent une revue est « à vérifier », jamais « adéquate ». Détail par UC et par profil : CSV joint.",
    f.text,
    8,
    { lead: 11, color: C.ink },
  );

  // Pied de page.
  page.drawLine({
    start: { x: L, y: 42 },
    end: { x: L + W, y: 42 },
    thickness: 0.5,
    color: C.rule,
  });
  const foot = wrapText(sanitize(f.text, LEGAL_NOTICE), f.text, 7, W);
  foot.forEach((line, i) =>
    page.drawText(line, { x: L, y: 32 - i * 9, size: 7, font: f.text, color: C.ink2 }),
  );

  return doc.save({ useObjectStreams: false });
}
