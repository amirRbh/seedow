import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  analyzeComposition,
  type AnalyzeCompositionResult,
} from "@/lib/portfolio/analysis/analyze.functions";
import type { CauseTag, ExclusionTag } from "@/lib/portfolio/types";

/**
 * Analyse d'une composition, débouncée.
 *
 * L'analyse a besoin des actifs complets, donc d'un aller-retour serveur. Deux
 * précautions pour que ça reste sobre :
 *
 *  - **débounce** : sur le builder, l'appel attend que les curseurs se taisent ;
 *  - **signature** : deux compositions identiques ne redemandent rien, ce qui
 *    évite de rappeler le serveur à chaque rendu de React.
 *
 * Les poids partent TELS QUELS. Ce hook ne complète ni ne renormalise rien : il
 * analyse ce que l'utilisateur a posé, y compris une composition partielle.
 */

export interface AnalysisInput {
  /** { asset_id: poids 0..1 } */
  weights: Record<string, number>;
  causes: CauseTag[];
  exclusions: ExclusionTag[];
  horizonYears?: number | null;
}

export interface AnalysisState {
  analysis: AnalyzeCompositionResult | null;
  loading: boolean;
  error: string | null;
}

/** Signature stable d'une composition — l'ordre des clés ne doit pas compter. */
function signature(input: AnalysisInput): string {
  const weights = Object.entries(input.weights)
    .filter(([, w]) => w > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, w]) => `${id}:${w.toFixed(6)}`)
    .join(",");
  return [
    weights,
    [...input.causes].sort().join("|"),
    [...input.exclusions].sort().join("|"),
    input.horizonYears ?? "",
  ].join("§");
}

export function usePortfolioAnalysis(input: AnalysisInput, debounceMs = 400): AnalysisState {
  const analyze = useServerFn(analyzeComposition);
  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    loading: false,
    error: null,
  });
  const lastSignature = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sig = signature(input);
  const hasLines = Object.values(input.weights).some((w) => w > 0);

  useEffect(() => {
    if (!hasLines) {
      lastSignature.current = null;
      setState({ analysis: null, loading: false, error: null });
      return;
    }
    if (lastSignature.current === sig) return;

    if (timer.current) clearTimeout(timer.current);
    setState((s) => ({ ...s, loading: true, error: null }));

    let cancelled = false;
    timer.current = setTimeout(() => {
      lastSignature.current = sig;
      analyze({
        data: {
          weights: input.weights,
          causes: input.causes,
          exclusions: input.exclusions,
          horizon_years: input.horizonYears ?? null,
        },
      })
        .then((analysis) => {
          if (!cancelled) setState({ analysis, loading: false, error: null });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          console.error("[usePortfolioAnalysis]", err);
          // Une analyse qui échoue ne doit pas effacer la précédente : mieux vaut
          // un chiffre daté et signalé qu'un écran vide.
          lastSignature.current = null;
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "analysis_failed",
          }));
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // `sig` résume l'entrée : c'est la seule dépendance qui doit relancer l'appel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, hasLines, debounceMs]);

  return state;
}
