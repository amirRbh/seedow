-- ─────────────────────────────────────────────────────────────────────────
-- Alertes greenwashing temps réel
-- ─────────────────────────────────────────────────────────────────────────
-- Historise les signaux durables d'un actif (score ESG, article SFDR) à chaque
-- changement, et prévient les utilisateurs qui suivent l'actif quand ces
-- signaux se dégradent — le rail d'alertes (cloche, dédup, sévérité) existe déjà.
--
-- greenwashing_risk n'est pas stocké (calculé côté client, cf. lib/esg/
-- transparency.ts) : on alerte donc sur ses signaux sous-jacents, esg_score et
-- sfdr_article, comme prévu par la feuille de route.

-- 1) Historique append-only des scores ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_score_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  esg_score    numeric(5, 2),
  sfdr_article int,
  captured_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_score_history_asset_idx
  ON public.asset_score_history (asset_id, captured_at DESC);

ALTER TABLE public.asset_score_history ENABLE ROW LEVEL SECURITY;

-- Lecture publique (donnée de référence, comme les actifs). Les écritures
-- passent exclusivement par le trigger SECURITY DEFINER ci-dessous.
DROP POLICY IF EXISTS "Anyone can read score history" ON public.asset_score_history;
CREATE POLICY "Anyone can read score history" ON public.asset_score_history
  FOR SELECT USING (true);

GRANT SELECT ON public.asset_score_history TO anon, authenticated;
GRANT ALL ON public.asset_score_history TO service_role;

-- 2) Snapshot + génération d'alertes à la dégradation ───────────────────────
CREATE OR REPLACE FUNCTION public.snapshot_scores_and_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  esg_dropped   boolean := NEW.esg_score IS DISTINCT FROM OLD.esg_score
                           AND NEW.esg_score < OLD.esg_score - 3;
  sfdr_downgrade boolean := OLD.sfdr_article IS NOT NULL
                           AND NEW.sfdr_article IS NOT NULL
                           AND NEW.sfdr_article < OLD.sfdr_article;
  sev public.alert_severity;
  a_title text;
  a_body  text;
  ddk     text;
BEGIN
  -- Rien à faire si les signaux durables n'ont pas bougé.
  IF NEW.esg_score IS NOT DISTINCT FROM OLD.esg_score
     AND NEW.sfdr_article IS NOT DISTINCT FROM OLD.sfdr_article THEN
    RETURN NEW;
  END IF;

  -- Historisation systématique du changement.
  INSERT INTO public.asset_score_history (asset_id, esg_score, sfdr_article)
  VALUES (NEW.id, NEW.esg_score, NEW.sfdr_article);

  -- Alerte uniquement à la dégradation.
  IF NOT (esg_dropped OR sfdr_downgrade) THEN
    RETURN NEW;
  END IF;

  IF sfdr_downgrade THEN
    sev := 'alert';
    a_title := format('Classement durable revu à la baisse — %s', NEW.ticker);
    a_body := format(
      '%s passe de l''article SFDR %s à %s — un signal de déclassement de son ambition durable. Un fonds que tu suis : vérifie s''il correspond toujours à tes valeurs.',
      NEW.name, OLD.sfdr_article, NEW.sfdr_article);
  ELSE
    sev := CASE WHEN NEW.esg_score <= OLD.esg_score - 10 THEN 'alert' ELSE 'warn' END;
    a_title := format('Score d''impact en baisse — %s', NEW.ticker);
    a_body := format(
      'Le score d''impact de %s est passé de %s à %s/100. Un fonds que tu suis : ce recul peut signaler un risque de greenwashing, à vérifier.',
      NEW.name, round(OLD.esg_score)::int, round(NEW.esg_score)::int);
  END IF;

  -- Une alerte par actif et par jour, pour chaque utilisateur qui le suit.
  ddk := 'gw:' || NEW.id::text || ':' || to_char(now(), 'YYYY-MM-DD');

  INSERT INTO public.alerts
    (user_id, portfolio_id, kind, severity, title, body, cta_label, cta_href, dedup_key)
  SELECT w.user_id, NULL, 'esg_drift', sev, a_title, a_body, 'Voir le fonds', '/discover', ddk
  FROM public.watchlists w
  WHERE w.asset_id = NEW.id
  ON CONFLICT (user_id, dedup_key) WHERE dismissed_at IS NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assets_score_change_trg ON public.assets;
CREATE TRIGGER assets_score_change_trg
  AFTER UPDATE OF esg_score, sfdr_article ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_scores_and_alert();
