/**
 * PROBE read-only — le POC SFDR a montré que GECO donne 0 % de couverture pour un
 * catalogue IE/LU (cf. docs/esg-sources.md). La piste primaire suivante est le
 * **KID de l'asset-manager** (source officielle niveau 1). Avant de construire un
 * `IssuerResolver`, ce probe MESURE, depuis un runner GitHub Actions (egress
 * ouvert), si les domaines de publication des KID sont :
 *   1. JOIGNABLES (le doc `esg-sources.md` note « 403 même depuis Actions », mais
 *      c'est un constat historique — on le re-mesure) ;
 *   2. AUTORISÉS à l'automatisation par leur `robots.txt` (§16 : on ne collecte
 *      jamais contre un robots.txt qui l'interdit).
 *
 * Il NE DÉCIDE RIEN, N'ÉCRIT RIEN, N'INGÈRE RIEN, ne construit aucune URL de KID
 * inventée : il teste la **page d'accueil** et le **robots.txt** de chaque émetteur
 * (URLs stables et publiques), et lit ce que robots.txt autorise réellement sur
 * les chemins de documents. Joignable ≠ droit d'exploiter : la sortie sert
 * uniquement à décider s'il vaut la peine de chercher un mécanisme ISIN→URL de KID.
 *
 * Usage : bun run scripts/probe-issuer-kid.ts
 */

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";
const DELAY_MS = 400;

interface Issuer {
  key: string;
  name: string;
  /** Domaine officiel de publication (racine testée + robots.txt). */
  home: string;
  /** Chemins de documents typiques dont on veut savoir s'ils sont robots-autorisés. */
  docPaths: string[];
}

// Domaines OFFICIELS des principaux émetteurs de l'univers Seedow (IE/LU). On ne
// teste que la racine + robots.txt (URLs publiques stables) — aucune URL de KID
// devinée.
const ISSUERS: Issuer[] = [
  {
    key: "ishares",
    name: "iShares / BlackRock",
    home: "https://www.ishares.com",
    docPaths: ["/uk/individual/en/literature/", "/products/"],
  },
  {
    key: "amundi",
    name: "Amundi ETF",
    home: "https://www.amundietf.fr",
    docPaths: ["/fr/particuliers/", "/documents/"],
  },
  {
    key: "vanguard",
    name: "Vanguard",
    home: "https://www.vanguard.co.uk",
    docPaths: ["/professional/product/", "/literature/"],
  },
  { key: "ubs", name: "UBS ETF", home: "https://www.ubs.com", docPaths: ["/etf/", "/documents/"] },
  {
    key: "dws",
    name: "Xtrackers / DWS",
    home: "https://etf.dws.com",
    docPaths: ["/en-lu/", "/download/"],
  },
  {
    key: "invesco",
    name: "Invesco",
    home: "https://etf.invesco.com",
    docPaths: ["/uk/individual/en/", "/product/"],
  },
  {
    key: "ssga",
    name: "SPDR / State Street",
    home: "https://www.ssga.com",
    docPaths: ["/uk/en_gb/individual/etfs/", "/library-content/"],
  },
  {
    key: "hsbc",
    name: "HSBC AM",
    home: "https://www.assetmanagement.hsbc.com",
    docPaths: ["/en/individual-investor/", "/-/media/"],
  },
];

interface Result {
  home: { status: number | "ERR"; bytes: number };
  robots: { status: number | "ERR"; disallowsDocPaths: boolean; hasRules: boolean };
}

/** Analyse un robots.txt : un `Disallow` touchant l'un des docPaths pour `*` ? */
function robotsDisallows(
  robotsTxt: string,
  docPaths: string[],
): { disallows: boolean; hasRules: boolean } {
  const lines = robotsTxt.split(/\r?\n/);
  let appliesToAll = false;
  let sawUserAgent = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [kRaw, ...vParts] = line.split(":");
    const k = kRaw.trim().toLowerCase();
    const v = vParts.join(":").trim();
    if (k === "user-agent") {
      sawUserAgent = true;
      appliesToAll = v === "*";
    } else if (k === "disallow" && appliesToAll && v) {
      disallows.push(v);
    }
  }
  const hit = docPaths.some((p) => disallows.some((d) => p.startsWith(d) || d === "/"));
  return { disallows: hit, hasRules: sawUserAgent && disallows.length > 0 };
}

async function fetchText(
  url: string,
  init?: RequestInit,
): Promise<{ status: number | "ERR"; text: string }> {
  try {
    const r = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, ...(init?.headers ?? {}) },
    });
    const text = await r.text();
    return { status: r.status, text };
  } catch {
    return { status: "ERR", text: "" };
  }
}

async function probe(issuer: Issuer): Promise<Result> {
  const home = await fetchText(issuer.home, { headers: { Accept: "text/html" } });
  await new Promise((r) => setTimeout(r, DELAY_MS));
  const robots = await fetchText(new URL("/robots.txt", issuer.home).toString());
  const parsed =
    robots.status === 200
      ? robotsDisallows(robots.text, issuer.docPaths)
      : { disallows: false, hasRules: false };
  return {
    home: { status: home.status, bytes: home.text.length },
    robots: {
      status: robots.status,
      disallowsDocPaths: parsed.disallows,
      hasRules: parsed.hasRules,
    },
  };
}

function verdict(r: Result): string {
  if (r.home.status === "ERR" || (typeof r.home.status === "number" && r.home.status >= 400)) {
    return `INJOIGNABLE (home HTTP ${r.home.status}) → piste KID émetteur bloquée pour cet émetteur`;
  }
  if (r.robots.disallowsDocPaths) {
    return "joignable MAIS robots.txt interdit les chemins de documents → ne pas automatiser (§16)";
  }
  return "joignable + robots n'interdit pas les chemins de docs → candidat pour un IssuerResolver (URL KID à trouver)";
}

async function main(): Promise<void> {
  console.log(
    `[issuer-probe] read-only · ${ISSUERS.length} émetteurs · racine + robots.txt uniquement`,
  );
  let reachable = 0;
  let candidates = 0;
  for (const issuer of ISSUERS) {
    const res = await probe(issuer);
    const v = verdict(res);
    if (res.home.status === 200) reachable++;
    if (v.startsWith("joignable + robots")) candidates++;
    console.log(`[issuer-probe] ${issuer.name}: ${v}`);
    console.log(
      `      home HTTP ${res.home.status} (${res.home.bytes}o) · robots HTTP ${res.robots.status}` +
        ` · robots interdit docs: ${res.robots.disallowsDocPaths} · robots a des règles: ${res.robots.hasRules}`,
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(
    `\n[issuer-probe] SYNTHÈSE: ${reachable}/${ISSUERS.length} émetteurs joignables · ${candidates}/${ISSUERS.length} candidats (joignables + robots OK)`,
  );
  console.log("[issuer-probe] Décision :");
  if (candidates === 0) {
    console.log(
      "  → Mur d'egress ou robots restrictifs confirmés : la piste KID émetteur reste fermée.",
    );
    console.log("    Pivoter vers un flux EET/SFDR licencié (cf. docs/esg-sources.md).");
  } else {
    console.log(
      `  → ${candidates} émetteur(s) exploitable(s) techniquement : justifie de construire un`,
    );
    console.log(
      "    IssuerResolver (verrou restant = mécanisme ISIN→URL de KID, à trouver par émetteur).",
    );
  }
  console.log("[issuer-probe] (mesure seule — rien écrit, rien ingéré, aucune URL de KID devinée)");
}

main().catch((e) => {
  console.error("[issuer-probe] fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
