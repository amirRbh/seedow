# Réduire le risque de qualification CIF sur l'onglet « Affiner »

## Le point réglementaire, en clair

Le statut de CIF (conseiller en investissements financiers) se déclenche quand on fournit une **recommandation personnalisée** portant sur des **instruments financiers déterminés**, présentée comme **adaptée à la situation** de la personne.

Ce que fait Seedow aujourd'hui, tel qu'observé dans le code de l'onglet Affiner :

- Le portefeuille est **virtuel** et aucune transaction n'est exécutée (rappelé dans les CGU, §3 « Fonctionnement du service »). C'est un point fort.
- Mais `AllocationRefiner` produit, à partir des préférences déclarées de l'utilisateur, des **arbitrages nommés** (« vs {altLabel} », top positions avant/après) avec un coût chiffré, et propose deux actions : **« Garder » / « Lever »**, dont le libellé de confirmation est « Marqué à lever. On t'aidera à recalculer. »

C'est cette combinaison — actif identifié + adapté à tes préférences + verbe d'action + accompagnement promis — qui rapproche le plus l'écran d'une recommandation personnalisée. Le reste de l'éditeur (renforcer/réduire une ligne que l'utilisateur détient déjà, à son initiative) relève de l'outil de simulation, pas du conseil.

À noter : ceci est une analyse de conception produit, pas un avis juridique. Une relecture par un avocat en droit financier reste recommandée avant l'ouverture large.

## Ce qu'on change

### 1. Reformuler les actions d'arbitrage en langage neutre

- « Lever » → « Simuler sans cette contrainte » ; « Garder » → « Conserver cette contrainte ».
- Supprimer « On t'aidera à recalculer » (promesse d'accompagnement personnalisé) → « Contrainte levée dans la simulation. »
- Retirer tout comparatif formulé comme un gain à saisir : les écarts restent affichés comme **conséquences chiffrées d'un choix de l'utilisateur**, jamais comme une meilleure option.
- Le sous-titre actuel « Garde-la si elle compte plus que le rendement qu'elle te coûte, lève-la sinon » est une instruction de décision : le remplacer par une formulation descriptive (« Voici ce que chaque contrainte coûte ou rapporte dans la simulation. À toi de décider ce qui compte. »).

### 2. Ne jamais désigner un actif nommé comme alternative recommandée

Les alternatives restent visibles (transparence méthodologique), mais présentées comme **résultat mécanique de l'optimiseur** sous les contraintes posées, avec un intitulé du type « Ce que l'optimiseur retiendrait sans cette contrainte » — jamais « ce qu'on te conseille ».

### 3. Avertissement contextuel visible sur l'onglet

Un bandeau court et permanent en tête de l'onglet Affiner (pas un astérisque en pied de page) : simulation pédagogique, portefeuille virtuel, aucune recommandation personnalisée, aucune transaction, Seedow n'est ni PSI ni CIF. Cohérent avec le bandeau déjà présent sur Ethi.

### 4. Une case de reconnaissance à la première sauvegarde

À la première sauvegarde d'un portefeuille personnalisé, une confirmation unique : « Je comprends qu'il s'agit d'une simulation et que Seedow ne me recommande aucun investissement. » Mémorisée par utilisateur, non bloquante ensuite. Pas de pré-cochage (§1.5 du contexte produit : aucun dark pattern).

### 5. Aligner CGU et méthodologie

Ajouter dans les CGU une mention explicite au §4 (ou un §4 bis) couvrant l'outil d'ajustement lui-même, pas seulement Ethi : les simulations d'arbitrage ne constituent pas une recommandation personnalisée. Et sur `/methodologie`, une ligne expliquant que l'optimiseur applique une méthode publique et identique pour tous, sans adaptation à une situation patrimoniale individuelle.

## Détails techniques

- `src/i18n/locales/fr.json` / `en.json` via `update_locales.ts` : réécriture des clés `allocation_refiner.desc`, `keep`, `lift`, `accepted`, `to_lift`, `after_label` ; nouvelles clés pour le bandeau et la case de reconnaissance.
- `src/components/portfolio/AllocationRefiner.tsx` : libellés uniquement, aucune modification de `simulateTradeoffs` ni des calculs.
- `src/routes/portfolio.tsx` : bandeau d'avertissement en tête de l'onglet Affiner.
- `src/components/portfolio/PortfolioCustomizer.tsx` : case de reconnaissance à la première sauvegarde.
- Persistance de l'acquittement : colonne booléenne sur `profiles` (migration Lovable Cloud, RLS existante conservée).
- `src/routes/cgu.tsx` et `src/routes/methodologie.tsx` : ajout des mentions décrites ci-dessus.
- Tokens DA existants (paper / ink / ink-2), un seul accent signal sur l'écran.
