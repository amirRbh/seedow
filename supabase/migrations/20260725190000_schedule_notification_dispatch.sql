-- ─────────────────────────────────────────────────────────────────────────────
-- Planifie la livraison des notifications email (digest quotidien).
--
-- Ferme la boucle de rétention : le moteur crée les alertes (trigger DB), le job
-- /hooks/dispatch-notifications les LIVRE par email aux utilisateurs opt-in.
-- Sans ce job planifié, les emails ne partent jamais.
--
-- Cadence : une fois par jour à 08:00 UTC (~9-10h CET). Un digest quotidien, pas
-- un flux d'alertes à la minute — ton factuel et posé, jamais alarmiste (§7).
-- Chaque alerte n'est envoyée qu'une fois (le job marque alerts.notified_at).
--
-- Sûr à planifier dès maintenant : le endpoint est NO-OP tant que le provider
-- email (RESEND_API_KEY / EMAIL_FROM) n'est pas configuré côté environnement.
-- Le secret d'appel réutilise le même 'cron_secret' (Vault) que les autres hooks
-- — jamais de secret en clair (§6).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- Idempotent : on retire un éventuel job déjà planifié avant de le recréer.
  perform cron.unschedule('dispatch-notifications-daily')
  where exists (select 1 from cron.job where jobname = 'dispatch-notifications-daily');
end$$;

select cron.schedule(
  'dispatch-notifications-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://seedow.life/hooks/dispatch-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
