CREATE OR REPLACE VIEW public.portfolio_holdings_valued AS
WITH active_pf AS (
  SELECT p.id, p.user_id, p.weights, p.generated_at, p.initial_amount
  FROM portfolios p
  WHERE p.is_active = true
),
user_deposits AS (
  SELECT d.user_id,
         COALESCE(sum(d.amount), 0)::numeric AS deposits_total,
         min(d.created_at) AS first_deposit_at
  FROM deposits d
  WHERE d.status = 'settled'::deposit_status
  GROUP BY d.user_id
),
weights_unnested AS (
  SELECT pf.id AS portfolio_id,
         pf.user_id,
         pf.generated_at,
         pf.initial_amount,
         kv.key::uuid AS asset_id,
         kv.value::numeric AS weight
  FROM active_pf pf
  CROSS JOIN LATERAL jsonb_each_text(pf.weights) kv(key, value)
  WHERE kv.value::numeric > 0
)
SELECT
  w.portfolio_id,
  w.user_id,
  w.asset_id,
  a.ticker,
  a.name,
  a.asset_class,
  w.weight,
  (COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0))::numeric AS total_invested,
  ((COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) * w.weight)::numeric AS invested_in_holding,
  q.price AS current_price,
  COALESCE(entry.close, q.price) AS entry_price,
  CASE
    WHEN COALESCE(entry.close, q.price) IS NULL OR COALESCE(entry.close, q.price) = 0
      THEN (COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) * w.weight
    ELSE (COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) * w.weight * (q.price / COALESCE(entry.close, q.price))
  END AS current_value,
  q.fetched_at AS quote_fetched_at
FROM weights_unnested w
JOIN assets a ON a.id = w.asset_id
LEFT JOIN user_deposits ud ON ud.user_id = w.user_id
LEFT JOIN asset_quotes q ON q.asset_id = w.asset_id
LEFT JOIN LATERAL (
  SELECT ap.close
  FROM asset_prices ap
  WHERE ap.asset_id = w.asset_id
    AND ap.price_date < LEAST(
      COALESCE(ud.first_deposit_at::date, w.generated_at::date),
      w.generated_at::date
    )
  ORDER BY ap.price_date DESC
  LIMIT 1
) entry ON true;

ALTER VIEW public.portfolio_holdings_valued SET (security_invoker = true);