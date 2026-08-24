/**
 * Lecteur de provenance — d'où vient un chiffre, et quand.
 *
 * Seedow affiche des données ESG et climat dénormalisées sur `assets`
 * (`esg_score`, `waci_tco2e_per_musd_sales`…). Chacune a été écrite par le
 * pipeline d'ingestion, qui a par ailleurs laissé une trace complète dans
 * `data_observations` : valeur, source, date de référence, confiance, document
 * et extrait probant.
 *
 * Ce module fait le pont dans le sens de la LECTURE, au premier niveau : ce que
 * les colonnes de l'actif suffisent à dire — valeur, source, date. C'est assez
 * pour signer un chiffre à l'écran, et ça ne coûte aucune requête.
 *
 * Le second niveau — la trace complète depuis `data_observations`, avec document
 * et extrait probant — n'est PAS écrit : aucun écran n'en a besoin aujourd'hui,
 * et une fonction serveur sans appelant est exactement la surface morte qu'on
 * vient de nettoyer. Elle s'écrira le jour où une fiche détaillée l'exigera.
 *
 * Règle unique : une donnée sans source n'est pas une donnée de moindre
 * qualité, c'est une donnée SANS PROVENANCE — elle sort `null`. On ne fabrique
 * jamais une attribution par défaut (CLAUDE.md §1.2).
 */

import type { Asset } from "@/lib/portfolio/types";

/** Niveaux de l'enum `data_confidence` en base. */
export type Confidence = "high" | "medium" | "low";

export interface FieldProvenance {
  /** Champ canonique, tel que le pipeline le nomme. */
  field: string;
  value: number | string;
  /** Clé ou nom du fournisseur — jamais inventé. */
  source: string;
  /** Date de référence de la donnée (pas la date de collecte). */
  asOf: string | null;
  confidence: Confidence | null;
}

/**
 * Champs dénormalisés dont `assets` porte aussi la source et la date.
 * Aligné sur `CANONICAL_FIELD_TO_COLUMN` (persist.ts) : même vocabulaire des
 * deux côtés du pipeline.
 */
export type ProvenancedField =
  | "esg_score"
  | "msci_esg_quality_score"
  | "waci_tco2e_per_musd_sales"
  | "implied_temp_rise"
  | "sfdr_article"
  | "carbon_intensity_gco2e_per_eur";

/**
 * Provenance d'un champ, lue sur l'actif lui-même. Retourne `null` dès que la
 * valeur OU la source manque : un chiffre non attribuable ne s'affiche pas
 * comme mesuré.
 *
 * Les scores estimés en interne (`seedow-internal*`) sont des attributions
 * honnêtes, pas des sources externes : ils sont rendus tels quels, à charge de
 * l'appelant de les présenter comme estimés.
 */
export function assetFieldProvenance(
  asset: Asset,
  field: ProvenancedField,
): FieldProvenance | null {
  const esgSource = clean(asset.esg_score_source);
  const esgAsOf = clean(asset.esg_data_asof) ?? null;

  switch (field) {
    case "esg_score":
      return build(field, asset.esg_score, esgSource, esgAsOf);
    case "msci_esg_quality_score":
      return build(field, asset.msci_esg_quality_score, esgSource, esgAsOf);
    case "implied_temp_rise":
      return build(field, asset.implied_temp_rise, esgSource, esgAsOf);
    case "sfdr_article":
      return build(field, asset.sfdr_article, esgSource, esgAsOf);
    case "waci_tco2e_per_musd_sales":
      return build(
        field,
        asset.waci_tco2e_per_musd_sales,
        clean(asset.carbon_intensity_source) ?? esgSource,
        clean(asset.carbon_intensity_updated_at) ?? esgAsOf,
      );
    case "carbon_intensity_gco2e_per_eur":
      return build(
        field,
        asset.carbon_intensity_gco2e_per_eur,
        clean(asset.carbon_intensity_source),
        clean(asset.carbon_intensity_updated_at),
      );
  }
}

/** Toutes les provenances disponibles pour un actif, dans l'ordre des champs. */
export function assetProvenance(asset: Asset): FieldProvenance[] {
  const fields: ProvenancedField[] = [
    "esg_score",
    "msci_esg_quality_score",
    "waci_tco2e_per_musd_sales",
    "carbon_intensity_gco2e_per_eur",
    "implied_temp_rise",
    "sfdr_article",
  ];
  return fields
    .map((f) => assetFieldProvenance(asset, f))
    .filter((p): p is FieldProvenance => p !== null);
}

/**
 * Part des champs demandés qui portent une provenance (0..1). Sert à annoncer
 * une couverture mesurée plutôt qu'un « vérifié » de façade — null si on n'a
 * rien demandé.
 */
export function provenanceCoverage(asset: Asset, fields: ProvenancedField[]): number | null {
  if (fields.length === 0) return null;
  const covered = fields.filter((f) => assetFieldProvenance(asset, f) !== null).length;
  return covered / fields.length;
}

/** Une source interne est une estimation maison, pas un fournisseur externe. */
export function isExternalSource(source: string): boolean {
  return !source.startsWith("seedow-internal");
}

// ── Utilitaires ──────────────────────────────────────────────────────────

function clean(v: string | null | undefined): string | undefined {
  if (v == null) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

function build(
  field: string,
  value: number | string | null | undefined,
  source: string | undefined,
  asOf: string | null | undefined,
): FieldProvenance | null {
  if (value == null || source == null) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return { field, value, source, asOf: asOf ?? null, confidence: null };
}
