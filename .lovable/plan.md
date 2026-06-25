## Section "Cours" — Finance & Finance ESG pour débutants

Nouvel onglet public **Cours** accessible avant inscription : 3 cours gratuits intégralement lisibles + 9 cours verrouillés (aperçu flouté + CTA "Créer un compte gratuit"). Chaque cours = article éditorial long-form + quiz QCM final.

### Architecture des routes

```
src/routes/
  cours.tsx              → /cours        (catalogue + 12 cards)
  cours.$slug.tsx        → /cours/:slug  (lecture article + quiz)
```

- Public (hors `_authenticated`), SSR-friendly, `head()` SEO par cours (title, description, og).
- Lien "Cours" ajouté dans le header de la landing (`StickyHeader` dans `src/routes/index.tsx`) entre "Méthodologie" et le CTA, et dans le footer.
- Une fois connecté, lien "Cours" aussi accessible depuis `AppShell` (rail nav) pour les testeurs.

### Contenu — 12 cours (style Institutional White, lexique financier sobre)

**Piste Finance (6)**
1. ⭐ *Gratuit* — Les 5 mots à connaître avant d'investir (rendement, risque, volatilité, horizon, liquidité)
2. ⭐ *Gratuit* — Intérêts composés : la mécanique du temps long
3. Diversification : pourquoi ne pas mettre tous ses œufs dans le même panier
4. Actions, obligations, ETF : comprendre les briques de base
5. Risque & volatilité : lire un drawdown sans paniquer
6. Frais cachés : ce qui ronge un portefeuille sur 20 ans

**Piste Finance ESG (6)**
7. ⭐ *Gratuit* — Qu'est-ce que l'ESG ? (E, S, G expliqués simplement)
8. Greenwashing : 6 signaux d'alerte sur un fonds "vert"
9. Labels ISR, Greenfin, Article 8/9 SFDR : démêler le vrai du marketing
10. Exclusions sectorielles : armes, tabac, énergies fossiles
11. Mesurer l'impact : intensité carbone, score ESG, controverses
12. Construire un portefeuille aligné avec ses valeurs

### Format d'un cours (long-form + quiz)

Structure type dans un fichier de contenu `src/content/courses/{slug}.ts` :
```ts
export const course = {
  slug, title, eyebrow, readingMinutes, level, track: 'finance' | 'esg', isFree,
  description, // SEO + card
  sections: [{ heading, paragraphs: string[], callout? }],
  keyTakeaways: string[],   // 3-5 puces
  quiz: [{ question, options: string[], correctIndex, explanation }],
}
```
- Article rendu avec `EditorialSection` + `KPIFigure` + `.gold-rule` + eyebrow numérotation N° XX.
- Quiz final 4-5 questions, score affiché, possibilité de rejouer. Score sauvegardé en `localStorage` (pas de table DB pour cette V1).
- En bas : "Cours suivant" + CTA inscription si non connecté.

### Gating (3 gratuits → reste verrouillé)

- `/cours` : grille de 12 cards. Cards gratuites cliquables → article complet. Cards gated affichent badge "Compte gratuit requis", titre + description visibles, contenu de preview flouté (`backdrop-blur` + masque), bouton "Créer un compte gratuit (sans engagement)".
- `/cours/:slug` d'un cours gated : 
  - Visiteur non connecté → on rend les 2 premières sections, puis bloc paywall flouté avec CTA `→ /auth?mode=signup&redirect=/cours/{slug}`.
  - Connecté → article complet.
- Détection auth côté client via `useAuth()` (pas de gating SSR — le contenu reste indexable, le gate s'applique après hydratation pour ne pas casser SEO).

### Composants nouveaux

- `src/components/courses/CourseCard.tsx` — card catalogue (track, niveau, durée, badge gratuit/verrouillé)
- `src/components/courses/CourseArticle.tsx` — rendu sections + takeaways
- `src/components/courses/CourseQuiz.tsx` — quiz interactif + score
- `src/components/courses/CoursePaywall.tsx` — overlay flouté + CTA signup
- `src/content/courses/index.ts` — registre + 12 fichiers de contenu rédigés

### i18n

Ajouts dans `src/i18n/locales/{fr,en}.json` sous `courses.*` : titre page, sous-titre, filtres piste (Finance / ESG), labels card (gratuit, verrouillé, niveau, min de lecture), labels quiz (valider, score, recommencer, cours suivant), paywall (titre, sous-titre, CTA). Le contenu des cours lui-même reste en français V1 (la base est francophone) — fallback EN sur les titres et description SEO uniquement.

### SEO

- `/cours` : H1 "Apprendre la finance et l'ESG, sans jargon", meta description ciblée débutants.
- `/cours/:slug` : title et description issus du contenu, og:title, og:description, et structured data `Article` JSON-LD.

### Hors scope (V1)

- Pas de suivi de progression côté DB.
- Pas de certificats.
- Pas de génération AI : tout le contenu est rédigé en dur (brouillon livré dans cette implémentation, à corriger ensuite).
- Pas d'images générées par cours (KPIFigure + typographie suffisent pour le style éditorial).

### Fichiers touchés (résumé)

- **Nouveaux** : `src/routes/cours.tsx`, `src/routes/cours.$slug.tsx`, `src/components/courses/*` (4 fichiers), `src/content/courses/*` (13 fichiers : index + 12 cours).
- **Modifiés** : `src/routes/index.tsx` (lien header + footer), `src/components/layout/AppShell.tsx` (entrée nav), `src/i18n/locales/{fr,en}.json` (clés `courses.*`).
