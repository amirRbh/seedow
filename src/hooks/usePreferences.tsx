/**
 * Préférences PIU côté client : lecture de la version active + sauvegarde d'une
 * nouvelle version (bump atomique via la RPC `save_user_preferences`).
 *
 * Comme `useWatchlist`, on parle directement à Supabase (RLS scopée `auth.uid()`)
 * plutôt qu'à une server function — le classement de l'univers se recalcule côté
 * client, on veut les poids en mémoire sans aller-retour SSR. La logique de
 * validation/normalisation vit dans `lib/preferences/model.ts` (pur, testé) ;
 * ce hook ne fait que l'orchestration React-Query + le garde-fou anti-no-op.
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildDefaultPreferences,
  preferencesEqual,
  rowToPreferences,
  sanitizeConstraints,
  sanitizeExclusions,
  sanitizeRiskTolerance,
  sanitizeWeights,
  type PreferencesRow,
  type UserPreferences,
  type UserPreferencesInput,
} from "@/lib/preferences/model";

// `user_preferences` / `save_user_preferences` pas encore dans les types générés
// (régénérés au prochain sync Lovable) — cast local, comme useWatchlist.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const QUERY_KEY = "user-preferences";

interface State {
  /** Préférences actives, ou le profil par défaut (non encore persisté). */
  preferences: UserPreferences | { defaults: UserPreferencesInput };
  /** Poids/exclusions effectifs (actifs ou défauts), toujours exploitables. */
  effective: UserPreferencesInput;
  loading: boolean;
  /** Enregistre une nouvelle version — silencieusement ignorée si rien ne change. */
  save: (input: UserPreferencesInput) => void;
  saving: boolean;
}

/** Normalise une source (actifs OU défauts) en une charge exploitable. */
function toEffective(p: State["preferences"]): UserPreferencesInput {
  if ("defaults" in p) return p.defaults;
  return {
    dimensionWeights: p.dimensionWeights,
    exclusions: p.exclusions,
    riskTolerance: p.riskTolerance,
    constraints: p.constraints,
    source: p.source,
  };
}

export function usePreferences(): State {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [QUERY_KEY, user?.id], [user?.id]);

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<State["preferences"]> => {
      const { data: row, error } = await db
        .from("user_preferences")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return { defaults: buildDefaultPreferences() };
      return rowToPreferences(row as PreferencesRow);
    },
  });

  const preferences = useMemo<State["preferences"]>(
    () => data ?? { defaults: buildDefaultPreferences() },
    [data],
  );
  const effective = useMemo(() => toEffective(preferences), [preferences]);

  const mutation = useMutation({
    mutationFn: async (input: UserPreferencesInput): Promise<UserPreferences | null> => {
      if (!user) throw new Error("not-authed");
      // Garde-fou anti-no-op : ne pas créer une version identique à l'active.
      if (preferencesEqual(effective, input)) return null;
      const { data: row, error } = await db.rpc("save_user_preferences", {
        p_dimension_weights: sanitizeWeights(input.dimensionWeights),
        p_exclusions: sanitizeExclusions(input.exclusions),
        p_risk_tolerance: sanitizeRiskTolerance(input.riskTolerance),
        p_constraints: sanitizeConstraints(input.constraints),
        p_source: input.source,
      });
      if (error) throw new Error(error.message);
      return rowToPreferences(row as PreferencesRow);
    },
    onSuccess: (row) => {
      if (row) queryClient.setQueryData(queryKey, row);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error(t("preferences.saveError", "Impossible d'enregistrer tes préférences."));
    },
  });

  const save = useCallback((input: UserPreferencesInput) => mutation.mutate(input), [mutation]);

  return {
    preferences,
    effective,
    loading: isLoading,
    save,
    saving: mutation.isPending,
  };
}
