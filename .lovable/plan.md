# Refonte de l'onglet « Affiner »

## Le problème

Aujourd'hui, « Affiner » demande à l'utilisateur de manipuler un curseur 0–100 % par ligne, indépendamment des autres, sans jamais dire ce que ça change concrètement. Pour un néophyte : aucun repère (c'est quoi « 12 % » ?), aucune conséquence lisible, et un total qui ne fait pas 100 % sans explication. Juste en dessous, un second bloc d'arbitrages en « bps » ajoute du jargon.

## Ce qu'on construit

Un éditeur en langage clair, sans manipulation de pourcentages.

### 1. En haut : où j'en suis, en une phrase

Trois repères courts et parlants, remplaçant l'entête actuelle :
- Impact — « Élevé » (score en petit dessous)
- Répartition — « Bien répartie » / « Concentrée sur 2 lignes »
- Risque ressenti — « Modéré »

### 2. Le cœur : une carte par ligne, avec « Renforcer / Réduire »

Chaque actif détenu devient une carte lisible :

```text
┌──────────────────────────────────────────────┐
│ Énergies renouvelables (INRG)                │
│ Part importante · environ 1 € sur 5          │
│ [ ── Réduire ]   [ ▓▓▓▓▓░░░ ]   [ Renforcer ─ ]│
└──────────────────────────────────────────────┘
```

- Deux boutons par paliers (5 points) au lieu d'un curseur libre : un clic = un pas compréhensible.
- La part est décrite en mots et en équivalent concret (« environ 1 € sur 5 »), le pourcentage exact reste affiché en petit pour qui le cherche.
- Une barre visuelle montre le poids relatif, pas un chiffre à viser.
- Renforcer une ligne réduit proportionnellement les autres : le total reste toujours à 100 %, donc l'utilisateur ne peut jamais produire une allocation invalide ni se demander « pourquoi ça ne tombe pas juste ».
- Retirer une ligne reste possible, avec confirmation dans le libellé.

### 3. Le retour immédiat : « ce que ça change »

Sous les cartes, un bandeau qui parle uniquement en conséquences, en français, dès la première modification :
- « Ton impact monte de 3 points »
- « Ton portefeuille dépend davantage d'une seule ligne »
- « Tu es un peu plus exposé aux variations de marché »

Pas de bps, pas de « volatilité +0,42 pt » en premier plan. Les chiffres précis restent disponibles dans un repli « Voir les chiffres » pour les utilisateurs avancés.

### 4. Les arbitrages guidés, reformulés

Le bloc actuel `AllocationRefiner` (bps, ESG delta, volatilité) est déplacé dans ce repli « Aller plus loin », et ses libellés sont réécrits en langage clair : « −18 bps » devient « environ 1,80 € de moins par an pour 1 000 € investis ». La logique de simulation serveur et le suivi analytique restent inchangés.

## Détails techniques

- Réécriture de `src/components/portfolio/PortfolioCustomizer.tsx` : remplacement du `Slider` par un contrôle par paliers, poids toujours normalisés à 100 % (renforcement proportionnel des autres lignes), part exprimée via une nouvelle fonction de langage clair.
- Ajout dans `src/lib/portfolio/plain-language.ts` : `describeWeight()` (part importante / moyenne / petite + équivalent « 1 € sur N ») et `describeRisk()`, fonctions pures et testées.
- `src/lib/portfolio/consequences.ts` : conserve la logique existante, on ajoute une phrase de risque perçu dérivée de la concentration (aucune volatilité inventée côté client — la mesure serveur reste la référence).
- `src/routes/portfolio.tsx` : `AllocationRefiner` passe dans un bloc repliable « Aller plus loin » sous l'éditeur.
- `AllocationRefiner.tsx` : conversion des bps en euros par an pour 1 000 €, libellés adoucis. Aucun changement de la fonction serveur `simulateTradeoffs` ni de `saveCustomPortfolio`.
- Nouvelles chaînes ajoutées en FR et EN via `update_locales.ts`.
- Tokens DA existants uniquement (paper / ink / mint), un seul accent signal par écran.
