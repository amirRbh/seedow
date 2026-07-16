/**
 * Yahoo Finance fetcher (server-only).
 * Uses the public chart endpoint — no API key required.
 *
 * Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
 *   ?range=1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|max
 *   &interval=1d|1wk|1mo
 */

export interface YahooQuote {
  symbol: string;
  price: number;
  previousClose: number | null;
  changePct: number | null;
  currency: string;
  marketState: string | null;
}

export interface YahooBar {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface YahooChartResult {
  quote: YahooQuote;
  bars: YahooBar[];
}

const UA = "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";

/** Codes considérés transitoires : ça vaut le coup de réessayer. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/**
 * Fetch chart + meta for one symbol.
 * range/interval: defaults give ~2 years of daily closes.
 *
 * Retry avec backoff exponentiel (jusqu'à 2 tentatives supplémentaires) sur les
 * erreurs transitoires (429/5xx/réseau) — Yahoo Finance étant une API non
 * officielle sans SLA, un blocage temporaire ou un pic de latence ne doit pas
 * faire échouer tout un run d'ingestion horaire.
 */
export async function fetchYahooChart(
  symbol: string,
  range: string = "2y",
  interval: string = "1d",
  maxRetries: number = 2,
): Promise<YahooChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}&includePrePost=false`;

  let lastErr: Error = new Error(`Yahoo fetch failed for ${symbol}`);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
    }
    try {
      return await fetchYahooChartOnce(url, symbol);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const status = e instanceof YahooHttpError ? e.status : null;
      const retryable = status === null || isRetryableStatus(status);
      if (!retryable || attempt === maxRetries) throw lastErr;
    }
  }
  throw lastErr;
}

class YahooHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchYahooChartOnce(url: string, symbol: string): Promise<YahooChartResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new YahooHttpError(res.status, `Yahoo HTTP ${res.status} for ${symbol}`);
  }
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          currency?: string;
          marketState?: string;
        };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
      error?: { code?: string; description?: string } | null;
    };
  };

  const result = json.chart?.result?.[0];
  if (!result || !result.meta) {
    const err = json.chart?.error;
    throw new Error(`Yahoo empty result for ${symbol}: ${err?.description ?? "no data"}`);
  }

  const meta = result.meta;
  const price = Number(meta.regularMarketPrice);
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const changePct = prev && price ? ((price - prev) / prev) * 100 : null;

  const quote: YahooQuote = {
    symbol,
    price,
    previousClose: prev,
    changePct,
    currency: meta.currency ?? "EUR",
    marketState: meta.marketState ?? null,
  };

  const ts = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const bars: YahooBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    const d = new Date(ts[i] * 1000);
    const date = d.toISOString().slice(0, 10);
    bars.push({ date, close: Number(c) });
  }

  return { quote, bars };
}
