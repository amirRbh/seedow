# Sortir du tout-vert : la palette à 5 accents, appliquée pour de vrai

Le problème n'est pas la palette — elle existe déjà — c'est que **seul le mint est utilisé**. Ice, volt, alert et solar sont définis dans le code mais quasi jamais employés : la landing entière (hero, visite guidée, cours, Ethi, CTA) tire sur le vert. Résultat : monotone, et aucun repère visuel pour distinguer une section « produit » d'une section « pédagogie ».

Le plan : caler les valeurs exactes de ta planche, puis **assigner un accent par section selon sa sémantique** — un seul accent à la fois par écran, en plus du mint de marque.

## 1. Aligner les valeurs sur ta planche

Les hex actuels ont dérivé de ta référence. On les remet exactement :

| Accent | Actuel | Cible |
| --- | --- | --- |
| Mint | `#1a7a42` | `#1D8348` |
| Ice | `#0066cc` | `#0071E3` |
| Volt | `#6e56cf` | `#6E56CF` (inchangé) |
| Alert | `#ca1a41` | `#E11D48` |
| Solar | `#895b17` | `#B7791F` |

Les neutres (paper / paper-2 / paper-3 / ink / ink-2) correspondent déjà à ta planche.

Une nuance de sécurité : sur fond blanc, mint, ice, volt et alert passent le contraste AA pour du texte (4.7 à 5.4:1). **Solar à 3.64:1 ne le passe pas** — il restera réservé aux aplats, filets, badges et pastilles, jamais à du texte courant. Une variante assombrie sera prévue pour les rares cas où il doit porter un mot.

## 2. Sémantique fixe des accents

Reprise mot pour mot de ta planche, transformée en règle d'usage :

- **Mint** — marque, impact positif, solution, traction
- **Ice** — produit, fonctionnalités, données neutres
- **Volt** — pédagogie, cours, méthode, modèle économique
- **Alert** — problème, greenwashing, mauvais score. Rare, donc fort
- **Solar** — nuance, transparence méthodologique, marché, équipe

## 3. Assignation section par section

**Landing**

| Section | Accent | Ce qui change |
| --- | --- | --- |
| Hero | Mint | inchangé (marque) |
| Visite guidée « comprendre / voir / comparer » | Ice | eyebrow, pastilles ON, KPI, barres → bleu produit |
| Test ESG sans compte | Ice | résultats et jauges en bleu ; **alert** uniquement quand le fonds est mal noté |
| Stats du problème (dette, greenwashing) | Alert | les grands chiffres négatifs passent en rouge, aujourd'hui verts à tort |
| Comment ça marche | Solar | numérotation et filets en or mat (transparence méthodo) |
| Cours / aperçu de cours | Volt | eyebrow, puces, liens de la modale |
| Ethi (bloc sombre) | Ice | accent bleu sur fond ink |
| CTA final | Mint | marque, retour au vert |

**App connectée**

- Portefeuille et données de marché → ice
- Score d'impact et gains positifs → mint
- Alertes greenwashing → alert
- Cours et méthodologie → volt
- Comparatif / marché / limites méthodo → solar

**Data & graphiques**

Les allocations et barres empilées sont aujourd'hui en camaïeu de vert. Elles passent à une série ordonnée mint → ice → volt → solar → ink-2, avec un ordre stable pour qu'une même classe d'actif garde sa couleur d'un écran à l'autre.

## 4. Garde-fous

- **Un seul accent par section**, en plus du mint de marque. Pas de section qui mélange bleu + violet + or.
- Les neutres portent toujours ~85 % de la surface. On ne colore pas les fonds de page : les accents restent sur les eyebrows, chiffres, filets, pastilles, barres et bordures actives.
- Alert reste rare. S'il apparaît partout, il ne veut plus rien dire.
- Aucune information ne repose sur la couleur seule : chaque état coloré garde son label ou son icône.

## Détails techniques

- Valeurs mises à jour dans `src/styles.css` (`--mint`, `--ice`, `--alert`, `--solar`) plus les variantes `*-tint` correspondantes, en clair et en sombre.
- Ajout de variantes texte-safe (`--solar-ink`) pour les cas où un accent doit porter du texte sous 4.5:1.
- Ajout d'utilitaires d'accent de section (`.accent-ice`, `.accent-volt`, `.accent-solar`, `.accent-alert`) qui redéfinissent une variable locale `--section-accent` ; les composants consomment `var(--section-accent)` au lieu de coder `var(--mint)` en dur.
- Fichiers touchés : `src/styles.css`, `src/routes/index.tsx`, `src/components/landing/LandingTour.tsx`, `EsgQuickCheck.tsx`, `LandingCourses.tsx`, `CoursePreviewDialog.tsx`, puis les vues connectées (dashboard, portefeuille, comparatif, cours) et la série de couleurs des graphiques.
- Vérification des contrastes AA sur chaque paire texte/fond introduite, en thème clair et sombre.
- Mise à jour de la mémoire projet pour que la sémantique des cinq accents fasse foi.
