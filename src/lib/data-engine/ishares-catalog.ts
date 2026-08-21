/**
 * Découverte AUTOMATIQUE du catalogue produit iShares (ISIN → page produit),
 * pour l'option B (navigateur sans tête). Le harvester n'exige plus une liste
 * d'ISIN curée à la main : le navigateur charge la page catalogue, le site
 * publie lui-même son « product screener » (JSON), on l'INTERCEPTE et on en
 * extrait les couples (ISIN, URL de page produit) — puis on croise avec NOTRE
 * univers (`assets`) par ISIN.
 *
 * Honnêteté (§1.3) : on ne DEVINE aucune URL. On lit ce que le site expose. Un
 * ISIN sans URL exploitable dans le screener → non découvert (il pourra être
 * épinglé par un override, mais jamais fabriqué). La validation ISIN se fait par
 * checksum (`isValidIsin`) : scanner des chaînes JSON ne produit donc pas de
 * faux positifs.
 *
 * Fonctions PURES ici (parsing + résolution) — le navigateur vit dans le script.
 */

import { isValidIsin, normalizeIsin } from "./isin";
import { absolutize } from "./ishares-holdings-url";

export interface DiscoveredProduct {
  isin: string;
  /** URL absolue de la page produit iShares. */
  url: string;
}

/** Un href/slug ressemble-t-il à une page produit iShares ? */
function looksLikeProductUrl(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes("/products/");
}

/**
 * Extrait les couples (ISIN, URL de page produit) d'un payload de screener
 * iShares de forme INCONNUE (le site peut faire évoluer sa structure). On
 * parcourt récursivement le JSON : pour chaque objet, si l'une de ses valeurs
 * chaîne est un ISIN valide (checksum) et une autre ressemble à une URL de page
 * produit, on apparie les deux (elles sont sur la même « ligne fonds »).
 * Déduplique par ISIN (première occurrence gardée).
 */
export function extractProductsFromScreener(data: unknown, base: string): DiscoveredProduct[] {
  const found = new Map<string, string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      let isin: string | null = null;
      let url: string | null = null;
      for (const value of Object.values(obj)) {
        if (typeof value !== "string") continue;
        if (!isin) {
          const canonical = normalizeIsin(value);
          if (canonical && isValidIsin(canonical)) isin = canonical;
        }
        if (!url && looksLikeProductUrl(value)) url = value;
      }
      if (isin && url && !found.has(isin)) {
        const abs = absolutize(url, base);
        if (abs) found.set(isin, abs);
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };

  visit(data);
  return [...found.entries()].map(([isin, url]) => ({ isin, url }));
}

export interface HarvestTarget {
  isin: string;
  assetId: string;
  url: string;
  source: "discovered" | "override";
}

/**
 * Croise les produits découverts avec NOTRE univers actif (par ISIN) et applique
 * les overrides curés. Un fonds n'est ciblé que s'il correspond à un actif actif
 * (jamais créé à la volée). Les overrides ont priorité sur la découverte
 * automatique (épinglage manuel d'un cas particulier).
 */
export function resolveHarvestTargets(opts: {
  discovered: DiscoveredProduct[];
  activeByIsin: Map<string, { id: string; name: string }>;
  overrides?: Record<string, string>;
  base: string;
}): HarvestTarget[] {
  const { discovered, activeByIsin, overrides, base } = opts;
  const map = new Map<string, HarvestTarget>();

  for (const d of discovered) {
    const asset = activeByIsin.get(d.isin);
    if (asset) {
      map.set(d.isin, { isin: d.isin, assetId: asset.id, url: d.url, source: "discovered" });
    }
  }
  for (const [rawIsin, rawUrl] of Object.entries(overrides ?? {})) {
    const isin = normalizeIsin(rawIsin) ?? rawIsin;
    const asset = activeByIsin.get(isin);
    const abs = absolutize(rawUrl, base);
    if (asset && abs) {
      map.set(isin, { isin, assetId: asset.id, url: abs, source: "override" });
    }
  }
  return [...map.values()];
}
