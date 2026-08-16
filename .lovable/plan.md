# Le Fil — même DA, plus belle

Objectif : garder exactement la direction artistique actuelle (papier, encre, mint, Inter + mono, cartes 14px) et corriger ce qui fait « brouillon » : hiérarchie plate, cartes toutes identiques, densité irrégulière, timeline peu lisible.

## Ce qui change visuellement

1. **Un vrai bloc d'ouverture (Nœud 1)**
   - Le montant devient le seul élément vraiment grand de la page, sur fond `--ink` (bloc sombre éditorial) avec la variation en mono sur une ligne d'appui.
   - Les convictions passent en pastilles alignées sous un filet fin, plus aérées.

2. **Rythme des cartes**
   - Padding harmonisé (20px), espacement vertical régulier entre nœuds.
   - Suppression de `shadow-sm` (la DA est plate) au profit d'une bordure `--paper-3` nette + fond `--paper-2` pour les cartes secondaires.
   - Les intitulés de section (mono, uppercase) reçoivent tous le même traitement : 11px, tracking 0.14em, couleur `ink-3`, suivis d'un filet léger.

3. **Timeline plus lisible**
   - Fil vertical continu plus discret (1px `paper-3`) avec pastille pleine mint sur les nœuds actifs et pastille creuse sur le nœud replié.
   - Alignement exact des pastilles avec la première ligne de texte de chaque carte.

4. **Nœud investissements**
   - Lignes en grille (nom + catégorie / montant aligné à droite en tabular-nums), séparateurs plus fins, zone cliquable pleine largeur.
   - Le bouton « pourquoi » devient un lien mono discret en fin de ligne, visible au survol/focus.

5. **Nœud impact**
   - L'anneau de score gagne en taille et en contraste, chiffre au centre en mono.
   - Les équivalences passent en petites lignes clé/valeur alignées, avec source en pied de bloc.

6. **Actions Ethi**
   - Rangée de pills homogènes en bas de fil, l'action principale en mint plein, les autres en outline `paper-3`, hauteur unique.

## Technique

- Modifications uniquement dans `src/routes/le-fil.tsx` (composants locaux `Node`, `ImpactRing`, `CompareRow`).
- Aucun token ni couleur en dur : uniquement les classes issues de `src/styles.css` (`paper`, `paper-2`, `paper-3`, `ink`, `ink-2`, `ink-3`, `mint`, `mint-ink`).
- Aucun changement de logique métier, de données, de i18n ni de routes.
- Animations conservées (`framer-motion` reveal), simplement échelonnées de façon régulière.
