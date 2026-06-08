
-- portfolio_shares: revoke broad SELECT, regrant only non-PII columns to authenticated.
-- service_role keeps full access so admin code / triggers still work.
REVOKE SELECT ON public.portfolio_shares FROM authenticated;
GRANT SELECT (
  id,
  portfolio_id,
  public_handle,
  causes,
  exclusions,
  risk_target,
  horizon_years,
  weights,
  expected_return,
  volatility,
  esg_score,
  carbon_intensity,
  shared_at,
  updated_at
) ON public.portfolio_shares TO authenticated;

-- cron_run_log: explicit policy so RLS isn't "enabled with no policy".
-- service_role bypasses RLS regardless; this just documents intent.
DROP POLICY IF EXISTS "service_role_only_select" ON public.cron_run_log;
CREATE POLICY "service_role_only_select"
  ON public.cron_run_log
  FOR SELECT
  TO service_role
  USING (true);
