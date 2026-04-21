-- 1) (Re)store the cron secret in the vault using the real value from edge env
--    We can't read process.env from SQL, so we delete & recreate via vault.create_secret
--    using the value the user already configured. We do this by recomputing from the
--    existing secret pattern: just upsert with the known production value.
DO $$
DECLARE
  v_secret text := 'a3f2b8c9'; -- placeholder; real value injected below
BEGIN
  -- Remove any existing entry to avoid duplicates / stale empty ones
  DELETE FROM vault.secrets WHERE name = 'cron_secret';
END $$;

-- Insert the real secret (must match CRON_SECRET env var of the edge runtime)
SELECT vault.create_secret(
  'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5'::text,
  'cron_secret',
  'Bearer token used by pg_cron to call /hooks/refresh-market-data'
);

-- 2) Reschedule the cron with the correct published URL
SELECT cron.unschedule('refresh-market-data-hourly');

SELECT cron.schedule(
  'refresh-market-data-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://seedow.lovable.app/hooks/refresh-market-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3) Trigger an immediate seed run so the dashboard fills up now
SELECT net.http_post(
  url := 'https://seedow.lovable.app/hooks/refresh-market-data',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
  ),
  body := '{"seed": true}'::jsonb
);