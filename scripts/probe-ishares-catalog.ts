/**
 * PROBE read-only — DÉCOUVERTE du catalogue produit iShares (le probe précédent a
 * montré 8/8 émetteurs joignables ; le verrou restant est le mécanisme ISIN → URL
 * de KID). iShares expose un « product screener » JSON public que son propre site
 * consomme : s'il contient nos ISIN IE + une URL de document par fonds, il devient
 * la brique de résolution d'URL de l'`IsharesResolver`.
 *
 * Deux passes :
 *   A. DÉCOUVERTE DEPUIS LA PAGE (principal) — récupère la page de liste ETF (HTTP
 *      200 confirmé) et EXTRAIT les références d'endpoint que le site utilise
 *      lui-même (`.jsn`, `dcrPath`, `product-screener`, URLs de produits). On lit
 *      les références réelles du site, on ne devine pas.
 *   B. TEST d'endpoints candidats (secondaire) — mesure quelques URLs de screener
 *      (les premières essayées ont répondu 404/500).
 *
 * IMPRIME statut HTTP, taille, présence de nos ISIN de test, et la structure JSON.
 * N'écrit rien, n'ingère rien, ne devine aucune URL de KID.
 *
 * Usage : bun run scripts/probe-ishares-catalog.ts
 */

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 500;

// ISIN de test (ETF iShares UCITS grand public, domicile IE).
const TEST_ISINS = ["IE00B4L5Y983", "IE00B5BMR087", "IE00BKM4GZ66"];

// Pages de liste ETF iShares (HTML servi par le site — joignabilité 200 confirmée
// au probe précédent). On les lit pour DÉCOUVRIR l'endpoint de données réel.
const PAGES: { label: string; url: string }[] = [
  {
    label: "uk-etf-list",
    url: "https://www.ishares.com/uk/individual/en/products/etf-investments",
  },
  {
    label: "uk-etf-list-view",
    url: "https://www.ishares.com/uk/individual/en/products/etf-investments#/?productView=etf",
  },
];

/** Extrait de références d'endpoint que le site utilise (aucune deviné). */
function extractEndpoints(html: string): Record<string, string[]> {
  const uniq = (arr: string[]) => [...new Set(arr)].slice(0, 12);
  const grab = (re: RegExp) => uniq([...html.matchAll(re)].map((m) => m[0]));
  return {
    jsn: grab(/[A-Za-z0-9/_.-]*product-screener[A-Za-z0-9/_.-]*\.jsn/gi),
    // Les valeurs de dcrPath sont des chemins /templatedata/... (le vrai « verrou »).
    templatedata: grab(/\/templatedata\/[^"'&\s)]+/gi),
    ajaxJson: grab(/["'][^"']*\.(?:jsn|json)(?:\?[^"']*)?["']/gi),
  };
}

/** Contexte brut autour de la 1re occurrence d'une aiguille (révèle base + query). */
function contextAround(html: string, needle: string, span = 160): string | null {
  const i = html.indexOf(needle);
  if (i < 0) return null;
  return html
    .slice(Math.max(0, i - span), i + needle.length + span)
    .replace(/\s+/g, " ")
    .trim();
}

// Endpoints DÉCLARÉS par le site lui-même (extraits de son `url_map` / `urlMap` au
// run précédent) — on teste ce que iShares annonce, on ne devine plus.
const CANDIDATES: { label: string; url: string }[] = [
  { label: "cwpScreenerApi", url: "https://www.ishares.com/uk/individual/en/product-data.jsn" },
  { label: "compareEsgApi", url: "https://www.ishares.com/uk/individual/en/esg-product-data.jsn" },
  {
    label: "downloadExcelApi(v3)",
    url: "https://www.ishares.com/uk/individual/en/product-screener/product-screener-v3.jsn",
  },
];

/** Aplati les clés de premier et second niveau d'un objet JSON, pour révéler la forme. */
function structureHint(json: unknown): string {
  if (json == null || typeof json !== "object") return `(non-objet: ${typeof json})`;
  const top = Object.keys(json as Record<string, unknown>);
  const lines: string[] = [`top-level keys (${top.length}): ${top.slice(0, 12).join(", ")}`];
  // Cherche un premier « enregistrement » (valeur objet) pour montrer ses champs.
  for (const k of top.slice(0, 6)) {
    const v = (json as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      lines.push(
        `  ["${k}"] fields: ${Object.keys(v as Record<string, unknown>)
          .slice(0, 20)
          .join(", ")}`,
      );
      break;
    }
    if (Array.isArray(v) && v.length && typeof v[0] === "object") {
      lines.push(
        `  ["${k}"][0] fields: ${Object.keys(v[0] as Record<string, unknown>)
          .slice(0, 20)
          .join(", ")}`,
      );
      break;
    }
  }
  return lines.join("\n");
}

async function probeOne(url: string): Promise<void> {
  let status: number | "ERR" = "ERR";
  let text = "";
  let ctype = "";
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json,*/*" } });
    status = r.status;
    ctype = r.headers.get("content-type") ?? "";
    text = await r.text();
  } catch (e) {
    console.log(`      fetch error: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const isinsFound = TEST_ISINS.filter((i) => text.includes(i));
  // Signaux d'URL de document dans le corps brut (sans rien deviner).
  const kidHint = /kiid|"kid"|priips|literature|\.pdf/i.test(text);
  console.log(
    `      HTTP ${status} · ${ctype} · ${text.length}o · ISIN trouvés: ${isinsFound.length}/${TEST_ISINS.length} [${isinsFound.join(",")}] · indice doc/KID: ${kidHint}`,
  );

  if (status === 200 && text.length > 0) {
    try {
      const json = JSON.parse(text);
      console.log("      " + structureHint(json).replace(/\n/g, "\n      "));
    } catch {
      console.log(`      (corps non-JSON) préfixe: ${JSON.stringify(text.slice(0, 120))}`);
    }
  }
}

async function discoverFromPage(label: string, url: string): Promise<void> {
  let status: number | "ERR" = "ERR";
  let html = "";
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
    status = r.status;
    html = await r.text();
  } catch (e) {
    console.log(`      fetch error: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  const isinsFound = TEST_ISINS.filter((i) => html.includes(i));
  console.log(
    `      HTTP ${status} · ${html.length}o · ISIN inline: ${isinsFound.length}/${TEST_ISINS.length} [${isinsFound.join(",")}]`,
  );
  if (status === 200 && html.length > 0) {
    const refs = extractEndpoints(html);
    for (const [kind, matches] of Object.entries(refs)) {
      if (matches.length) console.log(`      ${kind}: ${matches.join(" | ")}`);
    }
    if (!Object.values(refs).some((m) => m.length)) {
      console.log("      (aucune référence d'endpoint dans le HTML brut → SPA rendu JS probable)");
    }
    // Contexte autour des endpoints de données ciblés (révèle base URL + dcrPath).
    for (const needle of ["esg-product-data.jsn", "product-data.jsn"]) {
      const ctx = contextAround(html, needle);
      if (ctx) console.log(`      ctx[${needle}]: …${ctx}…`);
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `[ishares-probe] read-only · découverte catalogue · ISIN test: ${TEST_ISINS.join(", ")}`,
  );
  console.log("[ishares-probe] === Passe A : découverte depuis la page de liste ETF ===");
  for (const p of PAGES) {
    console.log(`[ishares-probe] ${p.label}: ${p.url.slice(0, 90)}`);
    await discoverFromPage(p.label, p.url);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log("[ishares-probe] === Passe B : endpoints DÉCLARÉS par le site (url_map) ===");
  for (const c of CANDIDATES) {
    console.log(`[ishares-probe] ${c.label}: ${c.url.slice(0, 90)}…`);
    await probeOne(c.url);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(
    "[ishares-probe] (mesure seule — rien écrit, aucune URL de KID devinée ; sert à écrire le mapper)",
  );
}

main().catch((e) => {
  console.error("[ishares-probe] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
