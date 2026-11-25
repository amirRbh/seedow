import { createContext, useContext } from "react";
import type { ProContext } from "@/lib/pro/pro.functions";

export interface ProContextValue extends ProContext {
  refresh: () => Promise<void>;
}

export const ProCtx = createContext<ProContextValue | null>(null);

/** Cabinet et profils clients de l'utilisateur connecté (chargés par le layout `/pro`). */
export function usePro(): ProContextValue & { cabinet: NonNullable<ProContext["cabinet"]> } {
  const v = useContext(ProCtx);
  if (!v || !v.cabinet) throw new Error("usePro hors du layout /pro");
  return v as ProContextValue & { cabinet: NonNullable<ProContext["cabinet"]> };
}
