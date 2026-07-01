# Transparence ESG sur /methodologie

Objectif : rendre le process de notation ESG entièrement lisible et honnête sur la page méthodologie, sans toucher au moteur ni aux cours.

## Ce qu'on ajoute

Une nouvelle section éditoriale **"Notation ESG"**, insérée entre le pipeline (5 étapes) et le simulateur, structurée en 4 blocs :

### 1. D'où viennent les scores (sources)
- Liste des fournisseurs utilisés par asset (`esg_score_source` déjà présent dans le schéma : MSCI, Sustainalytics, Yahoo, manual…).
- Mention explicite : "score agrégé 0–100, normalisé par nos soins pour être comparable entre fournisseurs".
- Date de fraîcheur (dernière update quotes / ESG si dispo).

### 2. La grille — 3 piliers pondérés
Tableau visuel des 3 piliers (E / S / G) avec :
- pondération par défaut (**40 / 40 / 20**, cf. `DEFAULT_PILLAR_WEIGHTS`)
- effet des causes actives (climat/biodiv → +E ; humain/égalité → +S ; tech/circulaire → léger +G), avec la formule `STEP = 0.1` puis renormalisation.
- fallback : si un pilier manque sur un asset → on utilise le score agrégé pour ce pilier seulement (dégradation douce).

Rendu : petit tableau paper-card + une note "les poids se réajustent selon vos convictions".

### 3. Comment on construit le portefeuille (côté ESG)
- **Exclusions dures** (fossiles/armes/tabac/jeux/animaux/fast-fashion) : filtre binaire avant optimisation.
- **Best-in-class** : on garde les meilleurs quintiles par classe d'actifs sur le score composite.
- **Plancher ESG** portefeuille : `MIN_PORTFOLIO_ESG = 70` (cf. `types.ts`). Si l'optimiseur ne peut pas l'atteindre → banner "plancher relâché" (déjà géré).
- **Tilts** : les intensités de causes (0–100 %) réajustent la pondération des piliers et biaisent la sélection thématique.

### 4. Limites & honnêteté (bloc encadré)
- Divergence connue entre agences (corrélation ~0,5 vs 0,99 pour la notation crédit — MIT 2022).
- Scope 3 souvent absent → intensité carbone couverte à X % du portefeuille (déjà affiché par `CarbonCoverage`, on rappelle ici l'idée).
- ESG mesure des pratiques, pas l'impact ni l'éthique personnelle.
- Lien vers les cours 07 (ESG c'est quoi), 08 (Greenwashing), 09 (Labels ISR/SFDR).

## Structure technique

- **1 seul fichier édité** : `src/routes/methodologie.tsx` — nouvelle `<section>` insérée avant le simulateur, réutilisant les patterns existants (`border border-paper-3`, `paper-2/40`, eyebrow uppercase, `MetricLabel`).
- **i18n** : ajout des clés sous `methodologie.esg_grid.*` dans `src/i18n/locales/fr.json` et `en.json` (titres, descriptions, labels tableau, note limites).
- **Zéro nouveau composant** : tout inline dans la page pour rester léger. Pas de nouveau server function, pas de requête DB (les valeurs `DEFAULT_PILLAR_WEIGHTS`, `MIN_PORTFOLIO_ESG`, `STEP` sont importées depuis `@/lib/portfolio/types`).
- **Design tokens** : respect strict des règles mémoire — paper/ink/mint uniquement, JetBrains Mono pour les nombres (poids piliers, seuil 70), pas d'ombres, `gold-rule` comme séparateur, badges pill mono uppercase.

## Hors scope

- Pas de changement du moteur d'optimisation ni du calcul des scores.
- Pas de modification des cours ESG existants.
- Pas de nouvelle page dédiée : tout tient dans /methodologie pour garder la transparence à un clic du dashboard.
- Pas de refonte du hero ni du reste de la page.
