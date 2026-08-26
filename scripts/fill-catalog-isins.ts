#!/usr/bin/env bun
/**
 * Renseigne les ISIN du catalogue — depuis une source fournie, jamais devinés.
 *
 * ── Pourquoi ce script n'invente rien ─────────────────────────────────────
 *
 * Un ISIN ne se dérive de rien. Ni du ticker, ni du nom, ni du pays. C'est un
 * identifiant attribué, qu'on lit quelque part ou qu'on ignore. Le déduire
 * reviendrait à désigner un titre au hasard — et un ISIN faux est PIRE qu'un
 * ISIN absent : il ne laisse rien vide, il pointe silencieusement vers une
 * autre valeur mobilière, et cette erreur se propage ensuite aux URL de fiche,
 * à l'Observatoire et à l'appariement des compositions.
 *
 * Ce script attend donc que la correspondance vienne d'ailleurs, et il en
 * garde la trace.
 *
 * ── Ce qu'il vérifie avant d'écrire ───────────────────────────────────────
 *
 *   · la CLÉ DE CONTRÔLE de l'ISIN (`isValidIsin`) — une faute de frappe ou un
 *     identifiant fabriqué ne passe pas ;
 *   · l'unicité dans le fichier ET dans le catalogue — deux fonds ne peuvent
 *     pas partager un ISIN ;
 *   · que le ticker existe et que sa case ISIN est VIDE — on ne remplace
 *     jamais une valeur déjà en base, on la signale.
 *
 * Rien n'est écrit sans `SEEDOW_PERSIST=1`. Le compte-rendu à blanc dit
 * exactement ce qui serait écrit, ce qui serait refusé, et pourquoi.
 *
 * ── Format d'entrée ───────────────────────────────────────────────────────
 *
 * Un CSV `ticker,isin,source` — la source est OBLIGATOIRE : un identifiant
 * sans origine n'est pas vérifiable, donc pas acceptable.
 *
 *     ticker,isin,source
 *     SUAS,IE00BYVJRP78,ishares.com/uk product page
 *     ICLN,US4642882249,blackrock.com/us fund facts
 *
 * Usage :
 *   bun run scripts/fill-catalog-isins.ts data/catalog-isins.csv
 *   SEEDOW_PERSIST=1 bun run scripts/fill-catalog-isins.ts data/catalog-isins.csv
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { isValidIsin, normalizeIsin } from "../src/lib/data-engine/isin";

const PERSIST = process.env.SEEDOW_PERSIST === "1";
const file = process.argv[2];
if (!file) {
  console.error("Usage : bun run scripts/fill-catalog-isins.ts <fichier.csv>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const admin = createClient(url, key);

interface Row {
  ticker: string;
  isin: string;
  source: string;
  line: number;
}

/** Lit le CSV. Une ligne mal formée est refusée, jamais complétée au mieux. */
function readRows(path: string): { rows: Row[]; rejected: string[] } {
  const rows: Row[] = [];
  const rejected: string[] = [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const seen = new Map<string, number>();

  lines.forEach((raw, i) => {
    const line = i + 1;
    const text = raw.trim();
    if (!text || /^ticker\s*,/i.test(text)) return; // vide ou en-tête
    const [ticker, isinRaw, ...rest] = text.split(",").map((c) => c.trim());
    const source = rest.join(",").trim();

    if (!ticker || !isinRaw) return void rejected.push(`l.${line} : ticker ou ISIN manquant`);
    if (!source)
      return void rejected.push(
        `l.${line} ${ticker} : source manquante — un identifiant sans origine n'est pas vérifiable`,
      );

    const isin = normalizeIsin(isinRaw);
    if (!isin || !isValidIsin(isin)) {
      return void rejected.push(
        `l.${line} ${ticker} : « ${isinRaw} » n'est pas un ISIN valide (clé de contrôle)`,
      );
    }
    const dup = seen.get(isin);
    if (dup) return void rejected.push(`l.${line} ${ticker} : ISIN ${isin} déjà utilisé l.${dup}`);
    seen.set(isin, line);
    rows.push({ ticker: ticker.toUpperCase(), isin, source, line });
  });

  return { rows, rejected };
}

async function main() {
  const { rows, rejected } = readRows(file);
  console.log(
    `${rows.length} correspondance(s) lue(s) · ${rejected.length} refusée(s)` +
      (PERSIST ? " · ÉCRITURE" : " · à blanc (SEEDOW_PERSIST=1 pour écrire)"),
  );
  for (const r of rejected) console.log(`  REFUSÉ  ${r}`);
  if (rows.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("assets")
    .select("id, ticker, name, isin")
    .in(
      "ticker",
      rows.map((r) => r.ticker),
    );
  if (error) throw new Error(`assets: ${error.message}`);

  const byTicker = new Map(
    ((data ?? []) as Array<{ id: string; ticker: string; name: string; isin: string | null }>).map(
      (a) => [a.ticker.toUpperCase(), a],
    ),
  );

  let written = 0;
  for (const r of rows) {
    const asset = byTicker.get(r.ticker);
    if (!asset) {
      console.log(`  ABSENT  ${r.ticker.padEnd(8)} pas dans le catalogue`);
      continue;
    }
    if (asset.isin) {
      // Ne jamais écraser : si les deux diffèrent, c'est un conflit à trancher
      // par un humain, pas par le dernier fichier importé.
      const verdict = asset.isin === r.isin ? "déjà identique" : `CONFLIT avec ${asset.isin}`;
      console.log(`  IGNORÉ  ${r.ticker.padEnd(8)} ${verdict}`);
      continue;
    }
    console.log(
      `  ${PERSIST ? "ÉCRIT  " : "PRÊT   "} ${r.ticker.padEnd(8)} ${r.isin}  ${asset.name}`,
    );
    if (PERSIST) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (admin as any)
        .from("assets")
        .update({ isin: r.isin })
        .eq("id", asset.id)
        .is("isin", null); // garde-fou : une course ne peut pas écraser
      if (upErr) {
        console.log(`          échec : ${upErr.message}`);
        continue;
      }
      written++;
    }
  }

  console.log(
    `\n${PERSIST ? `${written} ISIN écrit(s)` : "aucune écriture (à blanc)"} · ` +
      `${rows.length - written} non écrit(s)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
