/**
 * Métadonnées d'aperçu social — une seule source pour Open Graph ET Twitter Card.
 *
 * Les plateformes ne lisent pas la même famille de balises : Facebook,
 * LinkedIn et WhatsApp lisent `og:*`, X/Slack/Discord préfèrent `twitter:*`
 * quand elle existe et ne retombent sur `og:*` qu'à défaut. Tant que chaque
 * route réécrivait `og:title` sans toucher `twitter:title`, une partie des
 * aperçus affichait encore le titre par défaut de `__root` — le slogan d'une
 * version précédente du site — alors que la page servie était à jour. Passer
 * par ce helper rend l'oubli impossible : les deux familles sont émises
 * ensemble ou pas du tout.
 *
 * TanStack Router déduplique les balises par `name`/`property` en faveur de la
 * route la plus profonde : ce que `__root` pose sert de valeur par défaut, ce
 * qu'une route pose gagne.
 */

export const SITE_URL = "https://seedow.life";
export const SITE_NAME = "Seedow";

/**
 * Version de la carte d'aperçu. Les scrapers mettent l'image en cache **par
 * URL**, souvent sans expiration (WhatsApp et iMessage la gardent presque
 * indéfiniment) : réexporter `public/og-seedow.jpg` sans changer l'URL ne
 * rafraîchit aucun aperçu déjà vu quelque part. Incrémenter cette version à
 * chaque nouvelle image — c'est ce qui fait repartir les caches.
 */
export const OG_IMAGE_VERSION = "2";

export const OG_IMAGE = `${SITE_URL}/og-seedow.jpg?v=${OG_IMAGE_VERSION}`;

/**
 * Dimensions réelles du fichier servi (`public/og-seedow.jpg`), pas les
 * dimensions théoriques : un `og:image:height` qui ment fait recadrer ou
 * refuser l'image par certains scrapers. À corriger si l'image est réexportée.
 */
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "640";

export const OG_IMAGE_ALT = "Seedow — Votre argent façonne déjà le monde";

/** Une balise `<meta>` telle que l'attend le `head()` de TanStack Start. */
export type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export type SocialMetaOptions = {
  /** Titre de la page : `<title>`, `og:title` et `twitter:title`. */
  title: string;
  /** Description : `<meta name="description">`, `og:description`, `twitter:description`. */
  description: string;
  /**
   * Version courte du titre pour la carte sociale, quand le `<title>` porte un
   * suffixe utile au référencement mais bruyant dans un aperçu.
   */
  cardTitle?: string;
  /** Idem pour la description : les aperçus tronquent vers 150-200 caractères. */
  cardDescription?: string;
  /** Chemin de la page (`/cours`) → `og:url`. Absent = pas d'URL déclarée. */
  path?: string;
  type?: "website" | "article";
  image?: string;
  imageAlt?: string;
};

/** URL absolue d'un chemin du site — pour `og:url` et les liens canoniques. */
export function siteUrl(path = "/"): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function socialMeta({
  title,
  description,
  cardTitle,
  cardDescription,
  path,
  type = "website",
  image = OG_IMAGE,
  imageAlt = OG_IMAGE_ALT,
}: SocialMetaOptions): MetaTag[] {
  const socialTitle = cardTitle ?? title;
  const socialDescription = cardDescription ?? description;

  return [
    { title },
    { name: "description", content: description },

    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "fr_FR" },
    { property: "og:type", content: type },
    { property: "og:title", content: socialTitle },
    { property: "og:description", content: socialDescription },
    ...(path ? [{ property: "og:url", content: siteUrl(path) } as MetaTag] : []),
    { property: "og:image", content: image },
    { property: "og:image:width", content: OG_IMAGE_WIDTH },
    { property: "og:image:height", content: OG_IMAGE_HEIGHT },
    { property: "og:image:alt", content: imageAlt },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: socialTitle },
    { name: "twitter:description", content: socialDescription },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}
