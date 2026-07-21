-- Préférences d'affichage persistées côté profil, pour une synchronisation
-- cross-appareil (le localStorage reste la couche instantanée / pré-auth).
-- Colonnes nullables : NULL = "pas encore choisi", on retombe alors sur la
-- valeur locale/par défaut côté client. Les CHECK bornent aux valeurs valides.
--
-- Aucune nouvelle politique RLS nécessaire : la table `profiles` autorise déjà
-- chaque utilisateur à lire et mettre à jour sa propre ligne.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS view_mode text
    CHECK (view_mode IN ('simple', 'expert')),
  ADD COLUMN IF NOT EXISTS font_scale text
    CHECK (font_scale IN ('standard', 'large', 'xlarge')),
  ADD COLUMN IF NOT EXISTS theme text
    CHECK (theme IN ('light', 'dark', 'system'));
