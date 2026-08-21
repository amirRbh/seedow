/**
 * Sélection de l'URL du CSV de composition iShares depuis les liens rendus par
 * la page (option B — navigateur sans tête, cf. docs/esg-sources.md « décision
 * holdings »). Le navigateur exécute le JS de la SPA ; ce module ne fait que
 * CHOISIR, parmi les `href` réellement présents dans le DOM, celui qui pointe le
 * fichier de holdings — puis le rend absolu.
 *
 * Non négociable (§1.3) : on ne DEVINE aucune URL. Si aucun lien du DOM ne
 * correspond, on renvoie null (le fonds est signalé `no_source`, rien n'est
 * écrit). Fonctions PURES, sans navigateur ni I/O — donc testables seules.
 */

/** Rend une URL absolue par rapport à la page produit ; null si inexploitable. */
export function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Un href ressemble-t-il à un export CSV de holdings iShares ? */
function looksLikeHoldingsCsv(href: string): boolean {
  const h = href.toLowerCase();
  const isCsv = h.includes("filetype=csv") || /\.csv(\?|$)/.test(h);
  if (!isCsv) return false;
  // Le CSV de COMPOSITION iShares porte dataType=fund (vs distributions, perf…)
  // ou un nom de fichier mentionnant les holdings.
  return h.includes("datatype=fund") || h.includes("holding");
}

/** Score de préférence : plus c'est spécifique au fichier de holdings, mieux c'est. */
function score(href: string): number {
  const h = href.toLowerCase();
  let s = 0;
  if (h.includes("filetype=csv")) s += 2;
  if (h.includes("datatype=fund")) s += 2;
  if (h.includes("holding")) s += 1;
  if (h.includes(".ajax")) s += 1;
  return s;
}

/**
 * Choisit le meilleur href de CSV de holdings parmi ceux du DOM, rendu absolu.
 * Renvoie null si aucun ne correspond — jamais une URL fabriquée.
 */
export function pickHoldingsCsvUrl(hrefs: string[], base: string): string | null {
  const candidates = hrefs
    .filter((h) => typeof h === "string" && h.length > 0)
    .filter(looksLikeHoldingsCsv)
    .map((h) => absolutize(h, base))
    .filter((h): h is string => h != null);

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => score(b) - score(a))[0];
}
