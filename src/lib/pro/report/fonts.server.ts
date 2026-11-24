/**
 * Polices du rapport embarquées dans le bundle serveur (Worker) : Vite les
 * inline en data URL base64 (~310 Ko au total). Importé dynamiquement par la
 * fonction serveur de génération uniquement, jamais par le client.
 */
import interRegular from "./fonts/Inter-Regular.ttf?inline";
import interSemiBold from "./fonts/Inter-SemiBold.ttf?inline";
import monoMedium from "./fonts/IBMPlexMono-Medium.woff?inline";
import monoRegular from "./fonts/IBMPlexMono-Regular.woff?inline";
import type { ReportFonts } from "./pdf";

function dataUrlBytes(url: string): Uint8Array {
  const b64 = url.slice(url.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bundledReportFonts(): ReportFonts {
  return {
    interRegular: dataUrlBytes(interRegular),
    interSemiBold: dataUrlBytes(interSemiBold),
    monoRegular: dataUrlBytes(monoRegular),
    monoMedium: dataUrlBytes(monoMedium),
  };
}
