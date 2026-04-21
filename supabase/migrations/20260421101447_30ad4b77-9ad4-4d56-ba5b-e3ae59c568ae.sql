-- ─────────────────────────────────────────────────────────
-- 1) Add yahoo_symbol to assets
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS yahoo_symbol TEXT;

CREATE INDEX IF NOT EXISTS assets_yahoo_symbol_idx
  ON public.assets(yahoo_symbol)
  WHERE yahoo_symbol IS NOT NULL;

-- Map current ETF tickers to Yahoo Finance symbols (Euronext Amsterdam / Xetra UCITS)
UPDATE public.assets SET yahoo_symbol = 'IWDA.AS'  WHERE ticker = 'IWDA';
UPDATE public.assets SET yahoo_symbol = 'WOOD.L'   WHERE ticker = 'FORS';
UPDATE public.assets SET yahoo_symbol = 'KROP'     WHERE ticker = 'AGRI';
UPDATE public.assets SET yahoo_symbol = 'IBGS.AS'  WHERE ticker = 'IBGS';
UPDATE public.assets SET yahoo_symbol = 'IPRP.AS'  WHERE ticker = 'IPRP';
UPDATE public.assets SET yahoo_symbol = 'SPYP.DE'  WHERE ticker = 'SPYP';
UPDATE public.assets SET yahoo_symbol = 'GBLD.L'   WHERE ticker = 'GBLD';
UPDATE public.assets SET yahoo_symbol = 'SGLD.L'   WHERE ticker = 'SGLD';
UPDATE public.assets SET yahoo_symbol = 'CSH2.PA'  WHERE ticker = 'CSH2';
UPDATE public.assets SET yahoo_symbol = 'XEON.DE'  WHERE ticker = 'XEON';

-- ─────────────────────────────────────────────────────────
-- 2) asset_prices — daily historical close prices
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_prices (
  asset_id   UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  price_date DATE NOT NULL,
  close      NUMERIC(18,6) NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'EUR',
  source     TEXT NOT NULL DEFAULT 'yahoo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, price_date)
);

CREATE INDEX IF NOT EXISTS asset_prices_date_idx
  ON public.asset_prices(price_date DESC);

ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asset prices readable by authenticated users"
  ON public.asset_prices FOR SELECT
  TO authenticated USING (true);

-- No insert/update/delete policies → only service_role (server) can write.

-- ─────────────────────────────────────────────────────────
-- 3) asset_quotes — latest live quote (one row per asset)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_quotes (
  asset_id          UUID PRIMARY KEY REFERENCES public.assets(id) ON DELETE CASCADE,
  price             NUMERIC(18,6) NOT NULL,
  previous_close    NUMERIC(18,6),
  change_pct        NUMERIC(10,4),
  currency          TEXT NOT NULL DEFAULT 'EUR',
  market_state      TEXT,
  source            TEXT NOT NULL DEFAULT 'yahoo',
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asset quotes readable by authenticated users"
  ON public.asset_quotes FOR SELECT
  TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────
-- 4) View: portfolio_holdings_valued
--    For the active portfolio of each user, compute current value
--    and P&L per holding using real quotes + real deposits.
--
--    Logic:
--    - total_invested = sum(settled deposits) for the user
--    - per holding: invested_in_holding = total_invested * weight
--    - current_value = invested_in_holding * (current_price / avg_entry_price)
--      where avg_entry_price is approximated as the price on the day of
--      the first settled deposit (fallback: current price → 0 P&L)
--    - pnl = current_value - invested_in_holding
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.portfolio_holdings_valued
WITH (security_invoker = on) AS
WITH active_pf AS (
  SELECT p.id, p.user_id, p.weights, p.generated_at
  FROM public.portfolios p
  WHERE p.is_active = true
),
user_deposits AS (
  SELECT
    user_id,
    COALESCE(SUM(amount), 0)::NUMERIC AS total_invested,
    MIN(created_at)                   AS first_deposit_at
  FROM public.deposits
  WHERE status = 'settled'
  GROUP BY user_id
),
weights_unnested AS (
  SELECT
    pf.id           AS portfolio_id,
    pf.user_id,
    (kv.key)::UUID  AS asset_id,
    (kv.value)::NUMERIC AS weight
  FROM active_pf pf
  CROSS JOIN LATERAL jsonb_each_text(pf.weights) AS kv(key, value)
  WHERE (kv.value)::NUMERIC > 0
)
SELECT
  w.portfolio_id,
  w.user_id,
  w.asset_id,
  a.ticker,
  a.name,
  a.asset_class,
  w.weight,
  COALESCE(ud.total_invested, 0)                      AS total_invested,
  (COALESCE(ud.total_invested, 0) * w.weight)         AS invested_in_holding,
  q.price                                             AS current_price,
  COALESCE(entry.close, q.price)                      AS entry_price,
  -- Current value = invested * (current / entry). If entry is null/0, value = invested.
  CASE
    WHEN COALESCE(entry.close, q.price) IS NULL OR COALESCE(entry.close, q.price) = 0
      THEN COALESCE(ud.total_invested, 0) * w.weight
    ELSE
      (COALESCE(ud.total_invested, 0) * w.weight)
        * (q.price / COALESCE(entry.close, q.price))
  END                                                 AS current_value,
  q.fetched_at                                        AS quote_fetched_at
FROM weights_unnested w
JOIN public.assets       a  ON a.id = w.asset_id
LEFT JOIN user_deposits  ud ON ud.user_id = w.user_id
LEFT JOIN public.asset_quotes q ON q.asset_id = w.asset_id
LEFT JOIN LATERAL (
  SELECT ap.close
  FROM public.asset_prices ap
  WHERE ap.asset_id = w.asset_id
    AND ap.price_date <= COALESCE(ud.first_deposit_at::DATE, CURRENT_DATE)
  ORDER BY ap.price_date DESC
  LIMIT 1
) entry ON true;

GRANT SELECT ON public.portfolio_holdings_valued TO authenticated;
