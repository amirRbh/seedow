/**
 * Les couches d'un actif — ce qu'on sait, et ce qu'on ne sait pas.
 *
 * Un fonds n'est pas « complet » ou « inexistant ». Il se connaît par strates,
 * et chacune peut manquer indépendamment des autres :
 *
 *   1. **Identité**   — ISIN, nom, émetteur, domicile, devise, frais.
 *   2. **Structure**  — région, expositions, secteurs exclus, composition réelle.
 *   3. **Valeurs**    — ESG, piliers E/S/G, SFDR, climat.
 *   4. **Marché**     — rendement attendu, volatilité, historique de cours.
 *
 * Un actif peut donc exister avec les seules couches disponibles, à condition
 * que Seedow dise lesquelles manquent — c'est tout l'objet de ce module.
 *
 * ── La distinction qui compte ────────────────────────────────────────────
 *
 * Un champ a TROIS états, pas deux :
 *
 *   - `present` : la donnée existe et elle est là ;
 *   - `absent`  : la source a été consultée, la donnée n'existe pas ;
 *   - `unknown` : le champ n'a pas été chargé — on ne sait pas s'il existe.
 *
 * Confondre `absent` et `unknown` reviendrait à annoncer « ce fonds n'a pas
 * d'ISIN » alors qu'on ne l'a simplement pas demandé en base. C'est exactement
 * le genre d'affirmation non fondée que Seedow s'interdit (CLAUDE.md §1.3).
 * L'univers du portefeuille ne charge pas les colonnes d'identité : sur un
 * `Asset` seul, cette couche ressort donc `unknown`, pas `absent`.
 *
 * Module PUR : aucune requête, aucun effet de bord.
 */

/**
 * Source des couches — volontairement PLUS LARGE que `Asset`.
 *
 * Tous les champs sont optionnels, et c'est le sens du module : un champ non
 * fourni ressort `unknown`, pas `absent`. N'importe quel modèle de vue peut donc
 * être décrit honnêtement, y compris quand il ne charge qu'une partie des
 * colonnes. Un `Asset` complet satisfait ce type sans conversion.
 */
export interface AssetLayerSource {
  name?: string | null;
  ter?: number | null;
  asset_class?: string | null;
  region?: string | null;
  cause_exposure?: Record<string, number> | null;
  excluded_sectors?: readonly string[] | null;
  esg_score?: number | null;
  esg_score_source?: string | null;
  env_score?: number | null;
  social_score?: number | null;
  governance_score?: number | null;
  sfdr_article?: number | null;
  carbon_intensity_gco2e_per_eur?: number | null;
  waci_tco2e_per_musd_sales?: number | null;
  expected_return?: number | null;
  volatility?: number | null;
  stats_observations?: number | null;
}

export type LayerId = "identity" | "structure" | "values" | "market";
export type FieldState = "present" | "absent" | "unknown";
/** `complete` : tout est là · `partial` : au moins un champ · `missing` : rien · `unknown` : rien n'a été chargé. */
export type LayerStatus = "complete" | "partial" | "missing" | "unknown";

export interface LayerField {
  field: string;
  state: FieldState;
}

export interface AssetLayer {
  id: LayerId;
  status: LayerStatus;
  fields: LayerField[];
  /** Champs réellement absents de la source — jamais ceux qu'on n'a pas demandés. */
  missing: string[];
  /** Champs dont on ignore l'état faute de les avoir chargés. */
  unknown: string[];
}

export interface AssetLayers {
  layers: Record<LayerId, AssetLayer>;
  /** Couches complètes ou partielles — celles sur lesquelles on peut dire quelque chose. */
  usable: LayerId[];
}

/**
 * Entrée : l'actif du moteur, plus les champs d'identité et de structure qui
 * vivent en base sans être chargés dans l'univers. Tout est optionnel — ce qui
 * n'est pas fourni ressort `unknown`, jamais `absent`.
 */
export interface AssetLayerInput {
  asset: AssetLayerSource;
  /** Colonnes d'identité de `assets`, si elles ont été chargées. */
  identity?: {
    isin?: string | null;
    issuer?: string | null;
    domicile?: string | null;
    currency?: string | null;
  };
  /** Nombre de lignes de composition connues (`fund_holdings`), si consulté. */
  holdingsCount?: number | null;
}

/** `undefined` = non chargé ; `null`/vide = absent de la source. */
function state(value: unknown): FieldState {
  if (value === undefined) return "unknown";
  if (value === null) return "absent";
  if (typeof value === "string" && value.trim() === "") return "absent";
  if (typeof value === "number" && !Number.isFinite(value)) return "absent";
  if (Array.isArray(value)) return value.length > 0 ? "present" : "absent";
  if (typeof value === "object")
    return Object.keys(value as object).length > 0 ? "present" : "absent";
  return "present";
}

function buildLayer(id: LayerId, entries: Array<[string, unknown]>): AssetLayer {
  const fields = entries.map(([field, value]) => ({ field, state: state(value) }));
  const missing = fields.filter((f) => f.state === "absent").map((f) => f.field);
  const unknown = fields.filter((f) => f.state === "unknown").map((f) => f.field);
  const present = fields.filter((f) => f.state === "present").length;

  let status: LayerStatus;
  if (present === fields.length) status = "complete";
  else if (present > 0) status = "partial";
  else if (unknown.length === fields.length) status = "unknown";
  else status = "missing";

  return { id, status, fields, missing, unknown };
}

/**
 * Décrit un actif couche par couche. Ne juge pas la QUALITÉ de l'actif —
 * seulement ce que l'on sait de lui. Les deux ne doivent jamais être confondus.
 */
export function describeAssetLayers(input: AssetLayerInput): AssetLayers {
  const a = input.asset;
  const ident = input.identity;

  // Identité : le même vocabulaire que `data-engine/activation.hasFullIdentity`,
  // pour que la porte d'activation et l'affichage disent la même chose.
  const identity = buildLayer("identity", [
    ["isin", ident ? (ident.isin ?? null) : undefined],
    ["name", a.name],
    ["issuer", ident ? (ident.issuer ?? null) : undefined],
    ["domicile", ident ? (ident.domicile ?? null) : undefined],
    ["currency", ident ? (ident.currency ?? null) : undefined],
    ["ter", a.ter],
  ]);

  const structure = buildLayer("structure", [
    ["asset_class", a.asset_class],
    ["region", a.region],
    ["cause_exposure", a.cause_exposure],
    ["excluded_sectors", a.excluded_sectors],
    // La composition réelle vit dans `fund_holdings` : non consultée → unknown.
    [
      "holdings",
      input.holdingsCount === undefined
        ? undefined
        : (input.holdingsCount ?? 0) > 0
          ? input.holdingsCount
          : null,
    ],
  ]);

  // Un score ESG à 0 SANS source n'est pas une note basse : c'est l'absence de
  // note. Et si la source n'a même pas été chargée, on ne sait pas — on ne
  // conclut ni à une note, ni à son absence.
  const esgScore =
    a.esg_score_source === undefined
      ? undefined
      : a.esg_score_source !== null && a.esg_score_source.trim() !== ""
        ? a.esg_score
        : null;
  const values = buildLayer("values", [
    ["esg_score", esgScore],
    [
      "esg_pillars",
      a.env_score === undefined && a.social_score === undefined && a.governance_score === undefined
        ? undefined
        : (a.env_score ?? a.social_score ?? a.governance_score ?? null),
    ],
    ["sfdr_article", a.sfdr_article],
    ["carbon_intensity", a.carbon_intensity_gco2e_per_eur],
    ["waci", a.waci_tco2e_per_musd_sales],
  ]);

  const market = buildLayer("market", [
    ["expected_return", a.expected_return],
    ["volatility", a.volatility],
    // Sans observation de cours, le couple rendement/volatilité est un a priori
    // de classe, pas une mesure — la couche marché est alors vide.
    [
      "price_history",
      a.stats_observations === undefined
        ? undefined
        : (a.stats_observations ?? 0) > 0
          ? a.stats_observations
          : null,
    ],
  ]);

  const layers = { identity, structure, values, market };
  const usable = (Object.keys(layers) as LayerId[]).filter(
    (id) => layers[id].status === "complete" || layers[id].status === "partial",
  );

  return { layers, usable };
}

/**
 * Un actif est présentable dès qu'on sait le nommer et le situer — il n'a pas
 * besoin d'être noté ESG pour exister. Ce que Seedow doit, c'est afficher
 * franchement ce qui manque, pas faire disparaître le fonds.
 */
export function isPresentable(layers: AssetLayers): boolean {
  return (
    layers.layers.structure.status !== "missing" && layers.layers.identity.status !== "missing"
  );
}
