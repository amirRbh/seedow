import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Source unique du comparatif (analyse UX §05/§06 — P1) : le comparatif vit
 * désormais, promu et non replié, dans l'onglet Impact du portefeuille. Cette
 * route est conservée uniquement pour ne casser aucun lien existant (rail,
 * palette de commandes, profil) et redirige vers cette source unique.
 */
export const Route = createFileRoute("/comparatif")({
  beforeLoad: () => {
    throw redirect({ to: "/portfolio", search: { tab: "impact" } });
  },
});
