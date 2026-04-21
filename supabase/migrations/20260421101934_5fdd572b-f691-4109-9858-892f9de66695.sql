-- Required for the upsert(onConflict) calls in /hooks/refresh-market-data
ALTER TABLE public.asset_prices
  ADD CONSTRAINT asset_prices_asset_date_unique UNIQUE (asset_id, price_date);

ALTER TABLE public.asset_quotes
  ADD CONSTRAINT asset_quotes_asset_unique UNIQUE (asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_date
  ON public.asset_prices (asset_id, price_date DESC);