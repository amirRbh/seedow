## Étoffer les 12 cours pour qu'ils soient vraiment complets

### Constat

Les fichiers actuels de `src/content/courses/*.ts` contiennent un brouillon léger : 4-5 sections de 2 paragraphes chacune, soit ~6 min de lecture annoncées mais ressenties comme "vides". Sur les cours **gated** (non gratuits) consultés sans compte, la route ne montre que les **2 premières sections** avant le paywall — l'effet "y'a pas de contenu" est donc encore plus fort.

### Objectif

Rendre chaque cours réellement complet : un article long-form sérieux (≈ 10-14 min de lecture), avec assez de substance pour que les 2 premières sections (visibles avant paywall sur les cours gated) tiennent déjà debout toutes seules.

### Ce que je vais changer

**1. Réécrire les 12 fichiers `src/content/courses/*.ts`**

Pour chaque cours, passer de 4-5 sections courtes à **7-9 sections riches** avec :
- 3 à 5 paragraphes par section (au lieu de 2), exemples chiffrés concrets (€, %, années)
- Un `callout` éditorial dans la majorité des sections (≥ 4 par cours)
- Une section "Cas pratique" avec un mini-scénario chiffré
- Une section "Erreurs fréquentes" (3-5 pièges typiques)
- `keyTakeaways` étendus à 6-8 puces
- `quiz` étendu à **6 questions** (au lieu de 4) avec explications plus détaillées
- `readingMinutes` mis à jour honnêtement (10-14 selon le cours)

**2. Ajuster la troncature pour les cours gated**

Dans `src/routes/cours.$slug.tsx`, passer de `sections.slice(0, 2)` à `sections.slice(0, 3)` : avec 8 sections par cours, montrer les 3 premières donne un aperçu substantiel (≈ 30 % du contenu) avant le paywall, tout en gardant l'incitation à créer un compte.

**3. Aucun changement** sur l'architecture, les composants (`CourseArticle`, `CourseQuiz`, `CoursePaywall`), le routing, l'i18n, le SEO ou le gating. Uniquement du contenu + un slice à ajuster.

### Volume

12 cours × ~2 500 mots = ~30 000 mots de rédaction française, livrés en un seul passage. Style conservé : éditorial sobre, lexique financier moderne, pas de jargon gratuit, aligné sur la mémoire "Institutional White".

### Fichiers touchés

- Réécrits : `src/content/courses/01-cinq-mots.ts` → `12-portefeuille-aligne.ts` (12 fichiers)
- Édité : `src/routes/cours.$slug.tsx` (slice 2 → 3)

### Hors scope

- Pas d'images générées par cours.
- Pas de DB de progression / certificats.
- Pas de traduction EN du corps des cours (titres/descriptions SEO restent comme aujourd'hui).
