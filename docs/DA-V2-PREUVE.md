# Seedow — Direction artistique V2 « PREUVE »

> Audit de l'identité V1, cinq directions explorées, direction retenue, système complet.
> Ce document est la référence DA. Il prime sur l'improvisation, au même titre que `CLAUDE.md` §4 —
> qu'il remplace pour la partie visuelle (la sémantique couleur et les règles d'accessibilité restent).

---

## Partie 1 — Audit de l'identité V1

### 1.1 Ce qui a été trouvé dans le code

| Domaine        | État V1 (`src/styles.css`, composants)                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Couleurs       | `--paper #FFFFFF` / `#F5F5F7` / `#D2D2D7`, `--ink #1D1D1F`, `--ink-2 #86868B` → **palette système Apple, à l'hexadécimal près**. Le commentaire du fichier l'écrit lui-même : « palette Apple ». |
| Accents        | 5 accents de poids égal : `mint #146A4A`, `ice #0071E3` (bleu système Apple), `volt #6E56CF` (Radix violet-9), `alert #E11D48` (Tailwind rose-600), `solar #B7791F` (Chakra yellow-600). |
| Typographies   | `--font-display`, `--font-value`, `--font-sans` → **les trois pointent sur Inter**. IBM Plex Mono pour les labels. Inter + Plex Mono = le pairing SaaS le plus répandu de la décennie. |
| Rayons         | 14px (cartes), 16px (`.ink-section`), 22px (bulles), 32px (`.rv-card`), 40px (`.rv-hero`), 100px et 980px (pills). **Six rayons sans grammaire.** |
| Ombres         | `--shadow-flat-1/2/3` = `0 0 0 0 transparent` (désactivées « design flat éditorial »)… mais la landing réintroduit `0 22px 50px -30px rgba(0,0,0,.25)` et trois halos flous (`.apple-aura`, `.rv-hero-glow`). **Le système se contredit.** |
| Composants     | `.paper-card` = boîte grise + bordure + radius 14. Le motif « boîte grise arrondie » est le seul conteneur de toute l'app.                        |
| Landing        | Système parallèle complet : `.apple-landing`, `.apple-btn-primary` (`border-radius: 980px` = valeur exacte d'Apple), `.apple-title`, `.rv-card`… **Deux design systems dans un produit.** |
| Graphiques     | Recharts par défaut : `AreaChart` + `CartesianGrid` + `Tooltip`, `stroke: var(--highlight-1)` (= `#1D1D1F`). Aucune intervention graphique.        |
| Icônes         | SVG inline 24×24, `strokeWidth 1.8`, bouts arrondis = géométrie Feather/Lucide. Le langage d'icônes le plus générique disponible.                  |
| Animations     | framer-motion `opacity + translateY(12px)`, `delay: 0.1 / 0.25 / 0.45` sur chaque section. Plus trois pulsations concurrentes (`breathe`, `pulse-dot`, `halo-pulse`). |
| Fond           | Blanc pur, plus un grain SVG à `opacity: .06` (invisible en pratique).                                                                            |
| Navigation     | Rail 64px + bottom nav 4 entrées. Correct, mais visuellement neutre.                                                                              |

### 1.2 Pourquoi ça ne produit pas d'impact

**1. Chaque atome est emprunté.** Gris Apple + bleu Apple + pill Apple + Inter + icônes Feather + Recharts par défaut. La reconnaissance de marque exige **au moins un élément possédé**. Seedow n'en a aucun. Vu 2 secondes sans le nom, c'est « une feature ESG dans l'app Wallet ».

**2. Le vert est une décoration, pas un système.** `--mint` est la couleur de marque mais n'apparaît que sous forme d'un point de 6px, d'un soulignement et d'un fond de bouton. Il ne structure jamais la page. Résultat : ni « trop vert » (bonne nouvelle), ni identifiable (mauvaise).

**3. Cinq accents de poids égal = zéro accent.** La landing enchaîne ice → mint → solar → volt → ice carte par carte. Ça se lit comme une galerie de composants, pas comme une voix.

**4. On a retiré la profondeur sans rien mettre à la place.** Supprimer les ombres n'a pas produit de l'austérité, ça a produit de la fadeur : pas de filets, pas de grille visible, pas de contraste de graisse, pas de contraste d'échelle. Il ne reste que des rectangles gris clair.

**5. La donnée — la substance même de Seedow — est composée génériquement.** Le produit promet « chaque chiffre est sourcé et attribué à l'écran, pas relégué en petit caractère » (`CLAUDE.md` §1.2). Dans le code, la source est en **Plex Mono 11px gris dans un coin** (`.apple-stat-src`). **La promesse de marque est violée par la typographie.** C'est le gisement le plus important du produit et il est traité en note de bas de page.

**6. Deux systèmes visuels.** Le visiteur qui s'inscrit ne reconnaît pas la même marque après le mur d'auth. La justification en commentaire (isolation du risque) est valable en ingénierie, pas en branding.

**7. Aucun extrême.** Les titres plafonnent à 62px, le corps à 17px, les KPI à ~48px. Tout est « moyen ». Les identités mémorables ont toutes un extrême : la densité (Bloomberg), l'obscurité (Linear), l'échelle (Apple), la photo (Patagonia). Seedow n'en a nulle part.

**8. Vestiges d'une DA plus forte, sablée.** Le code garde `.outline-number` (« façon presse magazine »), `.gold-rule`, et un docstring de `KPIFigure` qui dit « Space Grotesk tabulaire » alors que le composant rend de l'Inter. L'identité n'a pas été *conçue* neutre : elle a été **érodée** vers le neutre.

### 1.3 Ce qui est bon et doit survivre

- La discipline des tokens (variantes `--*-ink` texte-safe, `src/lib/a11y/contrast.ts` + son test).
- `--font-scale` (accessibilité pilotée).
- Chiffres tabulaires (`font-feature-settings: "tnum"`).
- `prefers-reduced-motion` traité partout.
- La culture « données honnêtes » du produit (couverture, sources, droit de réponse). **C'est le matériau de la V2.**

---

## Partie 2 — Cinq directions artistiques

### Direction A — « L'INSTRUMENT »

1. **Concept** — Seedow comme instrument de mesure de précision. Densité de terminal financier, typographie de revue (Monocle, Le Monde diplomatique). Aucune illustration, jamais : la donnée *est* l'image. Grille visible, filets plutôt que cartes.
2. **Émotion** — Rigueur, autorité, « on ne me raconte pas d'histoires ».
3. **Palette** — Encre `#0B0B0C`, papier chaud `#F7F5F0`, un seul signal cyan-électrique. Aucune couleur décorative.
4. **Typo** — Grotesque à caractère (Bricolage, Archivo) pour les titres ; **mono pour tous les chiffres**, pas seulement les labels.
5. **Composants** — Rayon 0. Tableaux, réglures, en-têtes de colonne. Pas de carte.
6. **Graphiques** — Traits 1px, pas de remplissage, axes en filets, sparklines partout, tout est comparé à une référence.
7. **Animations** — Aucune, sauf le tracé (les courbes se dessinent) et le comptage des chiffres.
8. **Illustrations** — Interdites.
9. **Hero** — Un tableau plein écran : 12 fonds, leurs scores, leurs sources, mis à jour en direct. Le titre est petit ; la donnée est le hero.
10. **Dashboard** — Une feuille de calcul respectée : lignes, colonnes, totaux en bas, hairlines.
11. **Différenciation** — Personne dans la fintech grand public n'ose la densité. Revolut / Trade Republic / Robinhood = gros chiffres ronds et beaucoup d'air. C'est l'exact inverse.
12. **Risques** — Intimidant pour Léa (persona débutante). Tension frontale densité ↔ pédagogie. Peut virer « Bloomberg du pauvre ».
13. **Pourquoi ça marcherait** — Ça crédibilise instantanément le sérieux des données face à Thomas et Karim.

### Direction B — « PREUVE » (Radical Transparency)

1. **Concept** — L'interface est **construite en preuves**. Chaque chiffre porte sa provenance à l'écran comme élément typographique de premier plan : source, date, couverture, méthode. Vocabulaire visuel : le rapport d'audit, le document notarié, le procès-verbal. Ce qui est vérifié et ce qui est estimé **ne se ressemblent pas**.
2. **Émotion** — Honnêteté vérifiable. « Je peux tout contrôler moi-même. »
3. **Palette** — Papier archive chaud `#FAF8F3`, encre `#121210`, **bleu de signature** `#1B3BD8` réservé à ce qui est vérifié/actionnable, vert forêt profond `#0B5138` réservé à l'impact prouvé, vermillon `#B32718` pour le négatif réel, ocre `#8A6410` pour l'estimé. **La couleur est un statut de preuve, pas une décoration.**
4. **Typo** — Fraunces (serif variable) en titres éditoriaux, Inter pour la prose et l'UI, IBM Plex Mono pour **tout ce qui est mesurable** — y compris le solde du portefeuille.
5. **Composants** — Rayon 2px. Pas de cartes : des **feuillets** séparés par des filets. Un « rail de provenance » vertical de 1px longe chaque bloc de données, avec un ergot à chaque chiffre.
6. **Graphiques** — Traits 1px, remplissages en **hachures SVG** (jamais d'aplat ni de dégradé), bandes d'incertitude visibles, taux de couverture affiché avec le graphe.
7. **Animations** — Deux primitives seulement : le **tracé** (filets et courbes se dessinent de gauche à droite) et le **comptage**. Rien ne rebondit, rien ne grossit.
8. **Illustrations** — Aucune image. La seule « illustration » autorisée est un document : extrait, tableau, capture de source.
9. **Hero** — Une affirmation en Fraunces 96px, et immédiatement dessous sa preuve : le chiffre en mono, la source, la date, la couverture — même hiérarchie visuelle que l'affirmation.
10. **Dashboard** — Le solde en mono géant, et sous lui l'attestation : « valorisé sur 4 cours Yahoo Finance · 19 août, 14 h 02 · couverture 100 % ». Chaque tuile porte la sienne.
11. **Différenciation** — Revolut, Trade Republic, Robinhood **cachent** leur méthode ; Ecosia et les banques vertes affirment sans prouver. C'est la seule direction où l'esthétique *est* la promesse — donc la seule qu'un concurrent ne peut pas copier sans changer son modèle.
12. **Risques** — Peut devenir bureaucratique ; l'annotation permanente menace la densité ; difficile de créer de l'émotion. Il faut discipliner le nombre d'attestations par écran.
13. **Pourquoi ça marcherait** — Elle sert les 4 personas d'un coup (Karim/Thomas/Inès sur la transparence, Léa parce que chaque chiffre porte son explication) et elle applique une règle déjà **non négociable** dans `CLAUDE.md`.

### Direction C — « TERRAIN » (Digital Nature sans cliché)

1. **Concept** — La nature comme **matière et topographie**, jamais comme icône : courbes de niveau, strates sédimentaires, carottage, marégraphe, fausses couleurs satellite. L'allocation se lit comme une coupe géologique.
2. **Émotion** — Ancrage, durée, échelle géologique — le long terme rendu tangible.
3. **Palette** — Minérale : ocre, ardoise, oxyde, eau profonde. Aucun vert « éco ».
4. **Typo** — Grotesque large, tracking généreux sur les labels, chiffres condensés.
5. **Composants** — Bandes horizontales pleine largeur, pas de cartes ; séparations par changement de matière.
6. **Graphiques** — Courbes de niveau, strates empilées, jamais de camembert.
7. **Animations** — Sédimentation : les strates se déposent de bas en haut.
8. **Illustrations** — Cartographie générée depuis la donnée (contours d'un portefeuille), jamais de picto.
9. **Hero** — Une coupe topographique pleine largeur dont l'altitude est la performance du portefeuille.
10. **Dashboard** — Strates : chaque ligne de matière = une classe d'actif, épaisseur = poids.
11. **Différenciation** — Adjacence Patagonia sans les feuilles. Territoire totalement inoccupé en fintech.
12. **Risques** — Dérive décorative ; risque « musée des sciences » plutôt qu'outil financier ; lisibilité difficile sur mobile ; la métaphore s'épuise vite sur les écrans utilitaires (réglages, auth).
13. **Pourquoi ça marcherait** — Elle porte l'échelle de temps de l'investissement mieux qu'aucune autre.

### Direction D — « CHAMBRE NOIRE » (Future Finance sobre)

1. **Concept** — Sombre par défaut — pas un « dark mode », une **scène noire**. Contraste d'échelle typographique extrême, vide généreux, un seul accent lumineux. La donnée brille parce que tout le reste est éteint.
2. **Émotion** — Concentration, calme technologique, modernité.
3. **Palette** — `#08090A` base, `#101214` surfaces, un accent luminescent unique.
4. **Typo** — Grotesque serré, chiffres très grands, labels très petits.
5. **Composants** — Surfaces sans bordure, séparées par la seule luminosité ; rayon 8-12px.
6. **Graphiques** — Traits lumineux fins sur noir, halo léger admis.
7. **Animations** — Fondus lents, apparition par la lumière.
8. **Illustrations** — Formes géométriques abstraites, lumière volumétrique.
9. **Hero** — Un chiffre unique en 200px sur du noir.
10. **Dashboard** — Un objet posé dans le vide.
11. **Différenciation** — Aucune, en réalité : **c'est le territoire le plus occupé** (Linear, Arc, Robinhood dark, tout le crypto).
12. **Risques** — Rédhibitoires ici : en France, l'UI sombre est associée au trading et au crypto, pas à l'épargne prudente. Contredit frontalement « papier / transparence / posé ». Et c'est la direction la plus facile à confondre avec dix autres apps.
13. **Pourquoi ça pourrait marcher** — Sur la seule ambition/technologie. Insuffisant.

### Direction E — « CONSÉQUENCE » (Human Impact)

1. **Concept** — Fermer l'écart entre un euro abstrait et une conséquence réelle. Photographie documentaire pleine page (un fleuve, un réseau électrique, une usine), donnée composée **sur** l'image en typographie de magazine.
2. **Émotion** — Gravité, sens, « mon argent touche ce lieu ».
3. **Palette** — Dictée par la photo ; encre et blanc pour le texte.
4. **Typo** — Serif éditorial de grande taille, légendes en mono.
5. **Composants** — Blocs de légende, filets de crédit photo, rythme de magazine.
6. **Graphiques** — Incrustés sur l'image, en blanc 1px.
7. **Animations** — Parallaxe très lente, fondus au noir.
8. **Illustrations** — La photographie *est* le système.
9. **Hero** — Photo pleine page + une phrase + un chiffre.
10. **Dashboard** — Difficile : la photo ne survit pas à un écran utilitaire consulté 30 fois par mois.
11. **Différenciation** — Forte en communication, faible en produit.
12. **Risques** — Rédhibitoires ici : il faut une banque d'images réelles (budget, droits, direction photo permanente) ; la photo générique **est exactement l'accusation de greenwashing** que Thomas porte ; et ça vieillit en 18 mois. Sans budget photo, ça donne de la banque d'images — le pire résultat possible pour cette marque.
13. **Pourquoi ça pourrait marcher** — Sur l'émotion pure, si Seedow avait une rédaction et un budget photo.

---

## Partie 3 — Direction retenue : **B — « PREUVE »**

### Pourquoi celle-là

1. **C'est la seule direction où l'esthétique est le produit.** A, C, D et E sont des habillages : n'importe quel concurrent peut les acheter à une agence en six semaines. « Preuve » exige d'avoir réellement les sources, les dates et les taux de couverture. Trade Republic ne peut pas afficher la provenance de ses scores ESG — il ne l'a pas. **Le fossé est opérationnel, pas graphique.**

2. **Elle applique une règle déjà non négociable.** `CLAUDE.md` §1.2 : « Chaque chiffre est sourcé et attribué à l'écran, pas relégué en petit caractère. » La V1 écrit la règle et la viole avec du 11px gris. La V2 en fait le motif principal.

3. **Elle sert les quatre personas simultanément.** Karim (transparence radicale), Thomas (sources primaires visibles), Inès (rien de caché) l'exigent explicitement. Et pour Léa, contre-intuitivement, c'est **plus pédagogique** : un chiffre qui porte sa source, sa date et sa couverture est un chiffre qu'on apprend à lire.

4. **Elle évite toutes les listes d'interdits.** Zéro feuille, zéro planète, zéro ONG, zéro dégradé, zéro halo, zéro carte SaaS grise, zéro dark crypto, zéro photo de banque d'images. Le vert descend au rang de **couleur de donnée** (impact prouvé) au lieu d'être la couleur de marque — ce qui règle « trop de vert » sans perdre la sémantique.

5. **Elle est réalisable maintenant.** Pas de photo, pas d'illustration, pas de 3D, pas de fonte sur mesure. Trois familles Google Fonts, des filets, des hachures SVG. Bundle Edge préservé (contrainte Cloudflare Workers, `CLAUDE.md` §8).

6. **Elle a un extrême** — le seul qui manquait : **la provenance à la même échelle que la donnée**.

### Le test des 2 secondes

Trois signes suffisent à reconnaître Seedow sans lire le nom :

- **le papier chaud** (`#FAF8F3`), pas le blanc pur ni le gris Apple ;
- **le solde en monospace** — personne ne compose un solde de portefeuille en chasse fixe ;
- **le crochet de provenance** `├` sous chaque chiffre, avec source · date · couverture.

### Positionnement face à la concurrence

| Marque             | Son territoire                    | Où Seedow se place                                               |
| ------------------ | --------------------------------- | ---------------------------------------------------------------- |
| **Revolut**        | Néon, ludique, gamifié            | À l'opposé : sobre, adulte, documentaire                           |
| **Trade Republic** | Noir/blanc minimal, méthode opaque | Même sobriété, méthode **ouverte** — c'est là que se joue l'écart |
| **Robinhood**      | Vert néon, gamification, urgence   | Anti-urgence : aucune couleur d'excitation                        |
| **N26**            | Gradient corail, lifestyle         | Aucun dégradé, aucun lifestyle                                    |
| **Apple**          | Gris neutre, air, échelle          | On garde la discipline, on quitte la palette et la pill 980px     |
| **Linear**         | Sombre, dense, technique           | Même exigence, mais **clair et papier** — l'inverse chromatique   |
| **Stripe**         | Dégradés, illustrations iso        | Zéro dégradé, zéro illustration                                   |
| **Arc**            | Coloré, expressif                  | Retenue chromatique totale                                        |
| **Notion**         | Neutre, doux, générique            | Typographiquement opiniâtre                                       |
| **Patagonia**      | Photo, terrain, militant           | Même honnêteté, sans image ni militantisme                        |
| **Ecosia**         | Vert, ONG, feuille                 | Le vert n'est plus la marque, c'est un statut de donnée           |

---

## Partie 4 — Système « PREUVE » (spécification)

### 4.1 Couleurs

**Surfaces — papier d'archive, jamais du gris système.**

| Token         | Clair     | Sombre    | Usage                                   |
| ------------- | --------- | --------- | --------------------------------------- |
| `--paper`     | `#FAF8F3` | `#100F0D` | Fond principal                          |
| `--paper-2`   | `#F1EDE4` | `#191814` | Feuillet secondaire, encarts            |
| `--paper-3`   | `#D6D0BF` | `#33312B` | **Filets** (usage n°1), bordures        |
| `--ink`       | `#121210` | `#F4F1E9` | Texte principal, aplats de contraste    |
| `--ink-2`     | `#56564E` | `#A9A69C` | Texte secondaire (6,97:1)               |
| `--ink-3`     | `#707066` | `#8A877E` | Métadonnées (4,71:1 — passe AA)         |

**Signaux — la couleur est un statut de preuve.**

| Token     | Clair     | Statut encodé                                                    |
| --------- | --------- | ---------------------------------------------------------------- |
| `--ice`   | `#1B3BD8` | **Vérifié / actionnable.** Liens, sources cliquables, état actif. Bleu de signature. |
| `--mint`  | `#0B5138` | **Impact positif prouvé.** Vert forêt profond, jamais un vert vif. |
| `--alert` | `#B32718` | **Négatif réel.** Vermillon d'imprimerie. Rare, donc fort.        |
| `--solar` | `#8A6410` | **Estimé / modélisé.** Ocre. Marque tout ce qui n'est pas mesuré. |
| `--volt`  | `#5B3FA8` | Pédagogie (cours, méthode). Usage rare.                           |

Règle : **aucun élément ne prend une couleur pour être joli.** Si un chiffre est bleu, c'est qu'il est vérifié. Si un chiffre est ocre, c'est qu'il est estimé. Un utilisateur doit pouvoir apprendre ce code en une session.

Les variantes `--*-ink` (texte-safe, AA sur `--paper` et `--paper-2` et sur les tints) restent obligatoires pour tout accent portant du texte. Vérifiées par `src/lib/a11y/__tests__/contrast.test.ts`.

### 4.2 Typographies

| Rôle                        | Famille                     | Justification                                                    |
| --------------------------- | --------------------------- | ---------------------------------------------------------------- |
| **Éditorial** (titres, hero) | **Fraunces** 500–700, `opsz` haute, `SOFT 0`, `WONK 0` | Serif variable contemporain. Intelligence + chaleur, sans « vieille banque ». Absent de la fintech. |
| **Interface / prose**        | **Inter** 400–700           | Excellent en densité, déjà chargé, aucune raison de le remplacer pour l'UI. |
| **Mesure**                   | **IBM Plex Mono** 400/500/600 | **Tous les chiffres**, tous les labels de donnée, toutes les provenances, tous les tickers. Y compris le solde du portefeuille. |

Règle absolue : **si c'est mesurable, c'est en mono.** C'est le geste typographique signature.

Échelle (les tailles suivent `--font-scale`, accessibilité inchangée) :

| Utilitaire        | Taille                      | Famille  |
| ----------------- | --------------------------- | -------- |
| `.display-xl`     | `clamp(3rem, 8vw, 6.5rem)`  | Fraunces |
| `.display-lg`     | `clamp(2.25rem, 5vw, 3.75rem)` | Fraunces |
| `h1`              | `clamp(2rem, 4.5vw, 3rem)`  | Fraunces |
| `h2`              | `clamp(1.5rem, 3vw, 2rem)`  | Fraunces |
| `h3`              | `clamp(1.125rem, 2vw, 1.35rem)` | Inter 600 |
| `.text-figure-hero` | `clamp(2.75rem, 12vw, 4.5rem)` | **Plex Mono 500** |
| `.data-xl`        | `clamp(2rem, 5vw, 3.25rem)` | **Plex Mono 500** |
| `.stamp`          | 10-11px, `tracking .14em`, capitales | **Plex Mono 600** |

Plancher de lisibilité maintenu : jamais sous 13px pour une information financière porteuse dans l'app (`CLAUDE.md` §4).

### 4.3 Formes

- **`--radius: 2px`.** Un document n'a pas de coins à 32px. Le passage 14px → 2px est, à lui seul, ce qui fait quitter le registre « SaaS générique ».
- **Pas de cartes : des feuillets** (`.sheet`). Fond papier, **filet 1px en haut**, padding généreux, pas de bordure sur les quatre côtés, pas d'ombre.
- **Pills réservées aux tampons** (`.stamp`, radius 999px) : statut de donnée, badge « vérifié », « estimation ». Jamais un bouton.
- **Filets** (`.rule`) : 1px `--paper-3` = séparation ; 1px `--ink` = section ; 2px `--ink` = ouverture de chapitre.
- **Ombres : aucune** sur le contenu. Une seule ombre existe, pour les calques flottants (dialog, sheet, popover) : `0 24px 60px -30px rgb(18 18 16 / .45)`.

### 4.4 Le crochet de provenance (motif signature)

```
IMPACT CARBONE                    ← .stamp, mono 10px
−58 %                             ← Plex Mono 500, grand
├ Sustainalytics · 12 août 2026 · couverture 92 %
```

Réalisation : un bloc `.provenance` avec `border-left: 1px solid` et un `::before` qui trace l'ergot horizontal de 6px. Mono 11px, `--ink-3`. Cliquable si la source est en ligne (alors `--ice-ink`).

Trois modificateurs :

- `.provenance--verified` — ergot `--ice`, la source est une donnée tierce datée.
- `.provenance--modelled` — ergot `--solar`, filet **pointillé**, la valeur est une estimation Seedow. La règle §1.3 (« pas de sur-promesse ») devient visuelle.
- `.provenance--disputed` — ergot `--alert`, la source conteste le chiffre (droit de réponse, `CLAUDE.md` §1.2).

**Discipline** : une attestation par bloc de données, pas une par ligne. Sinon l'écran devient un formulaire.

### 4.5 Graphiques

- Traits **1px**, bouts droits (`stroke-linecap: butt`), pas de points sauf le dernier.
- **Aucun aplat, aucun dégradé** : les remplissages sont des **hachures SVG** (`<pattern>` de lignes à 45°, 1px, espacées de 5px). Lisible en daltonisme et en impression.
- Grille : pointillés 1px `--paper-3`, horizontaux uniquement.
- Axes : mono 10px `--ink-3`, jamais de titre d'axe.
- Référence : toute série est comparée à sa référence (ETF MSCI World) en trait pointillé encre.
- **Chaque graphique porte son crochet de provenance.** Un graphique sans source ne se merge pas.

### 4.6 Boutons

| Variante        | Rendu                                                             |
| --------------- | ------------------------------------------------------------------ |
| `default`       | Aplat `--ink`, texte `--paper`, radius 2px, hauteur 44px, Inter 500 |
| `accent`        | Aplat `--ice`, texte `--paper` — action vérifiée/principale          |
| `outline-ink`   | Filet 1px `--ink`, fond transparent, s'inverse au survol            |
| `ghost`         | Texte seul + soulignement d'1px au survol                           |
| `link`          | `--ice-ink`, souligné en permanence (aucun lien non souligné)       |

Plus jamais de `border-radius: 980px` sur un bouton.

### 4.7 Champs

`.field` : fond `--paper`, filet 1px `--paper-3`, radius 2px, **filet bas 2px `--ink` au focus** (registre formulaire administratif, pas ring bleu SaaS). Label en `.stamp` au-dessus, jamais en placeholder seul.

### 4.8 Navigation

- Rail desktop : 1px de filet, icônes techniques, l'actif est marqué par un **filet vertical 2px encre** à gauche, pas par un fond arrondi.
- Bottom nav mobile : filet haut, l'actif marqué par un **filet 2px encre au-dessus de l'onglet** (déjà le cas en V1, on l'épaissit) + label en `.stamp`.
- Header : marque « seedow » en Fraunces, suivie du point d'état (le seul vestige V1 conservé, il devient un **carré** de 5px, pas un rond).

### 4.9 Iconographie

Grille 16px, **trait 1,25px, bouts droits (`butt`), jonctions à angle vif (`miter`), géométrie 90°/45° uniquement**. Langage de dessin technique. Interdit : bouts arrondis, coins arrondis, trait 2px, remplissages.

### 4.10 Illustrations

Aucune image, aucune illustration, aucun pictogramme décoratif, aucune 3D, aucune photo. La seule « image » autorisée est **un document** : extrait de rapport, tableau, capture d'une source. Si un écran a besoin d'une illustration pour être intéressant, c'est que sa donnée est faible — on corrige la donnée.

### 4.11 Motion

Une seule courbe : `--ease-instr: cubic-bezier(0.2, 0, 0, 1)`. Deux primitives :

1. **Tracé** (`.trace`) — filets, courbes et barres se dessinent depuis leur origine (`scaleX`/`stroke-dashoffset`), 420 ms.
2. **Comptage** — les chiffres montent en chasse fixe tabulaire (composant existant `AnimatedFigure`).

Interdits : rebond, `scale` au survol, parallaxe, halo pulsé décoratif, apparition différée en cascade sur chaque section. Le survol modifie **l'épaisseur d'un filet ou l'apparition d'un ergot**, jamais une position.
Un seul pulse subsiste : le point d'état « données en cours de rafraîchissement » — opacité seulement, pas de `box-shadow` qui grossit.

`prefers-reduced-motion` neutralise tracé et comptage.

### 4.12 Mise en page

- **Colonne de mesure** : le contenu de lecture ne dépasse jamais 68 caractères.
- **Rythme par filets, pas par boîtes.** Une page = une pile de feuillets séparés par des filets.
- **Numérotation de section** en mono (`01`, `02`…) dans la marge gauche — déjà prévue par `AppHeader.sectionNumber`, désormais systématique sur les pages longues.
- **Un extrême par écran** : un seul chiffre a le droit d'être énorme. Tout le reste descend d'un cran.
- Densité : mobile aéré (une décision par écran), desktop dense (le tableau reprend ses droits).

---

## Partie 5 — Ce que la V2 supprime explicitement

| Supprimé                                        | Raison                                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Palette Apple `#F5F5F7` / `#D2D2D7` / `#86868B` | Empruntée, non reconnaissable                                   |
| `border-radius: 980px` et le radius 14px         | Pill Apple + carte SaaS générique                               |
| Le système `.apple-*` parallèle                  | Deux design systems = pas de marque (alias de compatibilité conservés le temps de la migration, cf. `styles.css`) |
| `.apple-aura`, `.rv-hero-glow`, `.apple-lift`    | Halos flous et lift au survol = « premium » artificiel          |
| Les cinq accents décoratifs de poids égal        | Remplacés par quatre statuts de preuve                          |
| Inter en typographie de titre                    | Aucune signature typographique                                  |
| Les chiffres en Inter                            | Remplacés par du mono — le geste signature                      |
| Les remplissages de graphiques en aplat          | Remplacés par des hachures                                      |
| Les icônes à bouts arrondis, trait 1,8           | Remplacées par du dessin technique 1,25 px                      |
| Les cascades `delay: 0.1 / 0.25 / 0.45`          | Remplacées par le tracé                                         |
| La source en 11px gris dans un coin              | Remplacée par le crochet de provenance                          |

---

_Rédigé lors de la refonte DA V2. Toute nouvelle interface se conforme à cette spec ; toute dérogation se justifie en revue._
