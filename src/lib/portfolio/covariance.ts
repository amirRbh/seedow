/**
 * Sous-matrice de covariance d'une sélection d'actifs.
 *
 * Extrait de `customize.functions` pour être partagé avec l'analyse : la règle
 * de repli doit être la MÊME partout, sinon un même portefeuille afficherait
 * deux volatilités selon l'écran qui le regarde.
 *
 * Repli, identique à celui du moteur :
 *  - diagonale manquante → `volatility²` (jamais 0, un actif a toujours un risque
 *    propre) ;
 *  - hors-diagonale manquante → 0, soit l'hypothèse de non-corrélation. C'est
 *    une hypothèse, pas une mesure : elle sous-estime le risque d'un
 *    portefeuille dont les lignes bougent ensemble, et c'est assumé faute de
 *    covariance observée.
 */

import type { Asset } from "./types";

export function buildCovariance(assets: Asset[], covMap: Map<string, number>): number[][] {
  const n = assets.length;
  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const key = `${assets[i].id}|${assets[j].id}`;
      const fallback = i === j ? assets[i].volatility ** 2 : 0;
      row.push(covMap.get(key) ?? fallback);
    }
    cov.push(row);
  }
  return cov;
}
