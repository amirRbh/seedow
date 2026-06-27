Objectif : rendre les 3 premiers cours lisibles sans compte et corriger le header qui se répète sur les pages cours.

Plan d’implémentation :
1. Corriger le chrome global sur les routes publiques de cours
   - Ajouter `/cours` aux pages “full bleed” dans `AppShell` pour éviter que le rail/topbar global se superpose au header propre des cours.
   - Résultat attendu : un seul header visible sur `/cours` et `/cours/:slug`.

2. Garantir l’accès public aux 3 cours gratuits
   - Conserver `isFree: true` pour les 3 cours gratuits actuels :
     - N°01 Les 5 mots à connaître avant d’investir
     - N°02 Intérêts composés
     - N°07 Qu’est-ce que l’ESG ?
   - Ajuster la logique de gating dans `cours.$slug.tsx` pour que les cours gratuits affichent toujours tout le contenu + quiz, même si l’auth est encore en chargement ou si l’utilisateur n’a pas de compte.

3. Rendre l’accès plus clair dans la liste
   - Afficher explicitement “Gratuit · lire maintenant” sur les 3 cours gratuits.
   - Garder les autres cours visibles mais marqués “Compte gratuit requis”.

4. Vérifier le bug d’import dynamique
   - Après implémentation, vérifier que `/cours`, puis un cours gratuit, chargent sans erreur et sans page blanche.
   - Si l’erreur venait du build précédent, la correction et le rechargement doivent la faire disparaître ; sinon je corrigerai la cause bloquante détectée.

Fichiers concernés :
- `src/components/layout/AppShell.tsx`
- `src/routes/cours.$slug.tsx`
- `src/components/courses/CourseCard.tsx`