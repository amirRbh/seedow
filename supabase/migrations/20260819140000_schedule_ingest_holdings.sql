-- ─────────────────────────────────────────────────────────────────────────────
-- Planifie l'INGESTION DES HOLDINGS (composition réelle des fonds → fund_holdings).
--
-- Le hook /hooks/ingest-holdings télécharge les fichiers de composition officiels
-- des sociétés de gestion (iShares/BlackRock…), les parse, applique le contrôle
-- qualité et persiste des lignes DATÉES et SOURCÉES dans `fund_holdings`. C'est ce
-- qui alimente l'overlap look-through (`overlap.ts`) et le carbone bottom-up
-- (`carbon-estimate.server.ts`) — jusqu'ici en veille faute de holdings.
--
-- No-op SÛR tant que le secret `HOLDINGS_SOURCES` (JSON { "<ISIN>": "<url csv>" })
-- n'est pas configuré : le hook renvoie « HOLDINGS_SOURCES vide » AVANT tout
-- téléchargement (aucune tentative réseau, aucun log d'erreur, aucune donnée
-- inventée — §1.3). Il ne fait un travail réel qu'une fois l'egress vers les
-- sociétés de gestion autorisé ET les URLs officielles curées fournies.
--
-- Cadence : hebdomadaire, lundi 05:30 UTC — APRÈS discover-funds (05:00, qui crée
-- les fonds manquants) et AVANT recompute-ingestion-plan (06:00). Les holdings
-- fraîchement ingérées sont ainsi prises en compte dans le plan du jour.
-- Secret d'appel = 'cron_secret' du Vault (§6, jamais de secret en clair).
--
-- ⚠ Opération post-ingestion recommandée (à planifier/déclencher séparément) :
--   POST /hooks/recompute-carbon-estimates  → active le carbone bottom-up sur les
--   fonds fraîchement peuplés.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  perform cron.unschedule('ingest-holdings-weekly')
  where exists (select 1 from cron.job where jobname = 'ingest-holdings-weekly');
end$$;

select cron.schedule(
  'ingest-holdings-weekly',
  '30 5 * * 1',
  $$
  select net.http_post(
    url := 'https://seedow.life/hooks/ingest-holdings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
