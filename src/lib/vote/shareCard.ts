/**
 * Ton Argent Vote — carte partageable du Bloc (point de viralité).
 *
 * Dessine une image PNG au format story (1080×1350) à la DA Seedow : fond encre,
 * accent mint, chiffres en IBM Plex Mono, signature de marque. Le contenu est
 * passé en paramètre (aucune chaîne codée en dur ici — l'i18n reste côté
 * composant). Rendu uniquement côté navigateur.
 *
 * NB : les couleurs sont codées en hex ici car un canvas ne lit pas les tokens
 * CSS `oklch` de styles.css — ce sont les mêmes valeurs que la palette §4.
 */

export interface BlocShareCardData {
  eyebrow: string; // "Le Bloc · en direct"
  wordmarkRight: string; // "Le Vote"
  bigNumber: string; // décompte déjà formaté ("12", "1 240")
  subline: string; // "personnes votent « Contre »."
  company: string;
  title: string;
  tagline: string; // signature de marque
}

/** Palette de la DA §4 en hex (le canvas ne lit pas les tokens oklch). */
export const CARD_DA = {
  ink: "#1d1d1f",
  paper: "#f5f5f7",
  ink2: "#86868b",
  mint: "#34c77b", // mint lisible sur fond encre (variante sombre de --mint)
};

const DA = CARD_DA;

/** Format story partagé par toutes les cartes Seedow. */
export const CARD_W = 1080;
export const CARD_H = 1350;
export const CARD_PAD = 96;

const W = CARD_W;
const H = CARD_H;
const PAD = CARD_PAD;

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Ellipse si le texte déborde du nombre de lignes autorisé.
  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    if (joined.length < text.length) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

export async function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load("800 220px Inter"),
      document.fonts.load("600 52px Inter"),
      document.fonts.load("400 40px Inter"),
      document.fonts.load('500 30px "IBM Plex Mono"'),
      document.fonts.ready,
    ]);
  } catch {
    // Polices indisponibles : le canvas retombe sur une police système. Acceptable.
  }
}

/**
 * Rend la carte dans un canvas hors-écran et renvoie un PNG. Lève si appelé
 * hors navigateur ou si l'encodage échoue — l'appelant gère le repli.
 */
export async function renderBlocShareCard(data: BlocShareCardData): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("renderBlocShareCard doit être appelé côté navigateur.");
  }
  await ensureCardFonts();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte canvas indisponible.");

  // Fond
  ctx.fillStyle = DA.ink;
  ctx.fillRect(0, 0, W, H);

  // ── En-tête : marque + rubrique ──
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = DA.mint;
  ctx.beginPath();
  ctx.arc(PAD + 8, PAD + 4, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '500 30px "IBM Plex Mono"';
  ctx.fillStyle = DA.paper;
  ctx.fillText("SEEDOW", PAD + 30, PAD + 14);
  ctx.textAlign = "right";
  ctx.fillStyle = DA.ink2;
  ctx.fillText(data.wordmarkRight.toUpperCase(), W - PAD, PAD + 14);
  ctx.textAlign = "left";

  // ── Eyebrow ──
  ctx.font = '500 30px "IBM Plex Mono"';
  ctx.fillStyle = DA.mint;
  ctx.fillText(data.eyebrow.toUpperCase(), PAD, 360);

  // ── Grand nombre ──
  ctx.font = "800 220px Inter";
  ctx.fillStyle = DA.paper;
  ctx.fillText(data.bigNumber, PAD - 4, 560);

  // ── Sous-ligne ──
  ctx.font = "400 40px Inter";
  ctx.fillStyle = DA.paper;
  const sublineLines = wrapLines(ctx, data.subline, W - PAD * 2, 2);
  let y = 630;
  for (const line of sublineLines) {
    ctx.fillText(line, PAD, y);
    y += 54;
  }

  // ── Filet mint ──
  y += 24;
  ctx.strokeStyle = DA.mint;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(PAD + 96, y);
  ctx.stroke();

  // ── Résolution : société + intitulé ──
  y += 64;
  ctx.font = '500 30px "IBM Plex Mono"';
  ctx.fillStyle = DA.ink2;
  ctx.fillText(data.company.toUpperCase(), PAD, y);
  y += 56;
  ctx.font = "600 52px Inter";
  ctx.fillStyle = DA.paper;
  const titleLines = wrapLines(ctx, data.title, W - PAD * 2, 3);
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y);
    y += 64;
  }

  // ── Signature de marque, ancrée en bas ──
  ctx.font = "400 40px Inter";
  ctx.fillStyle = DA.paper;
  const taglineLines = wrapLines(ctx, data.tagline, W - PAD * 2, 3);
  let ty = H - PAD - (taglineLines.length - 1) * 52;
  for (const line of taglineLines) {
    ctx.fillText(line, PAD, ty);
    ty += 52;
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Encodage PNG impossible."));
    }, "image/png");
  });
}

/** Déclenche le téléchargement d'un blob (repli quand le partage natif manque). */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
