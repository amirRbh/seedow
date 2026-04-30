-- Reprogramme le job existant avec la bonne URL et un planning quotidien
do $$
begin
  -- Désactive l'ancien job
  perform cron.unschedule('refresh-market-data-hourly')
  where exists (select 1 from cron.job where jobname = 'refresh-market-data-hourly');
end$$;

-- Recrée le job en quotidien (lun-ven 18h UTC) sur la bonne URL
select cron.schedule(
  'refresh-market-data-daily',
  '0 18 * * 1-5',
  $$
  select net.http_post(
    url := 'https://seedow.life/hooks/refresh-market-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{"range":"5d","interval":"1d"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);