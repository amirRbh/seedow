-- 1. Add portfolio_id to deposits
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deposits_portfolio_id ON public.deposits(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user_portfolio ON public.deposits(user_id, portfolio_id);

-- 2. Limit to 3 active portfolios per user via trigger
CREATE OR REPLACE FUNCTION public.enforce_max_active_portfolios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count int;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO active_count
    FROM public.portfolios
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id <> NEW.id;
    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Tu as atteint la limite de 3 jardins actifs. Archive un jardin pour en créer un nouveau.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_active_portfolios ON public.portfolios;
CREATE TRIGGER trg_enforce_max_active_portfolios
  BEFORE INSERT OR UPDATE OF is_active ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_active_portfolios();

-- 3. Update view to compute valuation per portfolio
DROP VIEW IF EXISTS public.portfolio_holdings_valued;

CREATE VIEW public.portfolio_holdings_valued
WITH (security_invoker = true)
AS
WITH active_pf AS (
  SELECT
    p.id              AS portfolio_id,
    p.user_id,
    p.initial_amount,
    p.generated_at,
    p.weights
  FROM public.portfolios p
  WHERE p.is_active = true
),
weights_expanded AS (
  SELECT
    ap.portfolio_id,
    ap.user_id,
    ap.initial_amount,
    ap.generated_at,
    (kv.key)::uuid                       AS asset_id,
    (kv.value)::text::numeric            AS weight
  FROM active_pf ap,
       LATERAL jsonb_each(ap.weights) kv
  WHERE (kv.value)::text::numeric > 0
),
deposits_per_pf AS (
  SELECT
    d.user_id,
    d.portfolio_id,
    SUM(d.amount)              AS deposits_total,
    MIN(d.created_at)          AS first_deposit_at
  FROM public.deposits d
  WHERE d.status = 'settled'
  GROUP BY d.user_id, d.portfolio_id
)
SELECT
  w.portfolio_id,
  w.user_id,
  w.asset_id,
  a.ticker,
  a.name,
  a.asset_class,
  w.weight,
  (COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) AS total_invested,
  ((COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) * w.weight) AS invested_in_holding,
  q.price                                                          AS current_price,
  ((COALESCE(w.initial_amount, 0) + COALESCE(ud.deposits_total, 0)) * w.weight
    * (q.price / NULLIF(entry.close, 0)))                          AS current_value,
  entry.close                                                      AS entry_price,
  q.fetched_at                                                     AS quote_fetched_at
FROM weights_expanded w
JOIN public.assets a ON a.id = w.asset_id
LEFT JOIN deposits_per_pf ud
  ON ud.user_id = w.user_id AND ud.portfolio_id = w.portfolio_id
LEFT JOIN public.asset_quotes q ON q.asset_id = w.asset_id
LEFT JOIN LATERAL (
  SELECT ap.close
  FROM public.asset_prices ap
  WHERE ap.asset_id = w.asset_id
    AND ap.price_date < LEAST(
      COALESCE(ud.first_deposit_at::date, w.generated_at::date),
      w.generated_at::date
    )
  ORDER BY ap.price_date DESC
  LIMIT 1
) entry ON true;

GRANT SELECT ON public.portfolio_holdings_valued TO authenticated;