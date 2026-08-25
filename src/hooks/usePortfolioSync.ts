import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";

/**
 * « Je viens d'écrire en base — remets l'app d'accord avec elle. »
 *
 * ── Pourquoi ce hook existe ───────────────────────────────────────────────
 *
 * `useUserPortfolios` et `useActivePortfolio` s'abonnaient tous deux à des
 * `postgres_changes` sur `portfolios` pour se rafraîchir tout seuls. Sauf
 * qu'AUCUNE migration n'ajoute cette table à la publication `supabase_realtime` :
 * les canaux s'ouvrent, et ne délivrent jamais rien.
 *
 * Le symptôme était brutal. Après avoir composé et enregistré, l'utilisateur
 * arrivait sur Le Fil et voyait « Ton portefeuille commence ici » — l'écran des
 * comptes vides :
 *
 *   1. « replace » désactive l'ancien portefeuille et en insère un nouveau ;
 *   2. `activeId`, mémorisé en localStorage, pointe toujours sur l'ancien ;
 *   3. `useActivePortfolio` demande `id = ancien AND is_active = true` ;
 *   4. aucune ligne → `portfolio = null` → écran vide.
 *
 * Son portefeuille était bien en base. L'app ne le regardait pas.
 *
 * ── Ce que fait ce hook ───────────────────────────────────────────────────
 *
 * Il rend la resynchronisation EXPLICITE, au moment où l'on sait qu'une
 * écriture a réussi — plutôt que de l'espérer d'un canal muet. Le realtime peut
 * être activé plus tard : il deviendra un raccourci, pas la condition pour que
 * l'écran suivant soit juste.
 */
/**
 * Vues dont le contenu dépend du portefeuille de l'utilisateur. Toutes portent
 * son id en second segment de clé, ce qui permet une invalidation par préfixe.
 */
const DERIVED_QUERY_KEYS = [
  "active-portfolio",
  "portfolio-valuation",
  "portfolio-history-factors",
  "decision-history",
  "financial-goals",
  "alerts",
] as const;

export function usePortfolioSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { refresh, setActiveId } = useUserPortfolios();

  /**
   * À appeler après TOUTE écriture réussie sur `portfolios`.
   *
   * `portfolioId` : celui que l'utilisateur doit voir ensuite. Le passer est
   * important après une création — sans lui, l'app garde en tête le
   * portefeuille précédent, qui vient justement d'être désactivé.
   */
  return useCallback(
    (portfolioId?: string) => {
      if (portfolioId) setActiveId(portfolioId);
      refresh();
      // Toutes les vues dérivées du portefeuille. On invalide par PRÉFIXE :
      // react-query fait une correspondance partielle, donc `["x", userId]`
      // atteint `["x", userId, activeId, …]`. Une vue oubliée afficherait un
      // état périmé sans jamais le dire — le risque est silencieux.
      for (const key of DERIVED_QUERY_KEYS) {
        void queryClient.invalidateQueries({ queryKey: [key, user?.id] });
      }
      void queryClient.invalidateQueries({ queryKey: ["portfolio-meta-for-alerts"] });
    },
    [queryClient, refresh, setActiveId, user?.id],
  );
}
