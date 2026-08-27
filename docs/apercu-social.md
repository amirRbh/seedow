# Aperçu du lien (Open Graph) — pourquoi il reste bloqué sur une vieille version

Coller `https://seedow.life/` dans WhatsApp, LinkedIn, X ou Slack affiche une
carte : titre, description, image. Cette carte peut rester en retard sur le site
déployé pour deux raisons distinctes — l'une est un bug de code, l'autre est du
cache côté plateforme. Les deux se traitent séparément.

## 1. Le code : une seule source pour les deux familles de balises

Les plateformes ne lisent pas les mêmes balises. Facebook, LinkedIn et WhatsApp
lisent `og:*`. X, Slack et Discord préfèrent `twitter:*` quand elle existe et ne
retombent sur `og:*` qu'à défaut.

Tant que chaque route redéfinissait `og:title` sans toucher `twitter:title`, les
secondes continuaient d'afficher le titre par défaut de `__root` — le slogan
d'une version précédente — alors que la page servie était à jour.

Toutes les routes passent donc par `socialMeta()`
(`src/lib/seo/socialMeta.ts`), qui émet les deux familles ensemble. Une nouvelle
route qui veut son propre aperçu appelle ce helper ; elle n'écrit pas de balise
`og:` ou `twitter:` à la main. `src/lib/seo/__tests__/socialMeta.test.ts`
verrouille la parité.

## 2. Le cache : changer l'image ne suffit pas

Les scrapers mettent l'aperçu en cache **par URL**, souvent sans expiration
utile :

| Plateforme         | Durée du cache             | Comment le forcer                                                             |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------- |
| Facebook, WhatsApp | jusqu'au re-scrape manuel  | [Sharing Debugger](https://developers.facebook.com/tools/debug/) → _Scrape Again_ (rafraîchit aussi WhatsApp) |
| LinkedIn           | ~7 jours                   | [Post Inspector](https://www.linkedin.com/post-inspector/)                     |
| X                  | plusieurs jours            | pas d'outil public depuis le retrait du Card Validator — partager le lien avec un paramètre (`?v=2`) régénère la carte |
| Slack, Discord     | ~30 min à quelques heures  | attendre, ou `?v=2`                                                            |
| iMessage           | cache local à l'appareil   | `?v=2`, ou vider le fil de discussion                                          |

Conséquence pratique : **réexporter `public/og-seedow.jpg` sans changer l'URL ne
change aucun aperçu déjà vu quelque part.** C'est le rôle de
`OG_IMAGE_VERSION` dans `socialMeta.ts` — l'image est servie sous
`/og-seedow.jpg?v=N`. À chaque nouvelle image :

1. remplacer `public/og-seedow.jpg` ;
2. incrémenter `OG_IMAGE_VERSION` ;
3. si les dimensions changent, mettre à jour `OG_IMAGE_WIDTH` / `OG_IMAGE_HEIGHT`
   — un `og:image:height` qui ment fait recadrer ou refuser l'image ;
4. après déploiement, passer le lien au Sharing Debugger et au Post Inspector.

## Vérifier ce qui est réellement servi

Le rendu est fait côté serveur (TanStack Start), donc les balises sont dans le
HTML d'origine — inutile d'ouvrir le DevTools :

```sh
curl -sS --compressed -A "facebookexternalhit/1.1" https://seedow.life/ \
  | grep -aoE '<meta [^>]*>|<title>[^<]*</title>' \
  | grep -aiE 'og:|twitter:|<title>'
```

Si cette sortie est correcte mais que l'aperçu ne l'est pas, le problème est
dans le cache de la plateforme (§2), pas dans le code.
