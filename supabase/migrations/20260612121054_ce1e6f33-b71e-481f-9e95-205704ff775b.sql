
-- 1. Hide portfolio_shares.user_id from clients (column-level privilege).
--    Service role keeps full access; authenticated can no longer read user_id of other users.
REVOKE SELECT (user_id) ON public.portfolio_shares FROM authenticated;
REVOKE SELECT (user_id) ON public.portfolio_shares FROM anon;

-- 2. Lock down SECURITY DEFINER functions that should never be callable via the Data API.
--    Triggers and the vault helper do not need EXECUTE for anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_portfolio_decision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_max_active_portfolios() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. has_role is used inside RLS policies executed by authenticated users.
--    Keep EXECUTE for authenticated only; revoke from anon (no policies require it).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
