import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * Le pont entre ce que tu détiens et ce que Seedow sait en prouver.
 *
 * L'Observatoire du greenwashing existe, il est sourcé, et chacune de ses
 * lignes ouvre une page `/fonds/$isin` qui répond exactement à la question
 * « est-ce vraiment aussi vert que ça en a l'air ? » : ce que le fonds
 * revendique, ce que les données montrent, pourquoi Seedow évalue ainsi, et
 * les limites.
 *
 * Cette page n'était atteignable que depuis l'index public de l'Observatoire.
 * Autrement dit : la preuve la plus différenciante du produit était rangée
 * dans une pièce à côté, et un utilisateur regardant SON fonds n'avait aucun
 * chemin vers elle. Ce lien ouvre ce chemin, à l'endroit où la question se
 * pose vraiment — devant sa propre ligne.
 *
 * Sans ISIN, pas de page : le lien ne s'affiche pas, plutôt que de mener à une
 * erreur. La base ne porte pas l'identifiant de tous les fonds.
 */
export function FundEvidenceLink({
  isin,
  className = "",
}: {
  isin: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!isin) return null;

  return (
    <Link
      to="/fonds/$isin"
      params={{ isin }}
      className={`inline-flex items-center gap-1.5 text-caption font-semibold text-ice-ink underline underline-offset-4 hover:no-underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink ${className}`}
    >
      {t("fund_evidence.link")}
      <span aria-hidden>→</span>
    </Link>
  );
}
