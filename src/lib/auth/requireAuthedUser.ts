import { redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Garde de route partagée pour les 9+ routes authentifiées.
 *
 * Utilise `getSession()` (lecture locale, pas d'aller-retour réseau) plutôt
 * que `getUser()` (revalidation serveur systématique) : cette garde ne sert
 * qu'à rediriger un visiteur non connecté vers /auth pour l'UX — la véritable
 * frontière de sécurité reste la RLS Postgres + `requireSupabaseAuth` côté
 * serveur, qui valident le JWT à chaque appel de données. Avant, chaque
 * navigation vers une route protégée payait une revalidation serveur en plus
 * de celle déjà faite par `AuthProvider`.
 */
export async function requireAuthedUser(redirectTo: string): Promise<User> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    throw redirect({ to: "/auth", search: { redirect: redirectTo, mode: "login" } });
  }
  return user;
}
