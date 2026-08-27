# Trois propositions de landing

> Réponse au constat « la landing est trop morose, pas assez wow ». Trois
> directions complètes, ouvrables telles quelles dans un navigateur. Aucune
> n'est un thème posé sur l'existant : chacune change **ce qui se passe dans
> le premier écran**, parce que c'est là que se joue l'impression.

## Le diagnostic, en une ligne

La V actuelle est sombre de bout en bout, et son premier écran est un champ
de recherche vide posé dans une carte grise. Rien ne bouge, rien ne prouve
rien tant que l'utilisateur n'a pas tapé quelque chose. Léa et Inès décrochent
là — pas faute d'un dégradé, faute d'une raison de rester deux secondes de plus.

Ce que les trois propositions ont en commun : **le premier écran démontre au
lieu de promettre.** Elles gardent toutes les non-négociables du `CLAUDE.md` —
chaque chiffre sourcé et daté, aucune recommandation d'achat, mint = positif /
alert = négatif jamais inversés, jamais d'information portée par la couleur
seule, ton factuel sans alarmisme.

> **Décision — 27 août 2026.** La direction **3 · Le Flux** est retenue et
> intégrée à la landing (`src/components/landing/MoneyFlow.tsx`), en deuxième
> scène de la bande sombre, juste sous le rayon X. Les autres sections de la
> page n'ont pas bougé. Les trois maquettes restent ici comme trace de la
> décision — elles ne sont pas du code de production.

## Les trois directions

|                                       | Ce que ça change                                                                                                                                                                                                     | Pour qui, d'abord                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **1 · Le Rayon X** (`1-rayon-x.html`) | Fond clair. Le champ se remplit tout seul, un scan traverse la carte, le fonds s'ouvre : piliers, ce qu'il finance, ce qu'il ne s'interdit pas. Trois exemples cliquables.                                           | **Léa, Inès** — la preuve arrive avant l'effort.                     |
| **2 · Le Duel** (`2-le-duel.html`)    | La page est coupée en deux : à gauche ce que le fonds dit, à droite ce que la donnée montre. On tire le curseur pour arbitrer. Duel aussi typographique : Manrope pour la promesse, IBM Plex Mono pour les chiffres. | **Thomas, Karim** — le sceptique reçoit une preuve, pas un discours. |
| **3 · Le Flux** (`3-le-flux.html`)    | Un flux de particules part de ton épargne et se répartit dans ce qu'elle finance. On coche « climat », on décoche « fossiles » : le flux se redirige en direct.                                                      | **Léa** — l'abstrait devient concret sans une ligne de jargon.       |

## Ce qui règle le « morose »

- **1** sort de la bande sombre permanente : le noir devient un accent (CTA
  final, footer) au lieu d'être le décor.
- **2** garde le noir mais lui donne un adversaire : la coupure claire/sombre
  fait le contraste, et le geste rend l'utilisateur acteur.
- **3** garde le fond sombre et le rend lumineux : c'est le seul endroit de la
  page où la couleur est saturée — le reste retombe en sobre (DA V3, accent
  sous 5 % de la surface).

## Données affichées

Les fonds cités (_Horizon Climat Europe_, _Global Balanced Core_, _Tech Leaders
World_) et les répartitions du flux sont des **démonstrations, étiquetées comme
telles à l'écran**. Aucun fonds réel n'est nommé avec des chiffres inventés
(`CLAUDE.md` §1.2 et §1.3). Les libellés de source et de date reprennent la
forme réelle : `MSCI ESG · SFDR · Yahoo Finance — relevé du …`.

## Si une direction est retenue

Ces fichiers sont des maquettes autonomes, pas du code à copier tel quel :

1. Les couleurs sont les vraies valeurs de `src/styles.css`, mais **déclarées en
   dur dans chaque fichier** pour qu'il s'ouvre sans build. En intégration, on
   repasse par les tokens (`bg-paper`, `text-mint-ink`…).
2. Le texte est en dur : il devra passer par `update_locales.ts`.
3. Les maquettes assument **un seul thème** (celui de la direction). L'app,
   elle, a un thème sombre : à l'intégration, tout ce qui est encre lumineuse
   (`--glow-*` dans la proposition 3) reprend les tokens sombres existants.
4. Le canvas de la proposition 3 doit rester côté client (`useEffect`), avec
   son garde-fou `prefers-reduced-motion` — il est déjà écrit dans le fichier.
5. Vérifier les contrastes ajoutés dans `src/lib/a11y/__tests__/contrast.test.ts`
   avant merge, comme pour toute nouvelle paire texte/fond.

## Recommandation initiale

**La 1 comme base, la 2 comme section.** Le Rayon X est celle qui fait le moins
de promesses et la meilleure démonstration : elle montre le produit dans les
trois premières secondes, sur un fond clair qui règle le problème de morosité
sans rien coûter à la crédibilité. Le Duel est une direction plus risquée en
premier écran (il faut comprendre le geste), mais c'est la meilleure section
d'une page — elle peut remplacer le bloc Observatoire actuel. Le Flux est la
plus spectaculaire et la plus fragile : elle vend une mécanique de répartition
que l'app doit tenir ensuite, sinon la promesse se retourne contre nous.
