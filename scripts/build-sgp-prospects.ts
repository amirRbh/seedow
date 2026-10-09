/**
 * Liste de prospects SGP — collecte depuis GECO (AMF), sans rien deviner.
 *
 *   bun run scripts/build-sgp-prospects.ts <dossier-de-sortie>
 *
 * 1. Interroge la recherche publique de fonds de GECO avec chaque terme du
 *    lexique ESMA (`esma-fund-names.ts`), en clair et accentué.
 * 2. Ne garde que les compartiments vivants, de droit français, ouverts à tous
 *    souscripteurs, dont le nom déclenche réellement un terme (`detectNameTerms`,
 *    mots entiers) — la recherche GECO est une sous-chaîne, elle ramène du bruit.
 * 3. Regroupe par société de gestion, puis lit sa fiche GECO (agrément, site,
 *    adresse) et le nombre total de ses compartiments.
 *
 * Sorties : `funds.json` (fonds retenus, avec ISIN de la part principale) et
 * `sgp.json` (une ligne par société : agrément, site, siège, standard). Aucune
 * personne physique n'est collectée.
 *
 * Courtoisie : requêtes séquentielles espacées de 400 ms (l'API est celle du
 * site public de l'AMF).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectNameTerms, requirementsFor } from "../src/lib/esg/naming/esma-fund-names";

const BASE = "https://geco.amf-france.org/back-office";
const PAUSE_MS = 400;

/** Termes interrogés : le lexique ESMA, plus les formes accentuées utiles. */
const KEYWORDS = [
  "durable",
  "durables",
  "durabilité",
  "sustainable",
  "sustainability",
  "ISR",
  "SRI",
  "ESG",
  "climat",
  "climate",
  "carbone",
  "carbon",
  "green",
  "vert",
  "verte",
  "environnement",
  "environmental",
  "biodiversité",
  "biodiversity",
  "planète",
  "planet",
  "nature",
  "eau",
  "water",
  "océan",
  "ocean",
  "renouvelable",
  "renewable",
  "solaire",
  "solar",
  "impact",
  "transition",
  "net zero",
  "social",
  "sociale",
  "solidaire",
  "inclusion",
  "égalité",
  "equality",
  "diversité",
  "gender",
  "gouvernance",
  "governance",
  "responsable",
  "responsible",
  "éthique",
  "ethical",
  "évolution",
  "transformation",
  "progress",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
async function getJson(url: string, init?: RequestInit): Promise<any | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return await res.json();
    } catch {
      /* réessai */
    }
    await sleep(1000 * (attempt + 1));
  }
  return null;
}

async function searchFunds(keyword: string): Promise<any[]> {
  const out: any[] = [];
  const rows = 100;
  for (let first = 0; ; first += rows) {
    const json = await getJson(`${BASE}/funds/search?keyword=${encodeURIComponent(keyword)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first, rows, sortOrder: 1, filters: {}, globalFilter: null }),
    });
    await sleep(PAUSE_MS);
    const page = json?.compartmentDtos ?? [];
    out.push(...page);
    // Une page peut revenir avec une ligne de moins que `rows` (dédoublonnage
    // côté serveur) : on s'arrête sur `total`, jamais sur une page courte.
    if (!json || page.length === 0 || first + rows >= (json.total ?? 0)) break;
  }
  return out;
}

export interface ProspectFund {
  cmpId: string;
  name: string;
  isin: string | null;
  family: string | null;
  amfClass: string | null;
  terms: string[];
  baseline: string | null;
  sgpId: number;
  sgpName: string;
  gecoUrl: string;
}

async function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error("Usage : bun run scripts/build-sgp-prospects.ts <dossier-de-sortie>");
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const funds = new Map<string, ProspectFund>();
  for (const kw of KEYWORDS) {
    const hits = await searchFunds(kw);
    let kept = 0;
    for (const c of hits) {
      if (funds.has(c.cmpId)) continue;
      if (c.cmpStatutCode !== "VIV" || c.prdDomcltn !== "FR") continue;
      if (c.cmpSouscrDedCode !== "TOUS") continue;
      if (c.gestionnaireAssocie?.countryCode !== "FR" || !c.gestionnaireId) continue;
      const terms = detectNameTerms(c.cmpNom ?? "");
      if (terms.length === 0) continue;
      funds.set(c.cmpId, {
        cmpId: c.cmpId,
        name: c.cmpNom,
        isin: c.cmpCodeParPrincp ?? null,
        family: c.prdNatureLib ?? c.prdFamlLib ?? null,
        amfClass: c.cmpClssFndAmfLib ?? null,
        terms: terms.map((t) => t.term),
        baseline: requirementsFor(terms).baseline,
        sgpId: c.gestionnaireId,
        sgpName: c.gestionnaire,
        gecoUrl: `https://geco.amf-france.org/produits-financiers/${c.cmpId}`,
      });
      kept++;
    }
    console.error(`« ${kw} » : ${hits.length} résultats, ${kept} nouveaux fonds retenus`);
  }

  const bySgp = new Map<number, ProspectFund[]>();
  for (const f of funds.values()) bySgp.set(f.sgpId, [...(bySgp.get(f.sgpId) ?? []), f]);

  const sgp: any[] = [];
  for (const [id, list] of bySgp) {
    const tp = await getJson(`${BASE}/thirdParties/${id}`);
    await sleep(PAUSE_MS);
    const siege =
      tp?.addressDTOs?.find((a: any) => a.adrPrincipale && a.courant) ?? tp?.addressDTOs?.[0];
    const comps = await getJson(`${BASE}/thirdParties/${id}/compartments`);
    await sleep(PAUSE_MS);
    sgp.push({
      sgpId: id,
      name: tp?.name ?? list[0].sgpName,
      agreementNum: tp?.agreementNumberHDTOs?.find((a: any) => a.current)?.agreementNumber ?? null,
      www: tp?.www ?? null,
      address: siege
        ? [siege.adrLigne1, siege.adrCodePostal, siege.adrVille].filter(Boolean).join(", ")
        : null,
      phone: siege?.adrNumTel ?? null,
      legalForm: tp?.legalFormLabel ?? null,
      lei: tp?.codeLei ?? null,
      status: tp?.roleStatusDTOs?.map((r: any) => `${r.roleName}:${r.status}`).join(" ") ?? null,
      acts: tp?.authorizedActDTOs?.map((a: any) => a.actLibelle) ?? [],
      totalCompartments: Array.isArray(comps) ? comps.length : null,
      esgRetailFunds: list.length,
      funds: list.map((f) => ({
        name: f.name,
        isin: f.isin,
        terms: f.terms,
        baseline: f.baseline,
      })),
    });
  }
  sgp.sort((a, b) => b.esgRetailFunds - a.esgRetailFunds);

  writeFileSync(join(outDir, "funds.json"), JSON.stringify([...funds.values()], null, 2));
  writeFileSync(join(outDir, "sgp.json"), JSON.stringify(sgp, null, 2));
  console.error(`${funds.size} fonds, ${sgp.length} sociétés de gestion → ${outDir}`);
}

main();
