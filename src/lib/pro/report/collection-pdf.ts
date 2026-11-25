/**
 * Fiche de recueil des préférences de durabilité (A4), archivée à la création
 * du profil client. Elle trace sur support durable :
 *   - l'explication NEUTRE des trois critères remise au client (art. 54 §1 du
 *     règlement délégué 2017/565 ; synthèse SPOT AMF 2026, §3.3.1 : une
 *     explication non traçable est un manquement) ;
 *   - le parcours suivi (neutre, détaillé, prédéfini — document ACPR/AMF de
 *     novembre 2025) et les réponses du client ;
 *   - des emplacements de signature.
 * Module pur, rendu déterministe (mêmes entrées → mêmes octets).
 */
import { PDFDocument, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { z } from "zod";
import { LEGAL_NOTICE } from "../labels";
import { PAI_CATEGORY_LABELS, formatPct } from "../matching/engine";
import { parisDateTimeLabel, reportProfileSchema, type ReportProfile } from "./model";
import { REPORT_TOKENS as C, embedReportFonts, sanitize, wrapText, type ReportFonts } from "./pdf";

export const collectionSnapshotSchema = z.object({
  record_id: z.string().uuid(),
  created_at: z.string().datetime(),
  cabinet: z.object({ name: z.string().min(1), orias_number: z.string().regex(/^[0-9]{8}$/) }),
  profile: reportProfileSchema,
  example: z.boolean().default(false),
});
export type CollectionSnapshot = z.infer<typeof collectionSnapshotSchema>;

/** Explication neutre remise au client, reproduite telle quelle sur chaque fiche. */
export const NEUTRAL_EXPLANATION: readonly { title: string; body: string }[] = [
  {
    title: "Pourquoi cette question ?",
    body:
      "La réglementation (règlement délégué (UE) 2017/565, art. 2(7) et 54) demande à votre conseiller de vous " +
      "interroger sur vos éventuelles préférences en matière de durabilité avant tout conseil en investissement. " +
      "Y répondre est libre : vous pouvez n'en exprimer aucune. Ces préférences sont examinées après votre profil " +
      "d'investisseur (objectifs, situation financière, connaissances, tolérance au risque), jamais à sa place.",
  },
  {
    title: "Critère 1 — Taxinomie européenne",
    body:
      "Part minimale de votre investissement placée dans des activités économiques que la taxinomie de l'Union " +
      "européenne (règlement (UE) 2020/852) qualifie de durables sur le plan environnemental, selon des critères " +
      "techniques précis. Aujourd'hui, peu de fonds s'engagent sur une part élevée.",
  },
  {
    title: "Critère 2 — Investissements durables (SFDR)",
    body:
      "Part minimale placée dans des « investissements durables » au sens de l'article 2(17) du règlement (UE) " +
      "2019/2088 : des investissements qui contribuent à un objectif environnemental ou social, sans causer de " +
      "préjudice important aux autres objectifs, dans des entreprises bien gouvernées. Chaque société de gestion " +
      "applique sa propre méthode pour les identifier.",
  },
  {
    title: "Critère 3 — Principales incidences négatives",
    body:
      "Prise en compte, par le fonds, de ses principales incidences négatives sur l'environnement et la société " +
      "(par exemple émissions de gaz à effet de serre, biodiversité, eau, déchets, questions sociales). Vous pouvez " +
      "indiquer les thèmes qui comptent pour vous.",
  },
  {
    title: "Comment vos préférences sont appliquées",
    body:
      "Tous les critères que vous exprimez s'appliquent ensemble. Les engagements des fonds sont lus dans leur " +
      "annexe précontractuelle réglementaire et cités dans le rapport remis avec chaque conseil. Si aucun produit " +
      "ne correspond, votre conseiller vous le dit et peut vous proposer d'adapter vos préférences pour ce conseil " +
      "seulement : vous êtes libre d'accepter ou de refuser. En cas de refus, aucune recommandation ne vous est " +
      "présentée comme correspondant à vos préférences.",
  },
];

const A4: [number, number] = [595.28, 841.89];
const L = 52;
const W = A4[0] - 2 * L;
const TOP = A4[1] - 60;
const BOTTOM = 70;

class Flow {
  page!: PDFPage;
  y = 0;
  readonly pages: PDFPage[] = [];
  constructor(readonly doc: PDFDocument) {
    this.add();
  }
  add() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = TOP;
  }
  text(s: string, font: PDFFont, size: number, o: { color?: RGB; x?: number; lead?: number } = {}) {
    const x = o.x ?? L;
    const lead = o.lead ?? size * 1.42;
    for (const line of wrapText(sanitize(font, s), font, size, W - (x - L))) {
      if (this.y - lead < BOTTOM) this.add();
      this.page.drawText(line, { x, y: this.y - size, size, font, color: o.color ?? C.ink });
      this.y -= lead;
    }
  }
  gap(h: number) {
    this.y -= h;
  }
  rule(color: RGB = C.rule) {
    this.page.drawLine({
      start: { x: L, y: this.y },
      end: { x: L + W, y: this.y },
      thickness: 0.5,
      color,
    });
  }
  ensure(h: number) {
    if (this.y - h < BOTTOM) this.add();
  }
}

function answers(p: ReportProfile): { q: string; a: string }[] {
  const out = [
    {
      q: "Souhaitez-vous que vos préférences en matière de durabilité soient prises en compte ?",
      a:
        p.preference_mode === "neutral"
          ? "Non, ou ne se prononce pas (client « neutre »)."
          : "Oui.",
    },
  ];
  if (p.preference_mode === "neutral") return out;
  out.push({
    q: "Souhaitez-vous préciser vous-même ces préférences selon les trois critères réglementaires ?",
    a:
      p.preference_mode === "detailed"
        ? "Oui (préférences détaillées ci-dessous)."
        : "Non : le client a choisi l'un des profils prédéfinis présentés par le cabinet.",
  });
  return out;
}

function criteriaLines(p: ReportProfile): string[] {
  return [
    `Critère 1 — Taxinomie : ${p.taxonomy_min_pct === null ? "non retenu" : `au moins ${formatPct(p.taxonomy_min_pct)}`}`,
    `Critère 2 — Investissements durables (SFDR) : ${p.sfdr_min_pct === null ? "non retenu" : `au moins ${formatPct(p.sfdr_min_pct)}`}`,
    `Critère 3 — Principales incidences négatives : ${
      !p.pai_required
        ? "non retenu"
        : p.pai_categories.length
          ? `retenu — thèmes : ${p.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")}`
          : "retenu"
    }`,
  ];
}

export async function renderCollectionPdf(raw: unknown, fonts: ReportFonts): Promise<Uint8Array> {
  const s = collectionSnapshotSchema.parse(raw);
  const p = s.profile;
  const doc = await PDFDocument.create();
  const f = await embedReportFonts(doc, fonts);
  const created = new Date(s.created_at);
  doc.setTitle(
    `Fiche de recueil des préférences de durabilité — ${p.client_ref} — ${p.collected_at}`,
  );
  doc.setAuthor(s.cabinet.name);
  doc.setCreator("Seedow Pro");
  doc.setProducer("Seedow Pro");
  doc.setKeywords([s.record_id]);
  doc.setCreationDate(created);
  doc.setModificationDate(created);
  doc.setLanguage("fr-FR");

  const fl = new Flow(doc);
  fl.text("Fiche de recueil des préférences en matière de durabilité", f.bold, 17, { lead: 23 });
  fl.gap(6);
  const meta: [string, string][] = [
    ["Cabinet", `${s.cabinet.name} — ORIAS ${s.cabinet.orias_number}`],
    ["Client (pseudonyme)", p.client_ref],
    ["Date du recueil", p.collected_at],
    ["Fiche établie le", parisDateTimeLabel(s.created_at)],
    ["Identifiant de la fiche", s.record_id],
  ];
  if (p.joint_account) {
    meta.push(["Compte joint", "oui — une fiche est établie pour chaque co-titulaire"]);
  }
  for (const [k, v] of meta) {
    fl.text(k.toUpperCase(), f.mono, 7.5, { color: C.ink2, lead: 10.5 });
    fl.text(v, k === "Identifiant de la fiche" ? f.mono : f.text, 10, { lead: 14 });
    fl.gap(2);
  }

  fl.gap(8);
  fl.rule(C.ink);
  fl.gap(10);
  fl.text("1. Information remise au client", f.bold, 12.5, { lead: 18 });
  for (const part of NEUTRAL_EXPLANATION) {
    fl.ensure(40);
    fl.text(part.title, f.bold, 10, { lead: 14 });
    fl.text(part.body, f.text, 9.5);
    fl.gap(5);
  }

  fl.gap(6);
  fl.ensure(120);
  fl.rule(C.ink);
  fl.gap(10);
  fl.text("2. Réponses du client", f.bold, 12.5, { lead: 18 });
  for (const { q, a } of answers(p)) {
    fl.text(q, f.text, 9.5, { color: C.ink });
    fl.text(a, f.bold, 10, { lead: 15 });
    fl.gap(4);
  }
  if (p.preference_mode === "predefined") {
    fl.gap(2);
    fl.text(`Profil prédéfini choisi : ${p.predefined_label}`, f.bold, 10, { lead: 14 });
    fl.text(p.predefined_description ?? "", f.text, 9.5);
    fl.gap(4);
  }
  if (p.preference_mode !== "neutral") {
    fl.text("Préférences retenues", f.bold, 10, { lead: 14 });
    for (const line of criteriaLines(p)) fl.text(line, f.text, 10, { lead: 14 });
  } else {
    fl.text(
      "Aucune préférence de durabilité n'est retenue : des produits présentant ou non des caractéristiques de durabilité pourront être recommandés.",
      f.text,
      9.5,
    );
  }

  fl.gap(14);
  fl.ensure(130);
  fl.rule(C.ink);
  fl.gap(10);
  fl.text("3. Signatures", f.bold, 12.5, { lead: 18 });
  fl.text("Fait à ______________________________   le ____ / ____ / ________", f.text, 10, {
    lead: 22,
  });
  const boxTop = fl.y;
  const bw = (W - 20) / 2;
  for (const [i, label] of ["Le client", "Le conseiller"].entries()) {
    const x = L + i * (bw + 20);
    fl.page.drawRectangle({
      x,
      y: boxTop - 70,
      width: bw,
      height: 70,
      borderColor: C.rule,
      borderWidth: 0.75,
    });
    fl.page.drawText(label, { x: x + 8, y: boxTop - 16, size: 9, font: f.text, color: C.ink2 });
  }
  fl.y = boxTop - 80;

  const n = fl.pages.length;
  fl.pages.forEach((page, i) => {
    page.drawText("SEEDOW PRO · FICHE DE RECUEIL", {
      x: L,
      y: A4[1] - 34,
      size: 7.5,
      font: f.monoBold,
      color: C.mint,
    });
    if (s.example) {
      const lab = "EXEMPLE — DONNÉES DE DÉMONSTRATION";
      page.drawText(lab, {
        x: L + W - f.monoBold.widthOfTextAtSize(lab, 7.5),
        y: A4[1] - 34,
        size: 7.5,
        font: f.monoBold,
        color: C.red,
      });
    }
    page.drawLine({
      start: { x: L, y: 44 },
      end: { x: L + W, y: 44 },
      thickness: 0.5,
      color: C.rule,
    });
    wrapText(sanitize(f.text, LEGAL_NOTICE), f.text, 7, W - 70).forEach((line, j) =>
      page.drawText(line, { x: L, y: 34 - j * 9, size: 7, font: f.text, color: C.ink2 }),
    );
    const pn = `page ${i + 1}/${n}`;
    page.drawText(pn, {
      x: L + W - f.mono.widthOfTextAtSize(pn, 7),
      y: 34,
      size: 7,
      font: f.mono,
      color: C.ink2,
    });
  });
  return doc.save({ useObjectStreams: false });
}
