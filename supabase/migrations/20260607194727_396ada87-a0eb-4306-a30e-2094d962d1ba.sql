DROP POLICY IF EXISTS "Cron logs readable by authenticated users" ON public.cron_run_log;
REVOKE SELECT ON public.cron_run_log FROM authenticated, anon;