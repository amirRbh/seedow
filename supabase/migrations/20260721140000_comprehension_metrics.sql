-- ─────────────────────────────────────────────────────────────────────────
-- Mesure de la compréhension
-- ─────────────────────────────────────────────────────────────────────────
-- Le pari de Seedow est que les gens *comprennent*. On instrumente donc la
-- compréhension elle-même, à partir des `app_events` déjà collectés :
--   - engagement pédagogique (cours démarrés / terminés, score de quiz) ;
--   - adoption du niveau de détail (mode simple vs expert) ;
--   - corrélation entre "avoir terminé un cours" et la rétention J7.
--
-- Vues en security_invoker : lues via service_role (admin bêta), qui voit tout.

-- 1) Synthèse globale ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.comprehension_overview
WITH (security_invoker = true) AS
WITH completions AS (
  SELECT
    user_id,
    (payload ->> 'score')::numeric   AS score,
    (payload ->> 'total')::numeric   AS total
  FROM public.app_events
  WHERE name = 'course_completed'
),
last_mode AS (
  SELECT DISTINCT ON (user_id) user_id, payload ->> 'mode' AS mode
  FROM public.app_events
  WHERE name = 'view_mode_changed'
  ORDER BY user_id, occurred_at DESC
)
SELECT
  (SELECT count(DISTINCT user_id) FROM public.app_events WHERE name = 'course_started')   AS users_started_course,
  (SELECT count(DISTINCT user_id) FROM completions)                                       AS users_completed_course,
  (SELECT count(*) FROM completions)                                                      AS total_completions,
  (SELECT round(avg(score / NULLIF(total, 0)) * 100, 1) FROM completions WHERE total > 0) AS avg_quiz_pct,
  (SELECT count(*) FROM last_mode WHERE mode = 'simple')                                  AS mode_simple_users,
  (SELECT count(*) FROM last_mode WHERE mode = 'expert')                                  AS mode_expert_users;

-- 2) Rétention J7 : ceux qui ont terminé un cours vs les autres ──────────────
-- Réutilise app_event_first_seen (cohorte = jour du premier événement).
CREATE OR REPLACE VIEW public.comprehension_retention
WITH (security_invoker = true) AS
WITH completers AS (
  SELECT DISTINCT user_id FROM public.app_events WHERE name = 'course_completed'
)
SELECT
  (f.user_id IN (SELECT user_id FROM completers)) AS completed_course,
  count(DISTINCT f.user_id)                        AS cohort_size,
  count(DISTINCT e7.user_id)                       AS retained_d7
FROM public.app_event_first_seen f
LEFT JOIN public.app_events e7
  ON e7.user_id = f.user_id
 AND e7.occurred_at::date BETWEEN f.cohort_day + 5 AND f.cohort_day + 9
GROUP BY (f.user_id IN (SELECT user_id FROM completers));

GRANT SELECT ON public.comprehension_overview, public.comprehension_retention
  TO authenticated, service_role;
