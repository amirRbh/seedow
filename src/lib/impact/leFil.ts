/**
 * Le Fil — moteur narratif de l'impact.
 *
 * Transforme des FAITS RÉELS du portefeuille en dépêches à hauteur d'humain,
 * datées et sourcées. Fonction PURE, testable isolément.
 *
 * Contrat de transparence (CLAUDE.md §1.2, §1.3, §5.4) tenu strictement :
 *  - Aucune actualité d'entreprise inventée. Une dépêche n'énonce que ce que les
 *    données de l'app établissent réellement (composition, score ESG, intensité
 *    carbone vs indice de référence sourcé).
 *  - Chaque dépêche porte une source ET une date. Les lectures calculées « à
 *    l'instant » sont datées d'aujourd'hui ; les faits ancrés (création du
 *    portefeuille) sont datés de leur date réelle.
 *  - Jamais de « CO₂ évité » sans comparaison sourcée. On parle d'empreinte
 *    (ce que le portefeuille émet) ou d'intensité relative à un indice daté.
 *
 * Le texte affiché vit dans l'i18n (`impact_living.fil.*`) ; ce module ne produit
 * que des identifiants de clés + paramètres, pour rester traduisible.
 */
import type { ThemeBreakdown } from "@/lib/impact/themeBreakdown";
import type { PortfolioImpactView } from "@/lib/impact/portfolioImpact";
import type { CauseTag } from "@/lib/portfolio/types";

export type DispatchTone = "growth" | "identity" | "neutral" | "caution";

export interface FeedDispatch {
  id: string;
  tone: DispatchTone;
  /** Clé i18n du titre. */
  headlineKey: string;
  headlineParams?: Record<string, string | number>;
  /** Clé i18n du corps (optionnel). */
  bodyKey?: string;
  bodyParams?: Record<string, string | number>;
  /** Libellé de source (ex. « Moteur Seedow », « MSCI ACWI »). */
  source: string;
  /** Date « as of » de la source externe, si applicable. */
  sourceAsOf?: string | number;
  /** Date à laquelle la dépêche est ancrée (ISO). */
  dateISO: string;
  /** true si la date est un fait ancré (création), false si lecture du jour. */
  anchored: boolean;
}

export interface FeedInput {
  portfolioId: string;
  /** Date de création du portefeuille (« premier euro »), ISO. */
  generatedAt: string;
  /** Instant de référence, injectable pour les tests. */
  now: Date;
  holdingsCount: number;
  breakdown: ThemeBreakdown;
  impact: PortfolioImpactView;
  /** Source de l'indice de référence carbone (ex. « MSCI ACWI »). */
  benchmarkSource?: string;
  /** Date « as of » de l'indice de référence. */
  benchmarkAsOf?: string | number;
  /** Source des facteurs d'équivalence (ex. « ADEME »). */
  equivalenceSource?: string;
}

const SOURCE_ENGINE = "Moteur Seedow";

function isoDate(d: Date): string {
  return d.toISOString();
}

/**
 * Construit le fil de dépêches d'un portefeuille, ordonné du plus porteur de sens
 * au plus contextuel. Retourne toujours au moins une dépêche d'identité dès qu'un
 * portefeuille existe.
 */
export function buildImpactFeed(input: FeedInput): FeedDispatch[] {
  const out: FeedDispatch[] = [];
  const nowISO = isoDate(input.now);
  const themeCount = input.breakdown.slices.length;
  const topSlice = input.breakdown.slices[0];

  // 1 — Identité : depuis ton premier euro, ce que ton argent finance.
  out.push({
    id: "identity",
    tone: "identity",
    headlineKey: "impact_living.fil.identity.headline",
    headlineParams: { count: input.holdingsCount, themes: themeCount },
    bodyKey: themeCount > 0 ? "impact_living.fil.identity.body" : undefined,
    bodyParams: topSlice
      ? { cause: topSlice.cause as CauseTag, pct: Math.round(topSlice.pct) }
      : undefined,
    source: SOURCE_ENGINE,
    dateISO: input.generatedAt || nowISO,
    anchored: Boolean(input.generatedAt),
  });

  // 2 — Intensité carbone vs indice de référence (donnée réelle, sourcée + datée).
  const intensity = input.impact.intensity;
  if (intensity && intensity.vsBenchmarkDeltaPct != null) {
    const pct = Math.round(Math.abs(intensity.vsBenchmarkDeltaPct) * 100);
    if (intensity.cleaner) {
      out.push({
        id: "cleaner",
        tone: "growth",
        headlineKey: "impact_living.fil.cleaner.headline",
        headlineParams: { pct },
        bodyKey: "impact_living.fil.cleaner.body",
        bodyParams: { coverage: Math.round(intensity.coverage * 100) },
        source: input.benchmarkSource ?? "MSCI ACWI",
        sourceAsOf: input.benchmarkAsOf,
        dateISO: nowISO,
        anchored: false,
      });
    } else if (pct > 0) {
      // La mauvaise nouvelle se raconte aussi — calmement, sourcée (CLAUDE.md §1.7).
      out.push({
        id: "dirtier",
        tone: "caution",
        headlineKey: "impact_living.fil.dirtier.headline",
        headlineParams: { pct },
        bodyKey: "impact_living.fil.dirtier.body",
        source: input.benchmarkSource ?? "MSCI ACWI",
        sourceAsOf: input.benchmarkAsOf,
        dateISO: nowISO,
        anchored: false,
      });
    }
  }

  // 3 — Empreinte mesurée (équivalence concrète) OU état honnête « en cours de mesure ».
  if (input.impact.measured && input.impact.presentation.show) {
    const equiv = input.impact.presentation.equivalences.find((e) => e.factorId === "car_km");
    if (equiv) {
      out.push({
        id: "measured",
        tone: "neutral",
        headlineKey: "impact_living.fil.measured.headline",
        headlineParams: {
          km: Math.round(Math.abs(equiv.value)),
          coverage: Math.round(input.impact.coverage * 100),
        },
        bodyKey: "impact_living.fil.measured.body",
        source: input.equivalenceSource ?? equiv.source,
        sourceAsOf: equiv.asOf,
        dateISO: nowISO,
        anchored: false,
      });
    }
  } else {
    out.push({
      id: "measuring",
      tone: "neutral",
      headlineKey: "impact_living.fil.measuring.headline",
      bodyKey: "impact_living.fil.measuring.body",
      source: SOURCE_ENGINE,
      dateISO: nowISO,
      anchored: false,
    });
  }

  // 4 — Première conviction : ce qui domine ton monde (identité, non chiffré comme perf).
  if (topSlice && themeCount > 1) {
    out.push({
      id: "first_cause",
      tone: "identity",
      headlineKey: "impact_living.fil.first_cause.headline",
      headlineParams: { cause: topSlice.cause as CauseTag, pct: Math.round(topSlice.pct) },
      source: SOURCE_ENGINE,
      dateISO: nowISO,
      anchored: false,
    });
  }

  return out;
}
