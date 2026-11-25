/**
 * Rendu A4 du rapport d'adéquation avec pdf-lib (pur JS : tourne dans le
 * Worker comme dans les scripts, sans navigateur). Les polices sont injectées
 * (octets TTF/WOFF) : le module ne fait aucune I/O.
 *
 * Rendu déterministe : même `ComputedReport` + mêmes polices → mêmes octets
 * (dates de métadonnées fixées sur `created_at`), donc un rapport archivé peut
 * être régénéré et comparé à son empreinte.
 *
 * DA : fond blanc, encre #1D1D1F, encre secondaire #86868B (métadonnées
 * seulement), filets #D2D2D7, accent mint unique ; verdicts mint / ambre /
 * rouge toujours doublés d'un libellé. Inter pour le texte, IBM Plex Mono pour
 * chiffres et libellés. Ni dégradé ni ombre, texte aligné à gauche.
 */
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { PAI_CATEGORY_LABELS, formatPct } from "../matching/engine";
import {
  ALERT_LABELS,
  AXIS_STATUS_LABELS,
  AXIS_TITLES,
  LEGAL_NOTICE,
  VERDICT_LABELS,
} from "../labels";
import type { MatchResult, Verdict } from "../matching/types";

export { ALERT_LABELS, AXIS_STATUS_LABELS, LEGAL_NOTICE, VERDICT_LABELS };
import type { ComputedReport, ReportFund } from "./model";

export interface ReportFonts {
  interRegular: Uint8Array;
  interSemiBold: Uint8Array;
  monoRegular: Uint8Array;
  monoMedium: Uint8Array;
}

const hex = (h: string): RGB =>
  rgb(
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  );

/** Tokens du rapport (une seule définition, pas de couleur en dur ailleurs). */
export const REPORT_TOKENS = {
  ink: hex("#1D1D1F"),
  ink2: hex("#86868B"),
  rule: hex("#D2D2D7"),
  mint: hex("#1D8348"),
  amber: hex("#B7791F"),
  red: hex("#E11D48"),
  white: rgb(1, 1, 1),
} as const;
const C = REPORT_TOKENS;

const VERDICT_COLORS: Record<Verdict, RGB> = {
  ADEQUAT: C.mint,
  PARTIEL: C.amber,
  A_VERIFIER: C.amber,
  NON_ADEQUAT: C.red,
  NEUTRE: C.ink2,
};

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

const A4: [number, number] = [595.28, 841.89];
const M = { left: 48, right: 48, top: 64, bottom: 64 };
const W = A4[0] - M.left - M.right;

export interface Fonts {
  text: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

/** Remplace les glyphes absents des polices (cases à cocher des annexes…). */
const GLYPH_FALLBACKS: Record<string, string> = {
  "☒": "[x]",
  "☑": "[x]",
  "☐": "[ ]",
  "⚫": "•",
  "⚪": "•",
  "●": "•",
  "○": "•",
  "­": "",
};

export function sanitize(font: PDFFont, s: string): string {
  const supported = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of s.replace(/\s+/g, " ")) {
    if (supported.has(ch.codePointAt(0)!)) out += ch;
    else if (ch in GLYPH_FALLBACKS) out += GLYPH_FALLBACKS[ch];
    else out += "?";
  }
  return out;
}

/** Tronque une ligne avec « … » pour tenir dans `width`. */
function fitText(font: PDFFont, size: number, width: number, s: string): string {
  let t = sanitize(font, s);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Découpe en lignes tenant dans `width` ; coupe les mots trop longs (URL, empreintes). */
export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ").filter((w) => w.length > 0)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

class Layout {
  page!: PDFPage;
  y = 0;
  readonly pages: PDFPage[] = [];

  constructor(
    readonly doc: PDFDocument,
    readonly f: Fonts,
  ) {
    this.newPage();
  }

  newPage(): void {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - M.top;
  }

  ensure(h: number): void {
    if (this.y - h < M.bottom) this.newPage();
  }

  /** Paragraphe : renvoie la hauteur consommée. */
  text(
    s: string,
    o: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
      x?: number;
      width?: number;
      lead?: number;
      keep?: boolean;
    } = {},
  ): number {
    const font = o.font ?? this.f.text;
    const size = o.size ?? 10;
    const lead = o.lead ?? size * 1.4;
    const x = o.x ?? M.left;
    const lines = wrapText(sanitize(font, s), font, size, o.width ?? W - (x - M.left));
    if (o.keep) this.ensure(lines.length * lead);
    for (const line of lines) {
      this.ensure(lead);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: o.color ?? C.ink });
      this.y -= lead;
    }
    return lines.length * lead;
  }

  /** Hauteur qu'occuperait un paragraphe (pour garder un bloc d'un seul tenant). */
  measure(
    s: string,
    o: { font?: PDFFont; size?: number; width?: number; lead?: number } = {},
  ): number {
    const font = o.font ?? this.f.text;
    const size = o.size ?? 10;
    return wrapText(sanitize(font, s), font, size, o.width ?? W).length * (o.lead ?? size * 1.4);
  }

  gap(h: number): void {
    this.y -= h;
  }

  rule(color: RGB = C.rule): void {
    this.page.drawLine({
      start: { x: M.left, y: this.y },
      end: { x: M.left + W, y: this.y },
      thickness: 0.5,
      color,
    });
  }

  section(title: string): void {
    this.ensure(60);
    this.gap(10);
    this.rule(C.ink);
    this.gap(8);
    this.text(title, { font: this.f.bold, size: 13, lead: 18 });
    this.gap(4);
  }

  /** Libellé mono en capitales (métadonnée). */
  label(s: string, x = M.left, width?: number): void {
    this.text(s.toUpperCase(), { font: this.f.mono, size: 7.5, color: C.ink2, x, width, lead: 11 });
  }

  marker(color: RGB, x: number, yTop: number, size = 7): void {
    this.page.drawRectangle({ x, y: yTop - size, width: size, height: size, color });
  }
}

// ---------------------------------------------------------------------------
// Contenu
// ---------------------------------------------------------------------------

const shortHash = (h: string) => `${h.slice(0, 16)}…${h.slice(-8)}`;

function preferenceLines(r: ComputedReport): string[] {
  const p = r.input.profile;
  return [
    `(a) Proportion minimale d'investissements alignés sur la taxinomie de l'UE : ${
      p.taxonomy_min_pct === null ? "non exprimée" : `au moins ${formatPct(p.taxonomy_min_pct)}`
    }`,
    `(b) Proportion minimale d'investissements durables au sens de l'art. 2(17) SFDR : ${
      p.sfdr_min_pct === null ? "non exprimée" : `au moins ${formatPct(p.sfdr_min_pct)}`
    }`,
    `(c) Prise en compte des principales incidences négatives : ${
      !p.pai_required
        ? "non exprimée"
        : p.pai_categories.length
          ? `demandée, catégories : ${p.pai_categories.map((c) => PAI_CATEGORY_LABELS[c]).join(", ")}`
          : "demandée"
    }`,
  ];
}

function sourceSummary(fund: ReportFund, res: MatchResult): string {
  if (!fund.document) return "Aucune annexe";
  const pages = [
    ...new Set(res.axes.flatMap((a) => a.sources.flatMap((s) => (s.page ? [s.page] : [])))),
  ].sort((a, b) => a - b);
  return `${fund.document.doc_date ? `Annexe du ${fund.document.doc_date}` : "Annexe non datée"}${pages.length ? ` · p. ${pages.join(", ")}` : ""}`;
}

function extractionStatusLabel(fund: ReportFund): string {
  const e = fund.extraction;
  if (!e) return "aucune donnée extraite";
  if (e.status === "validated")
    return `validée par revue humaine${e.validated_at ? ` le ${e.validated_at.slice(0, 10)}` : ""}`;
  if (e.status === "needs_review") return "en attente de revue humaine";
  return "extraction automatique, citations vérifiées, non revue";
}

function drawHeaderBlock(L: Layout, r: ComputedReport): void {
  const { input } = r;
  L.text("Rapport d'adéquation aux préférences de durabilité", {
    font: L.f.bold,
    size: 18,
    lead: 24,
  });
  L.text(
    "Confrontation des préférences de durabilité du client aux annexes précontractuelles SFDR des fonds proposés.",
    {
      size: 9.5,
      color: C.ink2,
    },
  );
  L.gap(12);
  const cols: [string, string][] = [
    ["Cabinet", input.cabinet.name],
    ["N° ORIAS", input.cabinet.orias_number],
    ["Client (pseudonyme)", input.profile.client_ref],
    ["Date et heure", r.created_at_label],
    ["ID du rapport", input.report_id],
  ];
  const colW = W / 2;
  for (let i = 0; i < cols.length; i += 2) {
    const yStart = L.y;
    let maxH = 0;
    for (let j = 0; j < 2 && i + j < cols.length; j++) {
      L.y = yStart;
      const x = M.left + j * colW;
      L.label(cols[i + j][0], x, colW - 12);
      const isMono = cols[i + j][0] === "N° ORIAS" || cols[i + j][0] === "ID du rapport";
      L.text(cols[i + j][1], { x, width: colW - 12, font: isMono ? L.f.mono : L.f.text, size: 10 });
      maxH = Math.max(maxH, yStart - L.y);
    }
    L.y = yStart - maxH - 6;
  }
}

function drawPreferences(L: Layout, r: ComputedReport): void {
  const p = r.input.profile;
  L.section("1. Préférences de durabilité du client");
  L.text(`Préférences recueillies le ${p.collected_at}.`, { size: 9.5, color: C.ink2 });
  L.gap(4);
  for (const line of preferenceLines(r)) {
    L.text(line, { size: 10 });
    L.gap(2);
  }
  if (p.adapted) {
    L.gap(6);
    L.ensure(14 + L.measure(p.adaptation_note ?? "", { size: 9.5, width: W - 10 }));
    const top = L.y;
    L.text("Adaptation des préférences documentée", {
      font: L.f.bold,
      size: 10,
      x: M.left + 10,
      width: W - 10,
    });
    L.text(p.adaptation_note ?? "", { size: 9.5, x: M.left + 10, width: W - 10 });
    L.page.drawLine({
      start: { x: M.left + 2, y: top },
      end: { x: M.left + 2, y: L.y + 4 },
      thickness: 1.5,
      color: C.ink,
    });
  }
}

const TABLE_COLS = [
  { key: "fund", title: "Fonds", w: 128 },
  { key: "art", title: "Art.", w: 26 },
  { key: "verdict", title: "Verdict", w: 74 },
  { key: "axes", title: "Demandé / engagement", w: 120 },
  { key: "source", title: "Source", w: 75 },
  { key: "alerts", title: "Alertes", w: 76 },
] as const;

function drawSummary(L: Layout, r: ComputedReport): void {
  L.section("2. Synthèse par fonds");
  const counts = new Map<Verdict, number>();
  for (const res of r.results) counts.set(res.verdict, (counts.get(res.verdict) ?? 0) + 1);
  const order: Verdict[] = ["ADEQUAT", "PARTIEL", "NON_ADEQUAT", "A_VERIFIER", "NEUTRE"];
  L.text(
    `${r.results.length} fonds examinés : ` +
      order
        .filter((v) => counts.has(v))
        .map((v) => `${VERDICT_LABELS[v]} : ${counts.get(v)}`)
        .join(" · "),
    { size: 10 },
  );
  L.gap(8);

  const PAD = 4;
  const header = () => {
    L.ensure(24);
    let x = M.left;
    for (const c of TABLE_COLS) {
      L.page.drawText(c.title.toUpperCase(), {
        x,
        y: L.y - 8,
        size: 7,
        font: L.f.mono,
        color: C.ink2,
      });
      x += c.w;
    }
    L.y -= 13;
    L.rule(C.ink);
  };
  header();

  r.results.forEach((res, i) => {
    const fund = r.input.funds[i];
    type Cell = { lines: { s: string; font: PDFFont; size: number; color?: RGB }[]; marker?: RGB };
    const wrapCell = (s: string, font: PDFFont, size: number, w: number, color?: RGB) =>
      wrapText(sanitize(font, s), font, size, w - PAD).map((l) => ({ s: l, font, size, color }));
    const cells: Cell[] = [
      {
        lines: [
          ...wrapCell(res.isin, L.f.mono, 8, TABLE_COLS[0].w, C.ink2),
          ...wrapCell(res.fund_name ?? "Fonds sans données", L.f.text, 9, TABLE_COLS[0].w),
        ],
      },
      {
        lines: wrapCell(
          fund.data?.sfdr_article ? String(fund.data.sfdr_article) : "?",
          L.f.mono,
          9.5,
          TABLE_COLS[1].w,
        ),
      },
      {
        lines: wrapCell(VERDICT_LABELS[res.verdict], L.f.bold, 9.5, TABLE_COLS[2].w - 11),
        marker: VERDICT_COLORS[res.verdict],
      },
      {
        lines: res.axes.length
          ? res.axes.flatMap((a) => [
              ...wrapCell(
                `(${a.axis}) ${a.requested.replace("prise en compte des PAI", "PAI")} / ${a.fund_value}`,
                L.f.mono,
                8,
                TABLE_COLS[3].w,
              ),
              ...wrapCell(AXIS_STATUS_LABELS[a.status], L.f.text, 9, TABLE_COLS[3].w),
            ])
          : wrapCell("Aucune préférence exprimée", L.f.text, 9, TABLE_COLS[3].w),
      },
      { lines: wrapCell(sourceSummary(fund, res), L.f.mono, 8, TABLE_COLS[4].w) },
      {
        lines: res.alerts.length
          ? res.alerts.flatMap((a) =>
              wrapCell(ALERT_LABELS[a.code], L.f.text, 8.5, TABLE_COLS[5].w),
            )
          : wrapCell("—", L.f.text, 8.5, TABLE_COLS[5].w),
      },
    ];
    const lineH = (l: { size: number }) => l.size * 1.35;
    const rowH = Math.max(...cells.map((c) => c.lines.reduce((h, l) => h + lineH(l), 0))) + 2 * PAD;
    if (L.y - rowH < M.bottom) {
      L.newPage();
      header();
    }
    let x = M.left;
    cells.forEach((c, ci) => {
      let y = L.y - PAD;
      const dx = c.marker ? 11 : 0;
      if (c.marker) L.marker(c.marker, x, y - 1.5);
      for (const l of c.lines) {
        L.page.drawText(l.s, {
          x: x + dx,
          y: y - l.size,
          size: l.size,
          font: l.font,
          color: l.color ?? C.ink,
        });
        y -= lineH(l);
      }
      x += TABLE_COLS[ci].w;
    });
    L.y -= rowH;
    L.rule();
  });
}

function drawFundDetail(L: Layout, r: ComputedReport, i: number): void {
  const res = r.results[i];
  const fund = r.input.funds[i];
  L.ensure(140);
  L.gap(10);
  L.text(res.isin, { font: L.f.mono, size: 8.5, color: C.ink2, lead: 12 });
  L.text(res.fund_name ?? "Fonds sans données", { font: L.f.bold, size: 12, lead: 16 });
  const yv = L.y;
  L.marker(VERDICT_COLORS[res.verdict], M.left, yv - 2.5, 8);
  L.text(`Verdict : ${VERDICT_LABELS[res.verdict]}`, {
    font: L.f.bold,
    size: 10.5,
    x: M.left + 13,
  });
  L.text(res.verdict_reason, { size: 9.5, x: M.left + 13, width: W - 13 });
  L.gap(2);

  const meta: string[] = [];
  if (fund.data?.sfdr_article) meta.push(`Article ${fund.data.sfdr_article} SFDR`);
  if (fund.document) {
    meta.push(
      fund.document.doc_date
        ? `annexe précontractuelle du ${fund.document.doc_date}`
        : "annexe précontractuelle non datée",
    );
    if (fund.document.language) meta.push(`langue ${fund.document.language.toUpperCase()}`);
  } else meta.push("aucune annexe précontractuelle ingérée");
  L.text(meta.join(" · "), { size: 9.5, color: C.ink });
  if (fund.document) {
    L.text(`Empreinte SHA-256 du document : ${fund.document.sha256}`, {
      font: L.f.mono,
      size: 7.5,
      color: C.ink2,
      lead: 10.5,
    });
    if (fund.document.source_url)
      L.text(`Source : ${fund.document.source_url}`, {
        font: L.f.mono,
        size: 7.5,
        color: C.ink2,
        lead: 10.5,
      });
  }
  if (fund.extraction) {
    L.text(
      `Données : ${extractionStatusLabel(fund)} (${fund.extraction.version}, ${fund.extraction.model})`,
      {
        font: L.f.mono,
        size: 7.5,
        color: C.ink2,
        lead: 10.5,
      },
    );
  }

  for (const a of res.axes) {
    L.gap(6);
    L.ensure(48);
    L.text(AXIS_TITLES[a.axis], { font: L.f.bold, size: 10, keep: true });
    L.text(
      `Demandé : ${a.requested} · Engagement du fonds : ${a.fund_value} · ${AXIS_STATUS_LABELS[a.status]}`,
      {
        font: L.f.mono,
        size: 8.5,
        lead: 12,
      },
    );
    L.text(a.detail, { size: 9.5 });
    const seen = new Set<string>();
    for (const s of a.sources) {
      const key = `${s.page}|${s.quote}`;
      if (seen.has(key)) continue; // même citation pour deux champs : affichée une fois
      seen.add(key);
      if (!s.quote) continue;
      L.gap(2);
      L.ensure(10.5 + L.measure(`« ${s.quote.trim()} »`, { size: 9.5, width: W - 10 }));
      const top = L.y;
      L.text(`p. ${s.page ?? "?"}`, {
        font: L.f.mono,
        size: 7.5,
        color: C.ink2,
        x: M.left + 10,
        lead: 10.5,
      });
      L.text(`« ${s.quote.trim()} »`, { size: 9.5, x: M.left + 10, width: W - 10 });
      L.page.drawLine({
        start: { x: M.left + 3, y: top },
        end: { x: M.left + 3, y: L.y + 3 },
        thickness: 1,
        color: C.rule,
      });
    }
  }
  if (res.axes.length === 0)
    L.text("Aucune préférence exprimée : pas d'axe à confronter.", { size: 9.5 });

  if (res.alerts.length) {
    L.gap(6);
    L.text("Constats", { font: L.f.bold, size: 10, keep: true });
    for (const al of res.alerts) {
      L.gap(2);
      const pages = al.sources.flatMap((s) => (s.page ? [s.page] : []));
      L.text(
        `${al.level === "attention" ? "ATTENTION" : "INFO"} · ${al.code}${pages.length ? ` · p. ${pages.join(", ")}` : ""}`,
        {
          font: L.f.mono,
          size: 7.5,
          color: C.ink2,
          lead: 10.5,
          keep: true,
        },
      );
      L.text(al.message, { size: 9.5 });
    }
  }
  L.gap(6);
  L.rule();
}

function drawMethodology(L: Layout, r: ComputedReport): void {
  L.section("4. Méthodologie et limites");
  const paras = [
    "Données. Les engagements des fonds proviennent exclusivement des annexes précontractuelles SFDR (règlement délégué (UE) 2022/1288, annexe II pour les produits de l'article 8, annexe III pour l'article 9). Chaque valeur est adossée à une citation et à un numéro de page ; la présence de la citation sur la page est vérifiée automatiquement contre le texte du document. Les valeurs ambiguës, manquantes ou lues uniquement sur un élément graphique sont soumises à une revue humaine.",
    "Règles. Pour chaque préférence exprimée : (a) l'engagement minimum d'alignement sur la taxinomie est comparé au minimum demandé, en retenant la valeur la plus basse entre les graphiques avec et hors obligations souveraines ; (b) la proportion minimale d'investissements durables est comparée au minimum demandé ; (c) la prise en compte des principales incidences négatives est vérifiée, et chaque catégorie demandée doit être identifiable dans l'annexe. Une donnée absente n'est jamais considérée comme conforme. Un fonds relevant de l'article 6 ne satisfait ni (a) ni (b). Le verdict « adéquat » suppose que toutes les préférences exprimées soient conformes.",
    "Limites. Le rapport compare des engagements minimums déclarés, non la composition effective du portefeuille à une date donnée. Une annexe peut avoir été mise à jour depuis la date indiquée. Une annexe couvre l'ensemble des parts d'un fonds ; l'ISIN désigne la part examinée. Les constats signalent un écart entre le document et un seuil ; ils ne portent aucune appréciation sur la société de gestion.",
  ];
  for (const p of paras) {
    L.text(p, { size: 9.5 });
    L.gap(5);
  }
  L.gap(4);
  const rows: [string, string][] = [
    ["Version du moteur", r.engine_version],
    ["Version(s) d'extraction", r.extraction_versions.join(", ") || "—"],
    ["Date de référence", r.as_of],
    ["Empreinte des données (SHA-256)", r.data_snapshot_hash],
    ["Empreinte du contenu du rapport (SHA-256)", r.content_hash],
  ];
  for (const [k, v] of rows) {
    L.label(k);
    L.text(v, { font: L.f.mono, size: 8.5, lead: 12 });
    L.gap(3);
  }
  L.text(
    "Empreinte du fichier PDF : une empreinte ne peut pas figurer dans le fichier qu'elle identifie. Celle de ce PDF (SHA-256) est calculée à sa génération et archivée dans l'historique Seedow Pro du cabinet, où elle s'affiche au téléchargement.",
    { size: 9, color: C.ink },
  );
  L.gap(10);
  L.ensure(50);
  const top = L.y;
  L.gap(8);
  L.text(LEGAL_NOTICE, { font: L.f.bold, size: 10, x: M.left + 10, width: W - 20 });
  L.gap(6);
  L.page.drawRectangle({
    x: M.left,
    y: L.y,
    width: W,
    height: top - L.y,
    borderColor: C.ink,
    borderWidth: 0.75,
  });
}

function drawChrome(doc: PDFDocument, pages: PDFPage[], f: Fonts, r: ComputedReport): void {
  const n = pages.length;
  pages.forEach((page, i) => {
    const top = A4[1] - 32;
    page.drawText("SEEDOW PRO", { x: M.left, y: top, size: 7.5, font: f.monoBold, color: C.mint });
    const exampleLabel = "EXEMPLE — DONNÉES DE DÉMONSTRATION";
    const room =
      W - 62 - (r.input.example ? f.monoBold.widthOfTextAtSize(exampleLabel, 7.5) + 12 : 0);
    page.drawText(
      fitText(
        f.mono,
        7.5,
        room,
        `client ${r.input.profile.client_ref} · ORIAS ${r.input.cabinet.orias_number} · ${r.input.cabinet.name}`,
      ),
      {
        x: M.left + 62,
        y: top,
        size: 7.5,
        font: f.mono,
        color: C.ink2,
      },
    );
    if (r.input.example) {
      const w = f.monoBold.widthOfTextAtSize(exampleLabel, 7.5);
      page.drawText(exampleLabel, {
        x: M.left + W - w,
        y: top,
        size: 7.5,
        font: f.monoBold,
        color: C.red,
      });
    }
    page.drawLine({
      start: { x: M.left, y: top - 6 },
      end: { x: M.left + W, y: top - 6 },
      thickness: 0.5,
      color: C.rule,
    });
    const by = 30;
    page.drawLine({
      start: { x: M.left, y: by + 12 },
      end: { x: M.left + W, y: by + 12 },
      thickness: 0.5,
      color: C.rule,
    });
    page.drawText(
      "Outil d'aide à la documentation. Ne constitue pas un conseil en investissement.",
      {
        x: M.left,
        y: by,
        size: 7,
        font: f.text,
        color: C.ink2,
      },
    );
    const pn = `Rapport ${r.input.report_id.slice(0, 8)} · page ${i + 1}/${n}`;
    page.drawText(pn, {
      x: M.left + W - f.mono.widthOfTextAtSize(pn, 7),
      y: by,
      size: 7,
      font: f.mono,
      color: C.ink2,
    });
  });
  void doc;
}

/** Enregistre fontkit et embarque les quatre polices (sous-ensemble). */
export async function embedReportFonts(doc: PDFDocument, fonts: ReportFonts): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  return {
    text: await doc.embedFont(fonts.interRegular, { subset: true }),
    bold: await doc.embedFont(fonts.interSemiBold, { subset: true }),
    mono: await doc.embedFont(fonts.monoRegular, { subset: true }),
    monoBold: await doc.embedFont(fonts.monoMedium, { subset: true }),
  };
}

export async function renderReportPdf(r: ComputedReport, fonts: ReportFonts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await embedReportFonts(doc, fonts);
  const created = new Date(r.input.created_at);
  doc.setTitle(`Rapport d'adéquation durabilité — ${r.input.profile.client_ref} — ${r.as_of}`);
  doc.setAuthor(r.input.cabinet.name);
  doc.setSubject("Préférences de durabilité MiFID II — annexes précontractuelles SFDR");
  doc.setCreator("Seedow Pro");
  doc.setProducer(`Seedow Pro (moteur ${r.engine_version})`);
  doc.setKeywords([r.input.report_id, r.data_snapshot_hash, r.content_hash]);
  doc.setCreationDate(created);
  doc.setModificationDate(created);
  doc.setLanguage("fr-FR");

  const L = new Layout(doc, f);
  drawHeaderBlock(L, r);
  drawPreferences(L, r);
  drawSummary(L, r);
  L.section("3. Détail par fonds");
  L.text(
    "Pour chaque fonds : préférences confrontées, engagement du fonds et citations de l'annexe avec leur page.",
    {
      size: 9.5,
      color: C.ink2,
    },
  );
  r.results.forEach((_, i) => drawFundDetail(L, r, i));
  drawMethodology(L, r);
  drawChrome(doc, L.pages, f, r);

  return doc.save({ useObjectStreams: false });
}
