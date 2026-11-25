/** Polices du rapport lues sur disque (scripts). Le Worker les chargera depuis ses assets. */
import { readFile } from "node:fs/promises";
import type { ReportFonts } from "../../../src/lib/pro/report/pdf";

const DIR = "src/lib/pro/report/fonts";

export async function loadReportFonts(): Promise<ReportFonts> {
  const read = async (f: string) => new Uint8Array(await readFile(`${DIR}/${f}`));
  return {
    interRegular: await read("Inter-Regular.ttf"),
    interSemiBold: await read("Inter-SemiBold.ttf"),
    monoRegular: await read("IBMPlexMono-Regular.woff"),
    monoMedium: await read("IBMPlexMono-Medium.woff"),
  };
}
