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

const UA =
  "Mozilla/5.0 (compatible; SeedowBot/1.0; +https://seedow.app)";

/**
 * Fetch chart + meta for one symbol.
 * range/interval: defaults give ~2 years of daily closes.
 */
export async function fetchYahooChart(
  symbol: string,
  range: string = "2y",
  interval: string = "1d",
): Promise<YahooChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}&includePrePost=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
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
    throw new Error(
      `Yahoo empty result for ${symbol}: ${err?.description ?? "no data"}`,
    );
  }

  const meta = result.meta;
  const price = Number(meta.regularMarketPrice);
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const changePct =
    prev && price ? ((price - prev) / prev) * 100 : null;

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
