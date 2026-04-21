DELETE FROM vault.secrets WHERE name = 'cron_secret';
SELECT vault.create_secret(
  'efc3171d134da6867c0e956414a9dfcf35c231b75c87e5cf37dac3bf10076963'::text,
  'cron_secret',
  'Bearer token used by pg_cron to call /hooks/refresh-market-data'
);