import { describe, it, expect } from "vitest";
import { socialMeta, siteUrl, OG_IMAGE, SITE_URL } from "../socialMeta";

type Tag = Record<string, string>;

const byKey = (tags: Tag[], key: "name" | "property", value: string) =>
  tags.find((t) => t[key] === value)?.content;

describe("socialMeta", () => {
  const tags = socialMeta({
    title: "Cours — Finance & Finance ESG pour débutants | Seedow",
    description: "Apprends la finance et l'investissement ESG sans jargon.",
    cardTitle: "Cours — Seedow",
    cardDescription: "12 cours en accès libre.",
    path: "/cours",
  }) as Tag[];

  it("émet le titre de page et le titre de carte séparément", () => {
    expect(tags.find((t) => "title" in t)?.title).toBe(
      "Cours — Finance & Finance ESG pour débutants | Seedow",
    );
    expect(byKey(tags, "property", "og:title")).toBe("Cours — Seedow");
  });

  // Le bug qu'on verrouille : une route qui redéfinissait `og:*` sans
  // `twitter:*` laissait X, Slack et Discord afficher le titre par défaut de
  // `__root`, donc l'aperçu d'une version précédente du site.
  it("tient og:* et twitter:* sur les mêmes valeurs", () => {
    expect(byKey(tags, "name", "twitter:title")).toBe(byKey(tags, "property", "og:title"));
    expect(byKey(tags, "name", "twitter:description")).toBe(
      byKey(tags, "property", "og:description"),
    );
    expect(byKey(tags, "name", "twitter:image")).toBe(byKey(tags, "property", "og:image"));
  });

  it("déclare toujours une image de carte large et versionnée", () => {
    expect(byKey(tags, "property", "og:image")).toBe(OG_IMAGE);
    expect(OG_IMAGE).toMatch(/\?v=\d+$/);
    expect(byKey(tags, "name", "twitter:card")).toBe("summary_large_image");
    expect(byKey(tags, "property", "og:image:alt")).toBeTruthy();
  });

  it("construit une og:url absolue à partir du chemin", () => {
    expect(byKey(tags, "property", "og:url")).toBe("https://seedow.life/cours");
  });

  it("n'émet pas d'og:url quand la route n'en déclare pas", () => {
    const tagsSansPath = socialMeta({ title: "Seedow", description: "…" }) as Tag[];
    expect(byKey(tagsSansPath, "property", "og:url")).toBeUndefined();
  });

  it("retombe sur le titre de page quand aucun titre de carte n'est donné", () => {
    const t = socialMeta({
      title: "Liste d'attente — Seedow",
      description: "Bêta complète.",
    }) as Tag[];
    expect(byKey(t, "property", "og:title")).toBe("Liste d'attente — Seedow");
    expect(byKey(t, "name", "twitter:title")).toBe("Liste d'attente — Seedow");
  });
});

describe("siteUrl", () => {
  it("rend la racine sans slash final", () => {
    expect(siteUrl("/")).toBe(SITE_URL);
  });

  it("normalise un chemin sans slash initial", () => {
    expect(siteUrl("fonds/FR0010315770")).toBe("https://seedow.life/fonds/FR0010315770");
  });
});
