-- ─────────────────────────────────────────────────────────
-- Rééquilibrage actionnable.
-- Jusqu'ici, `portfolio_holdings_valued` valorisait chaque ligne depuis le
-- prix au jour de `generated_at` (l'ancre de coût), figée pour toujours —
-- le drift entre allocation cible et allocation réelle (détecté côté client
-- dans signals.ts) n'avait aucune action associée : juste un lien vers Ethi.
--
-- `rebalanced_at` déplace cette ancre : quand l'utilisateur rééquilibre,
-- on la fixe à maintenant, et la valorisation repart de la valeur actuelle
-- avec les poids cibles (déjà stockés dans `weights`, inchangés) — sans
-- vendre/racheter quoi que ce soit puisqu'il n'y a pas d'argent réel.
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS rebalanced_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW public.portfolio_holdings_valued
WITH (security_invoker = on) AS
WITH active_pf AS (
  SELECT p.id, p.user_id, p.weights, p.generated_at, p.rebalanced_at, p.initial_amount
  FROM public.portfolios p
),
weights_unnested AS (
  SELECT pf.id AS portfolio_id,
         pf.user_id,
         COALESCE(pf.rebalanced_at, pf.generated_at) AS anchor_at,
         pf.initial_amount,
         (kv.key)::uuid AS asset_id,
         (kv.value)::numeric AS weight
  FROM active_pf pf
  CROSS JOIN LATERAL jsonb_each_text(pf.weights) AS kv(key, value)
  WHERE (kv.value)::numeric > 0
)
SELECT
  w.portfolio_id,
  w.user_id,
  w.asset_id,
  a.ticker,
  a.name,
  a.asset_class,
  w.weight,
  COALESCE(w.initial_amount, 0)::numeric AS total_invested,
  (COALESCE(w.initial_amount, 0) * w.weight)::numeric AS invested_in_holding,
  q.price AS current_price,
  COALESCE(entry.close, q.price) AS entry_price,
  CASE
    WHEN COALESCE(entry.close, q.price) IS NULL OR COALESCE(entry.close, q.price) = 0
      THEN COALESCE(w.initial_amount, 0) * w.weight
    ELSE COALESCE(w.initial_amount, 0) * w.weight * (q.price / COALESCE(entry.close, q.price))
  END AS current_value,
  q.fetched_at AS quote_fetched_at
FROM weights_unnested w
JOIN public.assets a ON a.id = w.asset_id
LEFT JOIN public.asset_quotes q ON q.asset_id = w.asset_id
LEFT JOIN LATERAL (
  SELECT ap.close
  FROM public.asset_prices ap
  WHERE ap.asset_id = w.asset_id
    AND ap.price_date <= w.anchor_at::date
  ORDER BY ap.price_date DESC
  LIMIT 1
) entry ON true;

GRANT SELECT ON public.portfolio_holdings_valued TO authenticated;
