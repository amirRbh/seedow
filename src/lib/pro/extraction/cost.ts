/**
 * Coût et plafond des appels d'extraction (module pur, testé).
 *
 * Tarifs publics Anthropic en dollars par million de tokens, relevés le
 * 2026-11-28 (à revérifier sur la page de tarifs avant toute décision
 * budgétaire). Écriture en cache = 1,25 × le prix d'entrée.
 *
 * Un modèle absent de la table est facturé au tarif le plus élevé connu : le
 * plafond reste prudent même si le serveur a servi un autre modèle (repli).
 */

export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
}

export const PRICES_AS_OF = "2026-11-28";

/**
 * Seuls les tarifs documentés figurent ici. Quand le prix de lecture en cache
 * n'est pas documenté, on retient le prix d'entrée (majorant) plutôt qu'une
 * valeur déduite.
 */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.1 },
};

const MOST_EXPENSIVE: ModelPrice = Object.values(MODEL_PRICES).reduce((a, b) =>
  b.output > a.output ? b : a,
);

export function priceOf(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? MOST_EXPENSIVE;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Coût en dollars d'un appel, d'après l'usage renvoyé par l'API. */
export function costUsd(model: string, usage: Usage): number {
  const p = priceOf(model);
  const read = usage.cache_read_input_tokens ?? 0;
  const write = usage.cache_creation_input_tokens ?? 0;
  return (
    (usage.input_tokens * p.input +
      write * p.input * 1.25 +
      read * p.cacheRead +
      usage.output_tokens * p.output) /
    1_000_000
  );
}

/**
 * Plafond de dépense d'un run. `reserve()` refuse un appel dont l'estimation
 * ferait dépasser le plafond ; `record()` impute le coût réel.
 */
export class CostBudget {
  private spent = 0;
  private calls = 0;

  constructor(readonly limitUsd: number) {
    if (!Number.isFinite(limitUsd) || limitUsd <= 0) {
      throw new Error(`Plafond de dépense invalide : ${limitUsd}`);
    }
  }

  /** Estimation prudente : tokens d'entrée comptés + sortie maximale autorisée. */
  estimate(model: string, inputTokens: number, maxOutputTokens: number): number {
    return costUsd(model, { input_tokens: inputTokens, output_tokens: maxOutputTokens });
  }

  canAfford(estimateUsd: number): boolean {
    return this.spent + estimateUsd <= this.limitUsd;
  }

  record(model: string, usage: Usage): number {
    const c = costUsd(model, usage);
    this.spent += c;
    this.calls++;
    return c;
  }

  get spentUsd(): number {
    return this.spent;
  }

  get callCount(): number {
    return this.calls;
  }
}

export function formatUsd(x: number): string {
  return `${x.toFixed(x < 1 ? 4 : 2)} $`;
}
