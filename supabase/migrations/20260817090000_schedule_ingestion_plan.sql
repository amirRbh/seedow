-- ─────────────────────────────────────────────────────────────────────────────
-- Planifie le recalcul du backlog d'ingestion priorisé (Blueprint moat B2/B3).
--
-- Le hook /hooks/recompute-ingestion-plan existe et journalise le backlog
-- (demande réelle + fraîcheur + complétude, cf. lib/data-engine/ingestion-plan.ts)
-- dans cron_run_log, mais n'était jamais déclenché : aucun job pg_cron ne
-- l'appelait. Sans ce job, le backlog reste vide et `scripts/ingest-funds.ts
-- --plan` n'a rien à consommer.
--
-- Cadence : quotidien à 06:00 UTC, avant refresh-market-data-daily (18h UTC) et
-- dispatch-notifications-daily (08h UTC) — le backlog est frais avant toute
-- exécution manuelle de l'ingestion (workflow_dispatch, job offline poppler).
-- Le secret d'appel réutilise le même 'cron_secret' (Vault) que les autres hooks
-- — jamais de secret en clair (§6).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- Idempotent : on retire un éventuel job déjà planifié avant de le recréer.
  perform cron.unschedule('recompute-ingestion-plan-daily')
  where exists (select 1 from cron.job where jobname = 'recompute-ingestion-plan-daily');
end$$;

select cron.schedule(
  'recompute-ingestion-plan-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://seedow.life/hooks/recompute-ingestion-plan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
