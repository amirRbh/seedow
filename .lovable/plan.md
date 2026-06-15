## Refonte du storytelling de la landing

Réécriture des sections narratives de la landing (`src/routes/index.tsx`) pour incarner la nouvelle question : **« Pourquoi se soucier de ce que finance son argent ? »**. Le ton reste éditorial Institutional White (eyebrow N° XX, gold-rule, paper-grain, display-lg, Space Grotesk). Aucun nouveau composant ni nouvelle page : on remplace uniquement les contenus i18n et on ajoute une section narrative à 4 chapitres entre le manifeste et la démo.

### 1. Hero — nouveau tagline

Remplacer `landing.subtitle` (actuellement « Épargner proprement. ») par :
- FR : **« Votre argent façonne déjà le monde. Seedow vous montre lequel. »**
- EN : **« Your money is already shaping the world. Seedow shows you which one. »**

Le H1 « seedow. » est conservé. La phrase devient le sous-titre principal du hero (déjà stylé `text-xl md:text-3xl font-display`).

### 2. Manifeste — phrase forte

Remplacer `landing.manifesto_text` (révélé mot-à-mot au scroll) par :
- FR : « Un portefeuille n'est pas une collection de lignes et de chiffres. C'est un vote. Chaque euro investi soutient une vision du monde. »
- EN : « A portfolio is not a collection of lines and numbers. It's a statement. Every euro invested supports a vision of the world. »

### 3. Nouvelle section narrative « N° 03 — Récit » (insérée avant `DemoAuditSection`)

Quatre chapitres en grille éditoriale (problème → déclic → solution → mission), reprenant fidèlement le texte fourni mais condensé pour le web (2-3 paragraphes courts par chapitre, pas le texte intégral). Structure :

```text
N° 03 ─── Récit
┌────────────────────────────────────────────┐
│  Le problème                               │
│  Pendant des années, nous avons appris     │
│  à faire attention à ce que nous           │
│  consommons. Mais une question reste       │
│  rarement posée : que finance réellement   │
│  mon argent quand j'investis ?             │
├────────────────────────────────────────────┤
│  Le déclic                                 │
│  Un portefeuille n'est pas une collection  │
│  de lignes. C'est un vote.                 │
├────────────────────────────────────────────┤
│  La solution                               │
│  Seedow rend visible ce qui était          │
│  invisible — l'histoire, l'impact, les     │
│  valeurs derrière chaque ligne.            │
├────────────────────────────────────────────┤
│  La mission                                │
│  Permettre à chacun de comprendre où va    │
│  son argent et quel monde il contribue à   │
│  construire.                               │
└────────────────────────────────────────────┘
```

Mise en forme :
- Eyebrow `N° 03 · Récit` (or, tracking 0.22em)
- Chapitres en `grid md:grid-cols-2 gap-12 md:gap-16` (2x2)
- Titre de chapitre `display-lg text-3xl` + filet `gold-rule` court
- Corps : `text-ink-2 leading-relaxed` (DM Sans body)
- `outline-number` (01 → 04) en arrière-plan pour rappeler le code visuel des piliers
- Animations : `motion.div` avec `whileInView` (fade + slide up, stagger 0.1s)

### 4. Renumérotation des sections suivantes

Insertion du `N° 03` décale les eyebrows existantes :
- Manifeste : reste `N° 02`
- **Récit : N° 03** (nouveau)
- Piliers : `N° 04` (déjà ce numéro — OK)
- Méthodo teaser : `N° 05` (déjà)
- FAQ : `N° 06` (déjà)
- CTA final : `N° 07` (déjà)

La démo (sans numéro actuellement) reste sans numéro. Aucun changement aux numéros existants — la nouvelle section s'insère pile dans le créneau libre `N° 03`.

### 5. Mise à jour des metas SEO

`head()` dans `src/routes/index.tsx` :
- `title` FR : « Seedow — Votre argent façonne déjà le monde »
- `description` FR : « Seedow analyse votre portefeuille et vous montre ce que votre argent finance réellement : entreprises, secteurs, valeurs. »
- équivalents EN dans les meta (gardés statiques en FR ici car le fichier route n'a pas d'i18n SSR ; on aligne sur la langue par défaut de la marque)

### 6. Fichiers modifiés

- `src/routes/index.tsx` — nouveau composant `StoryNarrative` (inline) inséré entre `ManifestoSection` et `DemoAuditSection`, mise à jour `head()`.
- `src/i18n/locales/fr.json` — remplace `landing.subtitle`, `landing.manifesto_text` ; ajoute le bloc `landing.story.*` (eyebrow + 4 chapitres titres/corps).
- `src/i18n/locales/en.json` — mêmes clés en anglais.

### Hors scope

- Pas de modification des piliers, FAQ, CTA final, méthodo teaser, démo audit (uniquement les sections explicitement narratives).
- Pas de nouvelle page `/mission`.
- Pas de modification du dashboard ou de la méthodologie.
- Pas de nouveau composant réutilisable (la section narrative reste locale à la landing).