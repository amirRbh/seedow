/**
 * PROBE read-only — DÉCOUVERTE du catalogue produit iShares (le probe précédent a
 * montré 8/8 émetteurs joignables ; le verrou restant est le mécanisme ISIN → URL
 * de KID). iShares expose un « product screener » JSON public que son propre site
 * consomme : s'il contient nos ISIN IE + une URL de document par fonds, il devient
 * la brique de résolution d'URL de l'`IsharesResolver`.
 *
 * Ce probe TESTE plusieurs endpoints candidats (URLs publiques du screener) et
 * IMPRIME, pour chacun : statut HTTP, taille, présence de nos ISIN de test, et un
 * échantillon de STRUCTURE (clés de haut niveau + clés d'un enregistrement). Il ne
 * devine aucune URL de KID, n'écrit rien, n'ingère rien : il révèle la forme réelle
 * du JSON pour écrire ENSUITE un mapper correct (pas deviné).
 *
 * Usage : bun run scripts/probe-ishares-catalog.ts
 */

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 500;

// ISIN de test (ETF iShares UCITS grand public, domicile IE).
const TEST_ISINS = ["IE00B4L5Y983", "IE00B5BMR087", "IE00BKM4GZ66"];

// Endpoints candidats du « product screener » iShares (URLs publiques du site,
// variantes régionales). On mesure lesquels répondent et portent nos ISIN.
const CANDIDATES: { label: string; url: string }[] = [
  {
    label: "uk-retail",
    url: "https://www.ishares.com/uk/individual/en/product-screener/product-screener-v3.1.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/uk-retail/product-screener&siteEntryPassthrough=true",
  },
  {
    label: "uk-professional",
    url: "https://www.ishares.com/uk/professional/en/product-screener/product-screener-v3.1.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/uk-professional/product-screener&siteEntryPassthrough=true",
  },
  {
    label: "ch-individual",
    url: "https://www.ishares.com/ch/individual/en/product-screener/product-screener-v3.1.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/ch-one/product-screener&siteEntryPassthrough=true",
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

async function main(): Promise<void> {
  console.log(
    `[ishares-probe] read-only · découverte catalogue · ISIN test: ${TEST_ISINS.join(", ")}`,
  );
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
