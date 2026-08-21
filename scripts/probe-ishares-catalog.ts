/**
 * PROBE read-only — DÉCOUVERTE du catalogue produit iShares (le probe précédent a
 * montré 8/8 émetteurs joignables ; le verrou restant est le mécanisme ISIN → URL
 * de KID). iShares expose un « product screener » JSON public que son propre site
 * consomme : s'il contient nos ISIN IE + une URL de document par fonds, il devient
 * la brique de résolution d'URL de l'`IsharesResolver`.
 *
 * Trois passes :
 *   A. DÉCOUVERTE DEPUIS LA PAGE — extrait les références d'endpoint que le site
 *      utilise lui-même (`.jsn`, `dcrPath`, `templatedata`, `url_map`).
 *   B. TEST PARAMÉTRÉ — combine les fichiers découverts (`product-data.jsn`,
 *      `product-screener-v3.jsn`) avec la convention `dcrPath` de la plateforme CWP
 *      BlackRock, pour trouver le paramètre qui déclenche le catalogue.
 *   C. SCAN DES SCRIPTS — lit le JS de la page pour retrouver la construction EXACTE
 *      des paramètres (dcrPath/productPageId), au cas où B ne suffirait pas.
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

// `product-data.jsn` répond 200 mais `data` vide sans paramètres. On combine les
// FICHIERS découverts (url_map du site) avec la convention `dcrPath` documentée de
// la plateforme CWP BlackRock (chemin /templatedata/...). Toujours pas d'URL de KID
// devinée : on cherche le paramètre qui déclenche le catalogue.
const DCR = "dcrPath=/templatedata/config/product-screener-v3/data/en/uk-retail/product-screener";
const CANDIDATES: { label: string; url: string }[] = [
  {
    label: "screener-v3+dcrPath",
    url: `https://www.ishares.com/uk/individual/en/product-screener/product-screener-v3.jsn?${DCR}&siteEntryPassthrough=true`,
  },
  {
    label: "product-data+dcrPath",
    url: `https://www.ishares.com/uk/individual/en/product-data.jsn?${DCR}&siteEntryPassthrough=true`,
  },
  {
    label: "product-data+productPageId",
    url: "https://www.ishares.com/uk/individual/en/product-data.jsn?productPageId=&siteEntryPassthrough=true",
  },
];

// Scripts de la page ETF à scanner pour retrouver la construction EXACTE du dcrPath
// / des paramètres (lit le JS du site, ne devine rien).
const SCRIPT_SCAN_HINTS =
  /dcrPath|templatedata|productPageId|product-data\.jsn|siteEntryPassthrough/gi;

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

/** Passe C : scanne les scripts de la page pour la construction EXACTE des params. */
async function scanScripts(pageUrl: string): Promise<void> {
  let html = "";
  try {
    html = await (await fetch(pageUrl, { headers: { "User-Agent": UA } })).text();
  } catch (e) {
    console.log(`      fetch page error: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  // Résout les <script src> (relatifs → absolus), garde ceux au nom parlant.
  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((s) => /screener|product|main|app|bundle|chunk|vendor/i.test(s))
    .map((s) => new URL(s, pageUrl).toString());
  const uniq = [...new Set(srcs)].slice(0, 8);
  console.log(`      ${uniq.length} script(s) candidat(s) scanné(s)`);
  for (const src of uniq) {
    try {
      const js = await (await fetch(src, { headers: { "User-Agent": UA } })).text();
      const hits = [...new Set([...js.matchAll(SCRIPT_SCAN_HINTS)].map((m) => m[0]))];
      if (hits.length) {
        // Extrait un peu de contexte autour du 1er dcrPath/param trouvé.
        const idx = js.search(/dcrPath|product-data\.jsn|productPageId/i);
        const ctx = idx >= 0 ? js.slice(Math.max(0, idx - 80), idx + 160).replace(/\s+/g, " ") : "";
        console.log(`      [${src.slice(-48)}] hits: ${hits.join(",")}${ctx ? ` · …${ctx}…` : ""}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      /* ignore un script injoignable */
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
  console.log("[ishares-probe] === Passe B : fichiers découverts + convention dcrPath ===");
  for (const c of CANDIDATES) {
    console.log(`[ishares-probe] ${c.label}: ${c.url.slice(0, 110)}…`);
    await probeOne(c.url);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log("[ishares-probe] === Passe C : scan des scripts pour la construction des params ===");
  await scanScripts(PAGES[0].url);
  console.log(
    "[ishares-probe] (mesure seule — rien écrit, aucune URL de KID devinée ; sert à écrire le mapper)",
  );
}

main().catch((e) => {
  console.error("[ishares-probe] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
