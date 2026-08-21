/**
 * Server functions des préférences utilisateur (pivot PIU).
 *
 * Lecture/écriture scopées `auth.uid()` via le client Supabase middleware
 * (`requireSupabaseAuth`). L'écriture passe par la fonction SECURITY DEFINER
 * `save_user_preferences` (bump de version atomique) — jamais un INSERT nu qui
 * risquerait deux versions actives.
 *
 * Les valeurs lues de la base traversent les `sanitize*` de `model.ts` : une
 * ligne corrompue ou partielle dégrade vers le défaut, sans throw.
 *
 * NB : `user_preferences` n'est pas encore dans les types Supabase auto-générés
 * (types.ts, non éditable à la main §1.6) — on caste l'accès localement, comme
 * le reste du code touchant des tables/colonnes récentes. À retirer après
 * régénération des types.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ExclusionTag } from "@/lib/portfolio/types";
import {
  buildDefaultPreferences,
  rowToPreferences,
  sanitizeConstraints,
  sanitizeExclusions,
  sanitizeRiskTolerance,
  sanitizeWeights,
  type PreferenceConstraints,
  type PreferenceSource,
  type PreferencesRow,
  type RiskTolerance,
  type UserPreferences,
  type UserPreferencesInput,
} from "./model";

const VALID_SOURCES: readonly PreferenceSource[] = ["default", "onboarding", "manual"];

// Accès non typé (table absente des types auto-générés). Cast minimal et localisé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any;

/**
 * Préférences actives de l'utilisateur, ou le profil par défaut (non encore
 * persisté) s'il n'en a aucune. Ne renvoie jamais null — le PIU a toujours un
 * jeu de poids sur lequel classer l'univers.
 */
export const getActivePreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserPreferences | { defaults: UserPreferencesInput }> => {
    const client = context.supabase as LooseClient;
    const { data, error } = await client
      .from("user_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { defaults: buildDefaultPreferences() };
    return rowToPreferences(data as PreferencesRow);
  });

interface SavePreferencesArgs {
  dimensionWeights: Record<string, number>;
  exclusions: ExclusionTag[];
  riskTolerance: RiskTolerance | null;
  constraints: PreferenceConstraints;
  source: PreferenceSource;
}

/**
 * Persiste une nouvelle version active des préférences (bump atomique via RPC).
 * L'`inputValidator` re-assainit tout côté serveur : le client ne peut pas
 * imposer une clé de dimension inconnue, une exclusion hors enum, une source
 * arbitraire ni un `jsonb` non borné.
 */
export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SavePreferencesArgs) => ({
    p_dimension_weights: sanitizeWeights(input.dimensionWeights),
    p_exclusions: sanitizeExclusions(input.exclusions),
    p_risk_tolerance: sanitizeRiskTolerance(input.riskTolerance),
    p_constraints: sanitizeConstraints(input.constraints),
    p_source: (VALID_SOURCES as string[]).includes(input.source) ? input.source : "manual",
  }))
  .handler(async ({ context, data }) => {
    const client = context.supabase as LooseClient;
    const { data: row, error } = await client.rpc("save_user_preferences", data);
    if (error) throw new Error(error.message);
    return rowToPreferences(row as PreferencesRow);
  });

/**
 * Historique des versions de préférences (plus récente d'abord). Alimente la vue
 * « comment tes préférences ont évolué » et la traçabilité (§1.2).
 */
export const listPreferenceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserPreferences[]> => {
    const client = context.supabase as LooseClient;
    const { data, error } = await client
      .from("user_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as PreferencesRow[]).map(rowToPreferences);
  });
