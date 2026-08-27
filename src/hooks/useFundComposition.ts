import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicFundByIsin } from "@/lib/esg/public-fund.functions";
import type { HoldingLine } from "@/lib/portfolio/holdings-summary";

export interface FundComposition {
  status: "idle" | "loading" | "ready";
  holdings: HoldingLine[];
  asOf: string | null;
  sourceUrl: string | null;
  /** Émetteur du fonds, tel qu'enregistré — c'est lui qui publie la composition. */
  issuer: string | null;
  /** Frais courants annuels, en fraction. `null` si le fonds n'est pas trouvé. */
  ter: number | null;
}

const EMPTY: FundComposition = {
  status: "idle",
  holdings: [],
  asOf: null,
  sourceUrl: null,
  issuer: null,
  ter: null,
};

/**
 * Composition publiée d'UN fonds, chargée à la demande.
 *
 * Elle ne vit pas dans l'index public (`/api/public/esg-preview`) et n'a rien à
 * y faire : 500 fonds × plusieurs centaines de lignes chacun feraient un
 * payload sans rapport avec ce qu'un visiteur regarde — un seul fonds, celui
 * qu'il vient d'ouvrir. D'où ce chargement ciblé, déclenché par le geste.
 *
 * ── Un échec n'est pas une erreur à l'écran ───────────────────────────────
 *
 * Réseau coupé, fonds inconnu, émetteur qui ne publie rien : les trois
 * ressortent en composition vide. Non par paresse, mais parce qu'ils ont la
 * même conséquence pour le lecteur — il ne verra pas ce que ce fonds détient —
 * et qu'aucun des trois ne l'autorise à voir un chiffre estimé à la place. Le
 * bloc qui consomme ce hook dit alors franchement que la composition n'est pas
 * disponible.
 *
 * @param key   ISIN ou ticker du fonds. `null` : rien n'est chargé.
 * @param active Faux tant que le contenu n'est pas visible (feuille fermée,
 *               section repliée) — inutile d'aller chercher une donnée que
 *               personne ne regarde.
 */
export function useFundComposition(key: string | null, active = true): FundComposition {
  const fetchFund = useServerFn(getPublicFundByIsin);
  const [state, setState] = useState<FundComposition>(EMPTY);

  useEffect(() => {
    if (!key || !active) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState({ ...EMPTY, status: "loading" });
    void (async () => {
      try {
        const fund = await fetchFund({ data: key });
        if (cancelled) return;
        setState({
          status: "ready",
          holdings: fund?.holdings ?? [],
          asOf: fund?.holdingsAsOf ?? null,
          sourceUrl: fund?.holdingsSourceUrl ?? null,
          issuer: fund?.issuer ?? null,
          ter: typeof fund?.ter === "number" ? fund.ter : null,
        });
      } catch {
        if (cancelled) return;
        setState({ ...EMPTY, status: "ready" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // `fetchFund` est stable pour une même server function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  return state;
}
