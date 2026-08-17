/**
 * Moteur d'estimation carbone — calcule l'empreinte financée d'un FONDS à partir
 * de sa composition réelle (`fund_holdings`) quand le fonds ne publie pas
 * directement son intensité carbone (`assets.carbon_intensity_gco2e_per_eur`).
 *
 * Méthodologie (PCAF / GHG Protocol, attribution par EVIC) :
 *
 *   intensité émetteur (gCO₂e / € d'EVIC) = (scope 1 + scope 2, tCO₂e) × 1e6 / EVIC (€)
 *   contribution d'un holding (gCO₂e / € investi dans le FONDS) = intensité émetteur × poids du holding
 *
 * Priorité des données, par holding, du plus fiable au moins fiable — jamais de
 * saut de palier : on ne descend au palier suivant QUE si le précédent est
 * inexploitable (CLAUDE.md §1.1/§1.3, consigne produit) :
 *   1. measured            — émissions publiées/auditées par l'émetteur
 *   2. reported             — émissions auto-déclarées par l'émetteur
 *   3. estimated_company    — estimation spécifique à l'entreprise (méthodologie tracée)
 *   4. estimated_sector     — intensité sectorielle sourcée × CA réel de l'entreprise
 *   5. proxy                 — intensité sectorielle générique (dernier recours)
 *   6. unavailable           — aucune estimation honnête possible (ex. obligation
 *                              souveraine, EVIC/CA inconnus) → contribue 0 à la couverture,
 *                              jamais une valeur inventée pour combler le trou.
 *
 * Scope 3 est capté séparément (`scope3Tco2e`) mais JAMAIS fondu dans le chiffre
 * scope 1+2 : le principal non négociable de cette méthodo est de ne jamais
 * présenter une estimation comme une mesure, et de ne jamais mélanger des scopes
 * de nature différente dans un seul total.
 *
 * Hypothèse assumée : EVIC/CA sont déjà normalisés en EUR à l'ingestion (aucune
 * conversion de change n'est faite ici — inventer un taux de change serait aussi
 * malhonnête qu'inventer une émission). Une devise différente d'EUR rend la ligne
 * `unavailable`.
 *
 * Fonctions pures, aucune dépendance DB/UI — testées isolément.
 */

export type CarbonDataQuality =
  | "measured"
  | "reported"
  | "estimated_company"
  | "estimated_sector"
  | "proxy"
  | "unavailable";

/** Rang de fiabilité, du meilleur (0) au pire (5). Sert à choisir le palier « dominant ». */
export const CARBON_QUALITY_RANK: Record<CarbonDataQuality, number> = {
  measured: 0,
  reported: 1,
  estimated_company: 2,
  estimated_sector: 3,
  proxy: 4,
  unavailable: 5,
};

/** Paliers considérés « directement sourcés » (ni estimés, ni proxy). */
export const DIRECTLY_SOURCED_QUALITIES: ReadonlySet<CarbonDataQuality> = new Set([
  "measured",
  "reported",
]);

const G_PER_TCO2E = 1_000_000;

export interface IssuerEmissionsRecord {
  issuerId: string;
  year: number;
  scope1Tco2e: number | null;
  scope2Tco2e: number | null;
  scope3Tco2e: number | null;
  revenue: number | null;
  evic: number | null;
  currency: string;
  dataQuality: CarbonDataQuality;
  methodology: string | null;
  source: string;
}

export interface SectorBenchmark {
  sector: string;
  region: string;
  /** tCO₂e (scope 1+2) par M€ de chiffre d'affaires. */
  scope12IntensityPerMEur: number;
  currency: string;
  source: string;
  year: number;
}

/** Clé sectorielle générique utilisée quand aucun secteur précis n'est connu (palier proxy). */
export const GENERIC_SECTOR_KEY = "__all__";

export interface HoldingInput {
  securityId: string | null;
  /** Poids du holding dans le FONDS, en pourcentage (0..100). */
  weightPct: number;
  sector: string | null;
  region: string | null;
}

export interface HoldingCarbonResolution {
  securityId: string | null;
  weightPct: number;
  dataQuality: CarbonDataQuality;
  /** Intensité de l'émetteur, gCO₂e par € d'EVIC — null si inexploitable. */
  issuerIntensityGco2ePerEvic: number | null;
  /** Contribution au fonds, gCO₂e par € investi DANS LE FONDS — null si inexploitable. */
  contributionGco2ePerEur: number | null;
  methodology: string;
}

function isPositiveFiniteEur(value: number | null, currency: string): value is number {
  return value != null && Number.isFinite(value) && value > 0 && currency === "EUR";
}

/**
 * Résout la carbone d'UN holding selon la cascade de priorité. Ne descend au
 * palier sectoriel que si les émissions propres à l'entreprise manquent, et au
 * palier proxy que si même le secteur précis de l'entreprise est inconnu.
 */
export function resolveHoldingCarbon(
  holding: HoldingInput,
  emissions: IssuerEmissionsRecord | null,
  sectorBenchmark: SectorBenchmark | null,
  genericBenchmark: SectorBenchmark | null = null,
): HoldingCarbonResolution {
  const base = { securityId: holding.securityId, weightPct: holding.weightPct };

  if (!holding.securityId || !Number.isFinite(holding.weightPct) || holding.weightPct <= 0) {
    return {
      ...base,
      dataQuality: "unavailable",
      issuerIntensityGco2ePerEvic: null,
      contributionGco2ePerEur: null,
      methodology: "Position sans titre identifié ou poids nul — non calculable.",
    };
  }

  const w = holding.weightPct / 100;

  // Paliers 1-3 : émissions propres à l'émetteur (mesurées, déclarées ou estimées
  // spécifiquement), tant que scope 1+2 ET EVIC (en EUR) sont exploitables.
  if (
    emissions &&
    emissions.scope1Tco2e != null &&
    emissions.scope2Tco2e != null &&
    Number.isFinite(emissions.scope1Tco2e) &&
    Number.isFinite(emissions.scope2Tco2e) &&
    isPositiveFiniteEur(emissions.evic, emissions.currency) &&
    (emissions.dataQuality === "measured" ||
      emissions.dataQuality === "reported" ||
      emissions.dataQuality === "estimated_company")
  ) {
    const scope12 = emissions.scope1Tco2e + emissions.scope2Tco2e;
    const issuerIntensity = (scope12 * G_PER_TCO2E) / emissions.evic;
    return {
      ...base,
      dataQuality: emissions.dataQuality,
      issuerIntensityGco2ePerEvic: issuerIntensity,
      contributionGco2ePerEur: issuerIntensity * w,
      methodology: `${emissions.dataQuality} · scope 1+2 / EVIC (source : ${emissions.source}, ${emissions.year})`,
    };
  }

  // Palier 4-5 : pas d'émissions propres exploitables, mais CA + EVIC connus →
  // on applique une intensité sectorielle sourcée au CA réel de l'entreprise.
  const revenue = emissions?.revenue ?? null;
  const evic = emissions?.evic ?? null;
  const currency = emissions?.currency ?? "EUR";
  if (isPositiveFiniteEur(revenue, currency) && isPositiveFiniteEur(evic, currency)) {
    const benchmark = sectorBenchmark ?? genericBenchmark;
    if (benchmark && Number.isFinite(benchmark.scope12IntensityPerMEur) && currency === "EUR") {
      const tier: CarbonDataQuality = sectorBenchmark ? "estimated_sector" : "proxy";
      const estimatedScope12 = benchmark.scope12IntensityPerMEur * (revenue / 1_000_000);
      const issuerIntensity = (estimatedScope12 * G_PER_TCO2E) / evic;
      return {
        ...base,
        dataQuality: tier,
        issuerIntensityGco2ePerEvic: issuerIntensity,
        contributionGco2ePerEur: issuerIntensity * w,
        methodology:
          tier === "estimated_sector"
            ? `estimated_sector · intensité ${benchmark.sector}/${benchmark.region} × CA réel / EVIC (source : ${benchmark.source}, ${benchmark.year})`
            : `proxy · intensité sectorielle générique × CA réel / EVIC (source : ${benchmark.source}, ${benchmark.year})`,
      };
    }
  }

  // Palier 6 : rien d'exploitable honnêtement — on ne comble pas le trou.
  return {
    ...base,
    dataQuality: "unavailable",
    issuerIntensityGco2ePerEvic: null,
    contributionGco2ePerEur: null,
    methodology: "Aucune donnée émetteur, sectorielle ou financière (CA/EVIC) exploitable.",
  };
}

export interface FundCarbonEstimate {
  /** gCO₂e par € investi DANS LE FONDS, sur la part couverte. null si couverture nulle. */
  intensityGco2ePerEur: number | null;
  /** Part du poids du fonds couverte par une donnée quelconque (mesurée à proxy), 0..1. */
  coverage: number;
  /** Part du poids du fonds couverte par une donnée DIRECTEMENT SOURCÉE (measured/reported), 0..1. */
  sourcedCoverage: number;
  /** Palier le moins fiable parmi les holdings qui contribuent au chiffre (label honnête). */
  dataQuality: CarbonDataQuality;
  holdingsConsidered: number;
  holdingsCovered: number;
  methodology: string;
  lines: HoldingCarbonResolution[];
}

/**
 * Agrège les résolutions par holding en une estimation au niveau du FONDS,
 * réutilisable comme repli pour `assets.carbon_intensity_gco2e_per_eur` quand le
 * fonds ne publie rien lui-même. Le rescale (numérateur / couverture) reprend la
 * même convention que `computePortfolioCarbon` (lib/esg/carbon.ts) : une mesure
 * intensive, calculée uniquement sur la part réellement couverte.
 */
export function estimateFundCarbonFromHoldings(holdings: HoldingInput[]): FundCarbonEstimate;
export function estimateFundCarbonFromHoldings(
  holdings: HoldingInput[],
  emissionsByIssuerId: Map<string, IssuerEmissionsRecord>,
  sectorBenchmarks: Map<string, SectorBenchmark>,
): FundCarbonEstimate;
export function estimateFundCarbonFromHoldings(
  holdings: HoldingInput[],
  emissionsByIssuerId: Map<string, IssuerEmissionsRecord> = new Map(),
  sectorBenchmarks: Map<string, SectorBenchmark> = new Map(),
): FundCarbonEstimate {
  const genericBenchmark = sectorBenchmarks.get(GENERIC_SECTOR_KEY) ?? null;
  const considered = holdings.filter(
    (h) => Number.isFinite(h.weightPct) && h.weightPct > 0 && h.securityId,
  );

  const lines = considered.map((h) => {
    const emissions = h.securityId ? (emissionsByIssuerId.get(h.securityId) ?? null) : null;
    const sectorBenchmark = h.sector
      ? (sectorBenchmarks.get(`${h.sector}|${h.region ?? "world"}`) ??
        sectorBenchmarks.get(`${h.sector}|world`) ??
        null)
      : null;
    return resolveHoldingCarbon(h, emissions, sectorBenchmark, genericBenchmark);
  });

  let numerator = 0;
  let coverage = 0;
  let sourcedCoverage = 0;
  let worstQuality: CarbonDataQuality | null = null;
  let holdingsCovered = 0;

  for (const line of lines) {
    if (line.contributionGco2ePerEur == null) continue;
    numerator += line.contributionGco2ePerEur;
    coverage += line.weightPct / 100;
    holdingsCovered++;
    if (DIRECTLY_SOURCED_QUALITIES.has(line.dataQuality)) {
      sourcedCoverage += line.weightPct / 100;
    }
    if (
      worstQuality == null ||
      CARBON_QUALITY_RANK[line.dataQuality] > CARBON_QUALITY_RANK[worstQuality]
    ) {
      worstQuality = line.dataQuality;
    }
  }

  coverage = Math.min(1, coverage);
  sourcedCoverage = Math.min(coverage, sourcedCoverage);

  const sourcedPct = coverage > 0 ? Math.round((sourcedCoverage / coverage) * 100) : 0;
  const methodology =
    coverage > 0
      ? `Estimation Seedow (méthode PCAF, attribution par EVIC) sur ${Math.round(coverage * 100)}% du fonds — ${sourcedPct}% directement sourcé, reste estimé (secteur/proxy).`
      : "Couverture nulle : aucune donnée émetteur, sectorielle ou financière exploitable sur ce fonds (ex. fonds obligataire souverain).";

  return {
    intensityGco2ePerEur: coverage > 0 ? numerator / coverage : null,
    coverage,
    sourcedCoverage,
    dataQuality: worstQuality ?? "unavailable",
    holdingsConsidered: considered.length,
    holdingsCovered,
    methodology,
    lines,
  };
}

/**
 * Arrondit une valeur à N chiffres significatifs — évite d'afficher une fausse
 * précision (ex. « 423,72 kg ») sur une estimation. `sigFigs` par défaut = 2
 * (« ≈420 » plutôt que « 423,72 »).
 */
export function roundSignificant(value: number, sigFigs = 2): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const sign = Math.sign(value);
  const abs = Math.abs(value);
  const magnitude = Math.pow(10, sigFigs - 1 - Math.floor(Math.log10(abs)));
  return (sign * Math.round(abs * magnitude)) / magnitude;
}
