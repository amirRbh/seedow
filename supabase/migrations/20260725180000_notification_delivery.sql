-- ─────────────────────────────────────────────────────────────────────────────
-- Livraison des notifications hors-app (email) — le maillon manquant de la
-- rétention. Le moteur d'alertes existe déjà (asset_score_history +
-- snapshot_scores_and_alert → table `alerts`, cloche in-app), mais rien ne fait
-- REVENIR l'utilisateur quand il n'est pas dans l'app.
--
-- Ce que fait cette migration :
--   1. `alerts.notified_at` : marque une alerte déjà envoyée par email (anti-doublon).
--   2. `notification_preferences` : le consentement email, PERSISTÉ (remplace le
--      toggle maquette des réglages). OPT-IN par défaut (email_alerts = false) :
--      aucun email surprise, pas de dark pattern (CLAUDE.md §1.5). L'utilisateur
--      active explicitement, et peut désactiver à tout moment.
--
-- RLS activée sur la nouvelle table utilisateur (non négociable §1.4).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Marqueur d'envoi sur les alertes ────────────────────────────────────────
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

COMMENT ON COLUMN public.alerts.notified_at IS
  'Horodatage de l''envoi par email (digest). NULL = pas encore notifiée hors-app. Écrit par le job /hooks/dispatch-notifications.';

-- Index partiel : le job cherche les alertes non encore notifiées.
CREATE INDEX IF NOT EXISTS alerts_unnotified_idx
  ON public.alerts (user_id, created_at)
  WHERE notified_at IS NULL AND dismissed_at IS NULL;

-- 2) Préférences de notification (consentement persisté) ──────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- OPT-IN : false par défaut. On n'envoie un email que si l'utilisateur l'a
  -- explicitement demandé.
  email_alerts boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS
  'Consentement de notification par utilisateur. email_alerts opt-in (false par défaut) — pas de dark pattern (§1.5).';

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit et ne gère QUE sa propre ligne.
DROP POLICY IF EXISTS "Users read own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users read own notification prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users insert own notification prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users update own notification prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Le job de dispatch (service_role) lit les préférences de tous les utilisateurs
-- et écrit alerts.notified_at ; il contourne la RLS via la clé service_role.
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- Tient updated_at à jour.
CREATE OR REPLACE FUNCTION public.touch_notification_prefs_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_prefs_touch_trg ON public.notification_preferences;
CREATE TRIGGER notification_prefs_touch_trg
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_prefs_updated_at();
