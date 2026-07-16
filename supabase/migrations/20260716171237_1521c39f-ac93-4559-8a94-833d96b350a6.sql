CREATE OR REPLACE FUNCTION public.get_latest_asset_prices(p_asset_ids UUID[])
RETURNS TABLE(asset_id UUID, close NUMERIC, price_date DATE)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (ap.asset_id) ap.asset_id, ap.close, ap.price_date
  FROM public.asset_prices ap
  WHERE ap.asset_id = ANY(p_asset_ids)
  ORDER BY ap.asset_id, ap.price_date DESC;
$$;

REVOKE ALL ON FUNCTION public.get_latest_asset_prices(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_asset_prices(UUID[]) TO authenticated;

CREATE OR REPLACE VIEW public.assets_missing_market_data
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.ticker,
  a.name,
  a.isin,
  a.yahoo_symbol,
  (q.asset_id IS NOT NULL) AS has_live_quote,
  (p.asset_id IS NOT NULL) AS has_price_history
FROM public.assets a
LEFT JOIN public.asset_quotes q ON q.asset_id = a.id
LEFT JOIN LATERAL (SELECT 1 FROM public.asset_prices WHERE asset_id = a.id LIMIT 1) p(asset_id) ON true
WHERE a.is_active = true
  AND (a.yahoo_symbol IS NULL OR q.asset_id IS NULL);

GRANT SELECT ON public.assets_missing_market_data TO authenticated;