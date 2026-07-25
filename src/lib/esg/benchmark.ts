/**
 * Référence carbone d'un ETF actions monde « classique » = indice PARENT MSCI ACWI
 * (non filtré). Sert de point de comparaison honnête pour l'intensité carbone d'un
 * portefeuille (« vs un ETF Monde »).
 *
 * Valeur VÉRIFIÉE, sourcée et datée : ligne « Wtd avg carbon intensity
 * (t CO2e/$M sales) » (Scope 1+2) du MSCI ACWI Climate Indexes Report.
 * Même métrique/scope que le WACI des fiches fonds → comparaison homogène.
 *
 * ⚠️ À METTRE À JOUR à chaque nouveau rapport MSCI daté — ne jamais coder une
 * valeur « de mémoire » (contrat de transparence Seedow §1.2).
 */
export const ACWI_WACI_TCO2E_PER_MUSD = 115;
export const ACWI_WACI_SOURCE = "MSCI ACWI Climate Indexes Report";
export const ACWI_WACI_ASOF = "2026-06-30";
