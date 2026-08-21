/**
 * Collections PIU côté client (RLS scopée `auth.uid()`), sur le modèle de
 * `useWatchlist` : accès direct à Supabase, updates optimistes, jamais d'action
 * silencieuse (toast en cas d'échec). La logique pure (poids effectifs,
 * concentration) vit dans `lib/collections/model.ts`.
 *
 * Boucle centrale du nouveau parcours : ajouter un actif à une collection. Une
 * collection par défaut est créée à la volée au premier ajout (l'utilisateur
 * n'affronte jamais un formulaire avant d'avoir un usage).
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  concentrationFeedback,
  effectiveWeights,
  type Collection,
  type CollectionItem,
  type WeightMode,
} from "@/lib/collections/model";

// Tables `collections` / `collection_items` pas encore dans les types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const QUERY_KEY = "collections";

interface CollectionRow {
  id: string;
  name: string;
  weight_mode: WeightMode;
  created_at: string;
  updated_at: string;
  collection_items?: Array<{
    asset_id: string;
    weight_pct: number | null;
    amount: number | null;
    note: string | null;
  }>;
}

function rowToCollection(row: CollectionRow): Collection {
  const items: CollectionItem[] = (row.collection_items ?? []).map((i) => ({
    assetId: i.asset_id,
    weightPct: i.weight_pct,
    amount: i.amount,
    note: i.note,
  }));
  return {
    id: row.id,
    name: row.name,
    weightMode: row.weight_mode,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface State {
  collections: Collection[];
  loading: boolean;
  /** Actif présent dans au moins une collection. */
  isInAnyCollection: (assetId: string) => boolean;
  /** Ajoute à la collection par défaut (créée à la volée si besoin). */
  addToDefault: (assetId: string, assetName?: string) => void;
  /** Retire l'actif de toutes les collections de l'utilisateur. */
  removeEverywhere: (assetId: string) => void;
  createCollection: (name: string) => void;
  /** Poids effectifs + concentration d'une collection (feedback immédiat). */
  weightsOf: (collectionId: string) => Record<string, number>;
  concentrationOf: (collectionId: string) => ReturnType<typeof concentrationFeedback>;
}

export function useCollections(): State {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [QUERY_KEY, user?.id], [user?.id]);

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<Collection[]> => {
      const { data: rows, error } = await db
        .from("collections")
        .select(
          "id, name, weight_mode, created_at, updated_at, collection_items(asset_id, weight_pct, amount, note)",
        )
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (rows ?? []).map(rowToCollection);
    },
  });

  const collections = useMemo(() => data ?? [], [data]);

  const membership = useMemo(() => {
    const set = new Set<string>();
    for (const c of collections) for (const i of c.items) set.add(i.assetId);
    return set;
  }, [collections]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const addMutation = useMutation({
    mutationFn: async (assetId: string) => {
      if (!user) throw new Error("not-authed");
      // Collection par défaut = la première ; créée à la volée si aucune.
      let target = collections[0];
      if (!target) {
        const { data: created, error: cErr } = await db
          .from("collections")
          .insert({ user_id: user.id, name: t("collections.defaultName", "Ma collection") })
          .select("id, name, weight_mode, created_at, updated_at")
          .single();
        if (cErr) throw new Error(cErr.message);
        target = rowToCollection(created);
      }
      const { error } = await db
        .from("collection_items")
        .upsert(
          { collection_id: target.id, asset_id: assetId },
          { onConflict: "collection_id,asset_id", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("collections.addError", "Impossible d'ajouter à ta collection.")),
  });

  const removeMutation = useMutation({
    mutationFn: async (assetId: string) => {
      if (!user) throw new Error("not-authed");
      const ids = collections.map((c) => c.id);
      if (ids.length === 0) return;
      const { error } = await db
        .from("collection_items")
        .delete()
        .eq("asset_id", assetId)
        .in("collection_id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("collections.removeError", "Impossible de retirer cet actif.")),
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("not-authed");
      const { error } = await db.from("collections").insert({
        user_id: user.id,
        name: name.trim() || t("collections.defaultName", "Ma collection"),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: () => toast.error(t("collections.createError", "Impossible de créer la collection.")),
  });

  const isInAnyCollection = useCallback((assetId: string) => membership.has(assetId), [membership]);
  const addToDefault = useCallback(
    (assetId: string, assetName?: string) => {
      addMutation.mutate(assetId);
      toast.success(
        assetName
          ? t("collections.added", "{{name}} ajouté à ta collection.", { name: assetName })
          : t("collections.addedGeneric", "Ajouté à ta collection."),
      );
    },
    [addMutation, t],
  );
  const removeEverywhere = useCallback(
    (assetId: string) => removeMutation.mutate(assetId),
    [removeMutation],
  );
  const createCollection = useCallback(
    (name: string) => createMutation.mutate(name),
    [createMutation],
  );

  const byId = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);
  const weightsOf = useCallback(
    (collectionId: string) => {
      const c = byId.get(collectionId);
      return c ? effectiveWeights(c.items, c.weightMode) : {};
    },
    [byId],
  );
  const concentrationOf = useCallback(
    (collectionId: string) => {
      const c = byId.get(collectionId);
      return c ? concentrationFeedback(c.items, c.weightMode) : null;
    },
    [byId],
  );

  return {
    collections,
    loading: isLoading,
    isInAnyCollection,
    addToDefault,
    removeEverywhere,
    createCollection,
    weightsOf,
    concentrationOf,
  };
}
