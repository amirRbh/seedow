/**
 * Instrumentation produit générique — mesure l'activation et la rétention J1/J7
 * de la bêta ouverte (table `app_events`, vues `beta_retention_cohorts`).
 *
 * Même contrat que src/lib/preferences/tracking.ts : best-effort, ne bloque
 * JAMAIS l'UX, silencieux pré-auth. Les bornes (taille payload, rate limit)
 * sont appliquées côté DB, seul endroit incontournable.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/preferences/tracking";

/**
 * Événements clés du funnel bêta. En ajouter un = l'ajouter ici (le nom est
 * contraint à 64 chars côté DB). L'activation "portefeuille créé" vit déjà
 * dans `decision_events` (trigger DB) — pas dupliquée ici.
 */
export type AppEventName =
  | "search_performed"
  | "asset_viewed"
  | "watchlist_added"
  | "watchlist_removed"
  | "alert_opened"
  | "ethi_message_sent"
  | "feedback_submitted"
  | "course_started"
  | "course_completed";

export async function trackAppEvent(
  name: AppEventName,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return; // pré-auth : rien à mesurer

    // La table n'est pas encore dans les types générés par Lovable Cloud
    // (régénérés au prochain sync après application de la migration).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("app_events").insert({
      user_id: userId,
      session_id: getSessionId(),
      name,
      payload,
    });
    if (error) console.warn("[trackAppEvent]", error.message);
  } catch (e) {
    console.warn("[trackAppEvent] fatal", e);
  }
}
