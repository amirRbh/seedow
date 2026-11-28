/**
 * Sélection de l'univers de départ de la base UC de Seedow Pro (module pur).
 *
 * Entrée : un extrait de la base GECO de l'AMF (fonds de droit français, vivants,
 * ouverts à tous souscripteurs, dont le nom contient un terme encadré par les
 * orientations ESMA sur les noms de fonds — cf. `scripts/build-sgp-prospects.ts`).
 *
 * Règles, appliquées dans cet ordre et toutes mécaniques :
 *   1. ISIN valide (forme + clé de contrôle) : écarte les codes AMF « 99… » de
 *      l'épargne salariale, qui ne sont pas des ISIN ;
 *   2. famille OPCVM ou FIVG (supports grand public des contrats) ;
 *   3. hors fonds à formule et fonds monétaires (supports fermés ou de
 *      trésorerie, hors du cœur des préférences de durabilité) ;
 *   4. un ISIN par compartiment (doublons de parts écartés) ;
 *   5. au plus `maxPerManager` fonds par société de gestion, dans l'ordre
 *      alphabétique des noms (pour qu'aucun groupe n'écrase l'échantillon).
 *
 * Ce que cette sélection NE dit PAS : qu'un fonds est plus « durable », plus
 * vendu ou plus présent en assurance-vie qu'un autre. Elle couvre les fonds au
 * nom ESG enregistrés à l'AMF, ceux que les règles ESMA visent en premier.
 */
import { z } from "zod";
import { isValidIsin } from "../app/isin";

export const gecoFundSchema = z.object({
  cmpId: z.string(),
  name: z.string(),
  isin: z.string(),
  family: z.string(),
  /** Absente pour certains fonds : on garde le fonds, classification `null`. */
  amfClass: z.string().nullable(),
  terms: z.array(z.string()),
  baseline: z.string(),
  sgpId: z.number(),
  sgpName: z.string(),
  gecoUrl: z.string().url(),
});
export type GecoFund = z.infer<typeof gecoFundSchema>;

export type ExclusionReason =
  | "isin_invalide"
  | "famille_hors_grand_public"
  | "formule_ou_monetaire"
  | "doublon_compartiment"
  | "plafond_societe";

export interface UniverseFund {
  isin: string;
  name: string;
  management_company: string;
  amf_classification: string | null;
  legal_form: string;
  esma_terms: string[];
  /** Exclusions d'indice de référence que le nom appelle (ESMA §16-17). */
  esma_baseline: string;
  selection_reason: string;
  source_url: string;
}

export interface UniverseResult {
  selected: UniverseFund[];
  excluded: Record<ExclusionReason, number>;
}

const GRAND_PUBLIC = /^(OPCVM|FIVG)\b/;
const HORS_COEUR = /formule|mon[ée]taire/i;

export function selectUniverse(
  funds: readonly GecoFund[],
  opts: { maxPerManager: number; sourceDate: string },
): UniverseResult {
  const excluded: Record<ExclusionReason, number> = {
    isin_invalide: 0,
    famille_hors_grand_public: 0,
    formule_ou_monetaire: 0,
    doublon_compartiment: 0,
    plafond_societe: 0,
  };
  const seenIsin = new Set<string>();
  const seenCmp = new Set<string>();
  const perManager = new Map<string, number>();
  const selected: UniverseFund[] = [];

  const ordered = [...funds].sort(
    (a, b) =>
      a.sgpName.localeCompare(b.sgpName, "fr") ||
      a.name.localeCompare(b.name, "fr") ||
      a.isin.localeCompare(b.isin),
  );
  for (const f of ordered) {
    if (!isValidIsin(f.isin)) {
      excluded.isin_invalide++;
      continue;
    }
    if (!GRAND_PUBLIC.test(f.family)) {
      excluded.famille_hors_grand_public++;
      continue;
    }
    if (f.amfClass && HORS_COEUR.test(f.amfClass)) {
      excluded.formule_ou_monetaire++;
      continue;
    }
    if (seenIsin.has(f.isin) || seenCmp.has(f.cmpId)) {
      excluded.doublon_compartiment++;
      continue;
    }
    const n = perManager.get(f.sgpName) ?? 0;
    if (n >= opts.maxPerManager) {
      excluded.plafond_societe++;
      continue;
    }
    seenIsin.add(f.isin);
    seenCmp.add(f.cmpId);
    perManager.set(f.sgpName, n + 1);
    selected.push({
      isin: f.isin,
      name: f.name,
      management_company: f.sgpName,
      amf_classification: f.amfClass,
      legal_form: f.family.split(" - ")[0]!.trim(),
      esma_terms: f.terms,
      esma_baseline: f.baseline,
      selection_reason:
        `GECO (AMF) au ${opts.sourceDate} : fonds de droit français ouvert à tous souscripteurs, ` +
        `nom contenant un terme ESMA (${f.terms.join(", ")})`,
      source_url: f.gecoUrl,
    });
  }
  return { selected, excluded };
}
