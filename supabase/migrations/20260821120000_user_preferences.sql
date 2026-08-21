-- ─────────────────────────────────────────────────────────────────────────────
-- PIU — Préférences utilisateur de 1re classe (pivot Personal Investment Universe).
--
-- Aujourd'hui, les convictions de l'utilisateur sont FIGÉES dans la ligne
-- `portfolios` (causes/exclusions/risk_target d'un portefeuille donné) et
-- n'existent pas en dehors d'un portefeuille généré. Le pivot PIU en fait un
-- objet réutilisable, PONDÉRÉ (poids par dimension de matching) et VERSIONNÉ
-- (chaque réglage produit une nouvelle version, l'historique n'est jamais écrasé
-- → traçabilité §1.2, et carburant du reclassement « en direct » de l'univers).
--
-- Séparation stricte (docs/ARCHITECTURE-PIU.md §6) : cette table stocke ce que
-- l'UTILISATEUR pondère. Elle ne stocke AUCUN score d'actif ni jugement de
-- Seedow. Les clés de `dimension_weights` sont validées côté app (registre
-- `src/lib/preferences/dimensions.ts`), pas figées en base : la méthodologie de
-- matching peut évoluer sans migration.
--
-- RLS activée (§1.4 non négociable). Écritures scopées `auth.uid()`. Le bump de
-- version (désactiver l'ancienne active + insérer la nouvelle) passe par une
-- fonction SECURITY DEFINER atomique, comme le reste du schéma sensible.
-- Aucune donnée insérée ici.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Version croissante par utilisateur (1, 2, 3…). L'historique est conservé.
  version      integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  -- Une seule version active par utilisateur (garantie par l'index partiel).
  is_active    boolean NOT NULL DEFAULT true,
  -- Poids par dimension de matching (0..1), clés validées app-side. Ex.
  -- { "climate": 0.9, "cost": 0.5, "harm_avoidance": 0.8 }. Bornée en taille
  -- pour qu'un client scripté ne puisse pas gonfler la ligne (~2 Ko largement
  -- au-dessus des ~9 dimensions attendues).
  dimension_weights jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(dimension_weights) = 'object'
           AND pg_column_size(dimension_weights) <= 2048),
  -- Exclusions dures (mêmes valeurs que `assets.excluded_sectors`).
  exclusions   public.exclusion_tag[] NOT NULL DEFAULT '{}'
    CHECK (array_length(exclusions, 1) IS NULL OR array_length(exclusions, 1) <= 12),
  -- Tolérance au risque DÉCLARÉE, distincte de l'objectif (faiblesse n°8 de
  -- l'audit méthodo : le risque ne doit pas être déduit du seul but). NULL =
  -- non renseignée → l'app retombe sur le comportement historique.
  risk_tolerance text
    CHECK (risk_tolerance IN ('prudent', 'equilibre', 'dynamique')),
  -- Contraintes libres réutilisables (ex. { "available_eu_only": true,
  -- "max_ter_pct": 0.4, "regions": ["europe"] }), bornée en taille.
  constraints  jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(constraints) = 'object'
           AND pg_column_size(constraints) <= 2048),
  -- Provenance de CETTE version : 'default' (profil publié), 'onboarding'
  -- (dérivé des réponses), 'manual' (réglage explicite des curseurs).
  source       text NOT NULL DEFAULT 'default'
    CHECK (source IN ('default', 'onboarding', 'manual')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);

-- Au plus UNE version active par utilisateur.
CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_one_active_idx
  ON public.user_preferences (user_id) WHERE is_active;
-- Lecture de l'historique par utilisateur, plus récente d'abord.
CREATE INDEX IF NOT EXISTS user_preferences_user_version_idx
  ON public.user_preferences (user_id, version DESC);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own preferences" ON public.user_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Bump de version atomique. Désactive l'active courante et insère la nouvelle
-- version en une seule transaction, sous l'identité de l'appelant (auth.uid()).
-- SECURITY DEFINER + search_path verrouillé, comme has_role / claim_session_events.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_user_preferences(
  p_dimension_weights jsonb,
  p_exclusions public.exclusion_tag[],
  p_risk_tolerance text,
  p_constraints jsonb,
  p_source text
) RETURNS public.user_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_next integer;
  v_row public.user_preferences;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Numéro de version suivant (1 si aucune ligne encore).
  SELECT COALESCE(max(version), 0) + 1 INTO v_next
  FROM public.user_preferences WHERE user_id = v_uid;

  -- Désactive l'active courante (l'index partiel n'admet qu'une active).
  UPDATE public.user_preferences
     SET is_active = false
   WHERE user_id = v_uid AND is_active;

  INSERT INTO public.user_preferences (
    user_id, version, is_active, dimension_weights, exclusions,
    risk_tolerance, constraints, source
  ) VALUES (
    v_uid, v_next, true,
    COALESCE(p_dimension_weights, '{}'::jsonb),
    COALESCE(p_exclusions, '{}'::public.exclusion_tag[]),
    p_risk_tolerance,
    COALESCE(p_constraints, '{}'::jsonb),
    COALESCE(p_source, 'manual')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.save_user_preferences(jsonb, public.exclusion_tag[], text, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.save_user_preferences(jsonb, public.exclusion_tag[], text, jsonb, text) TO authenticated;

COMMENT ON TABLE public.user_preferences IS
  'PIU — préférences utilisateur pondérées et versionnées (poids par dimension de matching). Aucun score d''actif. Clés de dimension_weights validées app-side. RLS auth.uid().';
COMMENT ON FUNCTION public.save_user_preferences(jsonb, public.exclusion_tag[], text, jsonb, text) IS
  'Insère une nouvelle version active des préférences de l''appelant et désactive la précédente, atomiquement.';
