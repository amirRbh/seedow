/**
 * Seedow Wrapped — carte partageable du bilan (format story, DA §4).
 * Réutilise les helpers canvas de shareCard.ts. Contenu passé en paramètre
 * (i18n côté composant), chiffres honnêtes issus des vrais votes.
 */

import {
  CARD_DA as DA,
  CARD_W as W,
  CARD_H as H,
  CARD_PAD as PAD,
  ensureCardFonts,
  wrapLines,
} from "./shareCard";

export interface WrappedCardData {
  eyebrow: string;
  totalVotes: string;
  totalVotesLabel: string;
  refusals: string;
  refusalsLabel: string;
  blocLine: string | null;
  tagline: string;
}

export async function renderWrappedCard(data: WrappedCardData): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("renderWrappedCard doit être appelé côté navigateur.");
  }
  await ensureCardFonts();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte canvas indisponible.");

  ctx.fillStyle = DA.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // En-tête marque
  ctx.fillStyle = DA.mint;
  ctx.beginPath();
  ctx.arc(PAD + 8, PAD + 4, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '500 30px "IBM Plex Mono"';
  ctx.fillStyle = DA.paper;
  ctx.fillText("SEEDOW", PAD + 30, PAD + 14);

  // Eyebrow
  ctx.font = '500 30px "IBM Plex Mono"';
  ctx.fillStyle = DA.mint;
  ctx.fillText(data.eyebrow.toUpperCase(), PAD, 300);

  // Stat 1 — votes exprimés
  ctx.font = "800 180px Inter";
  ctx.fillStyle = DA.paper;
  ctx.fillText(data.totalVotes, PAD - 4, 480);
  ctx.font = "400 40px Inter";
  ctx.fillStyle = DA.ink2;
  ctx.fillText(data.totalVotesLabel, PAD, 535);

  // Stat 2 — refus
  ctx.font = "800 180px Inter";
  ctx.fillStyle = DA.paper;
  ctx.fillText(data.refusals, PAD - 4, 760);
  ctx.font = "400 40px Inter";
  ctx.fillStyle = DA.ink2;
  ctx.fillText(data.refusalsLabel, PAD, 815);

  // Filet mint
  ctx.strokeStyle = DA.mint;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, 880);
  ctx.lineTo(PAD + 96, 880);
  ctx.stroke();

  // Ligne « plus grand Bloc »
  if (data.blocLine) {
    ctx.font = "600 44px Inter";
    ctx.fillStyle = DA.paper;
    let y = 950;
    for (const line of wrapLines(ctx, data.blocLine, W - PAD * 2, 3)) {
      ctx.fillText(line, PAD, y);
      y += 56;
    }
  }

  // Signature de marque, ancrée en bas
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
