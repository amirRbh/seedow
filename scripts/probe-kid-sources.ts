/**
 * PROBE read-only (cf. docs/esg-sources.md, pivot SFDR/KID) : teste la
 * JOIGNABILITÉ depuis GitHub Actions de sources candidates de données
 * réglementaires (SFDR / KID) pour des ISIN IE/LU, et si leur réponse porte un
 * signal SFDR exploitable. NE DÉCIDE RIEN, N'ÉCRIT RIEN, N'INGÈRE RIEN.
 *
 * Important : joignable ≠ droit d'exploiter. Une source d'agrégateur qui répond
 * n'est utilisable qu'après revue de ses conditions d'utilisation (§ pas de dark
 * pattern, respect des ToS). Ce probe ne fait que mesurer le mur d'egress et la
 * présence d'un signal — il ne branche aucune ingestion.
 *
 * Usage : bun run scripts/probe-kid-sources.ts
 */

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 400;

// ISIN IE/LU représentatifs (ETF UCITS grand public).
const TEST_ISINS = ["IE00B4L5Y983", "LU1681043599"];

interface Source {
  name: string;
  /** Construit la requête (URL + init) pour un ISIN. */
  build: (isin: string) => { url: string; init: RequestInit };
  /** Signal recherché dans le corps (donnée utile présente ?). */
  signal: RegExp;
  /** Ce que la source apporterait si exploitable. */
  yields: string;
}

const SOURCES: Source[] = [
  {
    name: "OpenFIGI (baseline identité)",
    build: (isin) => ({
      url: "https://api.openfigi.com/v3/mapping",
      init: {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/json" },
        body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
      },
    }),
    signal: /figi/i,
    yields: "identité/FIGI (pas de SFDR) — confirme que l'egress Actions marche hors Yahoo",
  },
  {
    name: "justETF (profil ETF)",
    build: (isin) => ({
      url: `https://www.justetf.com/en/etf-profile.html?isin=${isin}`,
      init: { headers: { "User-Agent": UA, Accept: "text/html" } },
    }),
    signal: /sfdr/i,
    yields: "classification SFDR (HTML) — ToS à vérifier avant tout usage",
  },
  {
    name: "extraETF (profil ETF)",
    build: (isin) => ({
      url: `https://extraetf.com/en/etf-profile/${isin}`,
      init: { headers: { "User-Agent": UA, Accept: "text/html" } },
    }),
    signal: /sfdr/i,
    yields: "classification SFDR (HTML) — ToS à vérifier avant tout usage",
  },
];

async function probeOne(
  src: Source,
  isin: string,
): Promise<{ status: number | "ERR"; signal: boolean; bytes: number }> {
  try {
    const { url, init } = src.build(isin);
    const r = await fetch(url, init);
    const text = await r.text();
    return { status: r.status, signal: src.signal.test(text), bytes: text.length };
  } catch {
    return { status: "ERR", signal: false, bytes: 0 };
  }
}

async function main(): Promise<void> {
  console.log(`[kid-probe] read-only · ISIN test: ${TEST_ISINS.join(", ")}`);
  for (const src of SOURCES) {
    let reachable = 0;
    let withSignal = 0;
    const lines: string[] = [];
    for (const isin of TEST_ISINS) {
      const res = await probeOne(src, isin);
      const ok = res.status === 200;
      if (ok) reachable++;
      if (res.signal) withSignal++;
      lines.push(`      ${isin}: HTTP ${res.status} · signal=${res.signal} · ${res.bytes}o`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    const verdict =
      reachable === 0
        ? "INJOIGNABLE (mur d'egress ou blocage bot)"
        : withSignal > 0
          ? "joignable + signal présent → candidat (ToS à vérifier)"
          : "joignable mais aucun signal SFDR détecté";
    console.log(`[kid-probe] ${src.name}: ${verdict}`);
    console.log(`[kid-probe]   apporte: ${src.yields}`);
    for (const l of lines) console.log(l);
  }
  console.log("[kid-probe] (mesure seule — aucune écriture, aucune ingestion)");
}

main().catch((e) => {
  console.error("[kid-probe] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
