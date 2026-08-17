-- ─────────────────────────────────────────────────────────────────────────────
-- Planifie la DÉCOUVERTE de fonds (expansion de l'univers investissable).
--
-- Le hook /hooks/discover-funds télécharge l'export « product screener » officiel
-- iShares (CSV, via ISHARES_PRODUCTS_CSV_URL), en extrait l'identité des fonds et
-- crée en base ceux qui manquent — en is_active=false. C'était le chaînon
-- manquant : rien n'INSÉRAIT de nouveaux fonds, d'où un univers figé au catalogue
-- seedé à la main. Les fonds découverts n'entrent dans l'univers investissable
-- qu'après enrichissement (ishares_factsheet, prix Yahoo) et validation de
-- complétude par recompute-ingestion-plan (activation automatique ≥ seuil).
--
-- Cadence : hebdomadaire, lundi 05:00 UTC — avant recompute-ingestion-plan
-- (quotidien 06:00) pour que les nouveaux fonds soient pris dans le plan du jour.
-- Sans ISHARES_PRODUCTS_CSV_URL configuré, le hook no-op proprement (aucune
-- donnée inventée). Secret d'appel = 'cron_secret' du Vault, comme les autres
-- hooks (§6, jamais de secret en clair).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  perform cron.unschedule('discover-funds-weekly')
  where exists (select 1 from cron.job where jobname = 'discover-funds-weekly');
end$$;

select cron.schedule(
  'discover-funds-weekly',
  '0 5 * * 1',
  $$
  select net.http_post(
    url := 'https://seedow.life/hooks/discover-funds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
