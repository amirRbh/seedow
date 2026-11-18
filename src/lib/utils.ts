import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge ne connaît pas l'échelle typographique maison (`text-tag`,
 * `text-label`… définies par `@utility` dans styles.css). Sans cette
 * déclaration, il les range avec les COULEURS `text-*` et n'en garde qu'une :
 * `cn("text-tag", "text-mint-ink")` perdait la taille, `cn("text-ink",
 * "text-body-lg")` perdait la couleur — c'est ce qui vidait jadis un CTA de son
 * texte, et ce qui faisait déborder les libellés du dock.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "tag",
            "caption",
            "label",
            "body-sm",
            "body",
            "body-lg",
            "body-xl",
            "h1-page",
            "figure-hero",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
