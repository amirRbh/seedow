WITH ranked_active AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY generated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.portfolios
  WHERE is_active = true
)
UPDATE public.portfolios p
SET is_active = false,
    updated_at = now()
FROM ranked_active r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS portfolios_one_active_per_user_idx
ON public.portfolios (user_id)
WHERE is_active = true;