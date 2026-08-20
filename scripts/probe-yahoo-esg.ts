/**
 * PROBE read-only (go/no-go, cf. docs/esg-sources.md) : mesure quelle part de nos
 * ETF wirés renvoie un score ESG réel via Yahoo `esgScores` (Sustainalytics). NE
 * DÉCIDE RIEN, N'ÉCRIT RIEN — lit les symboles, interroge Yahoo, imprime un taux
 * de couverture. Selon le résultat on branchera Yahoo, on se rabattra sur le
 * KID/SFDR, ou on cherchera une autre source. Aucune ingestion ici.
 *
 * Le module `esgScores` vit sur l'endpoint v10 `quoteSummary`, qui exige un
 * `crumb` + cookie (contrairement au v8 `chart` des cours). On établit donc
 * cookie→crumb avant d'interroger. Si le crumb échoue, c'est en soi un résultat
 * (Yahoo ESG non joignable → no-go Yahoo).
 *
 * Usage : bun run scripts/probe-yahoo-esg.ts   (PROBE_LIMIT, défaut 50)
 */

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

function cookieHeaderFrom(res: Response): string {
  // Bun/undici : getSetCookie() renvoie chaque Set-Cookie ; on garde name=value.
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  return raw
    .filter(Boolean)
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function getCookieAndCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    let cookie = "";
    for (const seed of ["https://fc.yahoo.com", "https://finance.yahoo.com"]) {
      const r = await fetch(seed, { headers: { "User-Agent": UA } });
      cookie = cookieHeaderFrom(r);
      if (cookie) break;
    }
    if (!cookie) return null;
    const r = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie, Accept: "text/plain" },
    });
    const crumb = (await r.text()).trim();
    if (!r.ok || !crumb || crumb.includes("<") || crumb.length > 40) return null;
    return { cookie, crumb };
  } catch {
    return null;
  }
}

async function loadWiredSymbols(admin: Admin, limit: number): Promise<string[]> {
  const { data, error } = await admin
    .from("assets")
    .select("yahoo_symbol")
    .not("catalog_listing_key", "is", null)
    .not("yahoo_symbol", "is", null)
    .limit(limit);
  if (error) throw new Error(`load symbols: ${error.message}`);
  return ((data ?? []) as { yahoo_symbol: string }[]).map((r) => r.yahoo_symbol);
}

interface EsgHit {
  symbol: string;
  totalEsg: number | null;
}

async function fetchEsg(
  symbol: string,
  cookie: string,
  crumb: string,
): Promise<{ status: "hit" | "no_data" | "http_error"; totalEsg: number | null }> {
  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=esgScores&crumb=${encodeURIComponent(crumb)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Cookie: cookie, Accept: "application/json" },
  });
  if (!r.ok) return { status: "http_error", totalEsg: null };
  const j = (await r.json()) as {
    quoteSummary?: { result?: Array<{ esgScores?: { totalEsg?: { raw?: number } } }> };
  };
  const esg = j.quoteSummary?.result?.[0]?.esgScores;
  const total = esg?.totalEsg?.raw;
  if (esg && typeof total === "number") return { status: "hit", totalEsg: total };
  return { status: "no_data", totalEsg: null };
}

async function main(): Promise<void> {
  const limit = Math.max(1, Number(process.env.PROBE_LIMIT) || 50);
  console.log(`[esg-probe] read-only · limit: ${limit}`);

  const auth = await getCookieAndCrumb();
  if (!auth) {
    console.log(
      "[esg-probe] RÉSULTAT: crumb Yahoo indisponible → esgScores non joignable (no-go Yahoo).",
    );
    return;
  }
  console.log(`[esg-probe] crumb obtenu (${auth.crumb.length} car.)`);

  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const symbols = await loadWiredSymbols(supabaseAdmin as Admin, limit);
  console.log(`[esg-probe] symboles wirés testés: ${symbols.length}`);

  let hit = 0;
  let noData = 0;
  let httpError = 0;
  const samples: EsgHit[] = [];
  for (const s of symbols) {
    try {
      const r = await fetchEsg(s, auth.cookie, auth.crumb);
      if (r.status === "hit") {
        hit++;
        if (samples.length < 12) samples.push({ symbol: s, totalEsg: r.totalEsg });
      } else if (r.status === "no_data") noData++;
      else httpError++;
    } catch {
      httpError++;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const pct = symbols.length ? Math.round((hit / symbols.length) * 100) : 0;
  console.log(
    `[esg-probe] RÉSULTAT: hits=${hit} no_data=${noData} http_error=${httpError} ` +
      `→ couverture ESG ${pct}% (${hit}/${symbols.length})`,
  );
  for (const s of samples) console.log(`[esg-probe]   ex. ${s.symbol} totalEsg=${s.totalEsg}`);
  console.log("[esg-probe] (mesure seule — aucune écriture)");
}

main().catch((e) => {
  console.error("[esg-probe] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
