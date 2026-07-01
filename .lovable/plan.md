
# Cours plus clairs : ELI5 + « Aller plus loin »

## Objectif
Rendre les 12 cours Seedow immédiatement compréhensibles par un débutant total, tout en gardant un bonus court pour ceux qui veulent creuser. Pas de refonte visuelle : uniquement du contenu + un petit ajout structurel.

## Principes d'écriture
Chaque cours sera réécrit selon 3 règles :

1. **Ouverture ELI5** — chaque cours commence par une analogie du quotidien (tirelire, gâteau à partager, école, potager, panier de courses…) avant tout vocabulaire financier.
2. **Un exemple chiffré ultra-simple par section** — toujours avec des petits nombres ronds (10 €, 100 €, 1 000 €) avant de montrer l'effet à grande échelle.
3. **Vocabulaire décodé à la volée** — chaque terme technique (ETF, TER, volatilité, SFDR…) est introduit avec sa « traduction en français normal » entre parenthèses la première fois.

Longueur inchangée ou légèrement réduite : on remplace de la densité par de la clarté, pas par du remplissage.

## Ajout structurel : bloc « Aller plus loin »
Un nouveau bloc court et optionnel à la fin de l'article, avant les « À retenir ». 3–5 puces max par cours, format dense, pour les lecteurs qui veulent la version avancée (formules exactes, nuances, contre-exemples, chiffres de marché). Volontairement bref pour ne pas alourdir.

## Détail technique

**1. Type `Course` (src/content/courses/types.ts)**
Ajouter deux champs optionnels :
```ts
eli5?: string;              // 1–2 phrases d'analogie simple, affichées sous l'intro
advanced?: string[];        // 3–5 puces "Aller plus loin"
```

**2. Composant `CourseArticle` (src/components/courses/CourseArticle.tsx)**
- Sous le `intro`, si `course.eli5` existe : afficher un petit bloc « En une image » (encart paper-2, typo Inter, italique doux) — visible aussi en mode tronqué (paywall).
- Avant le bloc « À retenir » (donc masqué en mode tronqué), si `course.advanced` existe : afficher une section « Aller plus loin » avec eyebrow mono + liste dense à puces, séparée par un `gold-rule`.

**3. Contenu des 12 cours (src/content/courses/01…12-*.ts)**
Pour chaque fichier :
- Réécrire `intro` en mode accessible (2–3 phrases, analogie du quotidien).
- Ajouter `eli5` (1–2 phrases, l'image la plus simple possible).
- Réécrire les `paragraphs` de chaque section : phrases plus courtes, un exemple chiffré simple d'abord, puis la généralisation.
- Simplifier les `callout` (ton conversationnel, pas de jargon).
- Ajouter `advanced` (3–5 puces techniques : formules, sources, nuances).
- **Ne pas toucher** : `slug`, `number`, `track`, `level`, `isFree`, `readingMinutes`, `title`, `eyebrow`, `description`, `keyTakeaways`, `quiz` (le quiz reste tel quel — c'est le test de compréhension).

Cours concernés (ordre d'index) :
```text
01 · cinq-mots              07 · esg-cest-quoi
02 · interets-composes      08 · greenwashing
03 · diversification        09 · labels-isr-sfdr
04 · actions-obligations-etf 10 · exclusions-sectorielles
05 · risque-volatilite      11 · mesurer-impact
06 · frais-caches           12 · portefeuille-aligne
```

## Hors périmètre
- Pas de changement du hero, de la home, du design system, des routes.
- Pas de refonte du quiz ni du paywall.
- Pas de traduction EN (les cours sont FR).

## Livraison
Un seul lot : type + composant + 12 fichiers de contenu, réécrits dans le même style éditorial (JetBrains Mono pour les chiffres, ton sobre financier moderne, zéro lexique jardin).
