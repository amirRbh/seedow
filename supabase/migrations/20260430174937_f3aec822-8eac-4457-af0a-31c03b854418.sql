-- Active les extensions nécessaires (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Récupère le CRON_SECRET depuis le vault
do $$
declare
  cron_secret text;
begin
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if cron_secret is null then
    raise notice 'CRON_SECRET introuvable dans vault — le job ne sera pas créé.';
    return;
  end if;

  -- Supprime un éventuel ancien job
  perform cron.unschedule('refresh-market-data-daily')
  where exists (select 1 from cron.job where jobname = 'refresh-market-data-daily');

  perform cron.schedule(
    'refresh-market-data-daily',
    '0 18 * * 1-5',  -- Lun→Ven à 18h UTC (après clôture marchés EU)
    format($job$
      select net.http_post(
        url := 'https://seedow.life/hooks/refresh-market-data',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer %s'
        ),
        body := '{"range":"5d","interval":"1d"}'::jsonb,
        timeout_milliseconds := 60000
      ) as request_id;
    $job$, cron_secret)
  );
end$$;