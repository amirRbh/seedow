import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode, type ViewMode } from "@/hooks/useViewMode";
import { useFontScale, type FontScale } from "@/hooks/useFontScale";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";

// Colonnes ajoutées par la migration 20260721120000 — pas encore dans les
// types générés par Lovable Cloud (régénérés au prochain sync).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface StoredPrefs {
  view_mode: ViewMode | null;
  font_scale: FontScale | null;
  theme: ThemePreference | null;
}

function isViewMode(v: unknown): v is ViewMode {
  return v === "simple" || v === "expert";
}
function isFontScale(v: unknown): v is FontScale {
  return v === "standard" || v === "large" || v === "xlarge";
}
function isTheme(v: unknown): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

/**
 * Synchronise les préférences d'affichage (niveau de détail, taille de texte,
 * thème) entre le localStorage et le profil de l'utilisateur, pour qu'elles
 * suivent d'un appareil à l'autre.
 *
 * - À la connexion : on hydrate depuis le profil (le cloud fait autorité), une
 *   seule fois par utilisateur. L'application est silencieuse (pas de toast).
 * - Ensuite : chaque changement local est réécrit vers le profil (debounce).
 *
 * Best-effort et non bloquant : une erreur réseau laisse simplement le
 * localStorage comme source locale. Rend `null`.
 */
export function PreferenceSync() {
  const { user } = useAuth();
  const { mode, setMode } = useViewMode();
  const { scale, setScale } = useFontScale();
  const { theme, setTheme } = useTheme();
  const hydratedFor = useRef<string | null>(null);

  // Hydratation depuis le profil, une fois par session utilisateur.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("profiles")
        .select("view_mode, font_scale, theme")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || error || !data) {
        if (!cancelled && !error) hydratedFor.current = user.id;
        return;
      }
      hydratedFor.current = user.id;
      const prefs = data as StoredPrefs;
      if (isViewMode(prefs.view_mode)) setMode(prefs.view_mode, { silent: true });
      if (isFontScale(prefs.font_scale)) setScale(prefs.font_scale);
      if (isTheme(prefs.theme)) setTheme(prefs.theme);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, setMode, setScale, setTheme]);

  // Persistance des changements locaux vers le profil (après hydratation).
  useEffect(() => {
    if (!user || hydratedFor.current !== user.id) return;
    const timer = setTimeout(() => {
      void db
        .from("profiles")
        .update({ view_mode: mode, font_scale: scale, theme })
        .eq("id", user.id);
    }, 600);
    return () => clearTimeout(timer);
  }, [user, mode, scale, theme]);

  return null;
}
