import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * « Pourquoi ? » — la question qu'un débutant doit toujours pouvoir poser.
 *
 * Une donnée qui décide sans se justifier laisse l'utilisateur devant un chiffre
 * qu'il subit. Ce déclencheur ouvre une explication courte, au même endroit, sans
 * quitter l'écran ni ouvrir de modale.
 *
 * Ce composant existe parce qu'il n'y en avait pas — et il n'en faut qu'UN.
 * Seedow porte déjà deux mécanismes voisins qu'il ne remplace pas :
 *
 *  · `GlossaryTerm` définit un MOT (« c'est quoi, un TER ? ») ;
 *  · `Provenance` signe un CHIFFRE (source, date, couverture) ;
 *  · `WhyThis` justifie une DÉCISION d'affichage (« pourquoi ce fonds
 *    m'est-il montré ? », « pourquoi ce niveau de risque ? »).
 *
 * Les trois répondent à trois questions différentes : les fusionner rendrait
 * chacune plus floue. En revanche, aucun quatrième composant d'explication ne
 * doit apparaître — c'est celui-ci qu'il faut étendre.
 *
 * Le contenu est passé en `children` : ce composant ne formule rien lui-même et
 * ne peut donc affirmer quoi que ce soit que l'appelant n'ait pas mesuré.
 *
 * Deux tailles, un seul mécanisme (`variant`) :
 *
 *  · `inline` — la note discrète sous un chiffre, telle qu'elle existait ;
 *  · `section` — le palier de lecture d'un écran (« Pourquoi ce score ? »,
 *    « D'où viennent ces chiffres ? »). Même composant, parce qu'un deuxième
 *    mécanisme de dépliage aurait fini par diverger de celui-ci ; taille
 *    différente, parce qu'un palier de lecture qui ressemble à une note de bas
 *    de page n'est ouvert par personne, et que c'est précisément ce qui fait
 *    tenir la règle « simple par défaut, profond à la demande ».
 */

interface Props {
  /** Le contenu de l'explication. Court : deux phrases, pas un chapitre. */
  children: React.ReactNode;
  /** Libellé du déclencheur. Par défaut « Pourquoi ? ». */
  label?: string;
  /** Étiquette accessible quand plusieurs « Pourquoi ? » cohabitent sur un écran. */
  ariaLabel?: string;
  /** `inline` (défaut) : note discrète. `section` : palier de lecture d'un écran. */
  variant?: "inline" | "section";
  className?: string;
}

export function WhyThis({ children, label, ariaLabel, variant = "inline", className = "" }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isSection = variant === "section";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        className={
          isSection
            ? // Cible tactile pleine largeur : sur un téléphone, un palier de
              // lecture ne doit pas se viser au pixel près (min 44px de haut).
              "flex w-full items-center justify-between gap-3 min-h-[44px] py-2.5 text-left text-body font-semibold text-ink hover:text-ink-2 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            : "inline-flex items-center gap-1 -my-1.5 py-1.5 text-caption text-ink-3 hover:text-ink-2 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        }
      >
        <span className={isSection ? "" : "underline decoration-dotted underline-offset-2"}>
          {label ?? t("why_this.trigger")}
        </span>
        {/* Le chevron double le mot ; il ne le remplace jamais. */}
        <span
          aria-hidden
          className={`transition-transform ${open ? "rotate-90" : ""} ${isSection ? "text-ink-3 text-xl leading-none" : ""}`}
        >
          ›
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className={
            isSection
              ? "pb-1 text-body-sm text-ink-2 leading-relaxed"
              : "mt-1.5 text-caption text-ink-2 leading-relaxed border-l-2 border-paper-3 pl-3"
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
