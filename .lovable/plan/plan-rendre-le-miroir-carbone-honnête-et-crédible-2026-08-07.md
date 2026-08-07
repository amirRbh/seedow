# Plan : rendre le Miroir carbone honnête et crédible

## Problème constaté

Le composant `MirrorReveal` compare actuellement l'intensité carbone (WACI) du portefeuille simulé au **MSCI ACWI classique (115 tCO₂e/M$ CA)**, un indice actions monde. Or :

- seuls **9 actifs sur 120** ont une donnée WACI renseignée ;
- le fonds `BGRN` (iShares USD Green Bond ETF) affiche un WACI de **757**, probablement une anomalie de donnée ou une mauvaise lecture de la fiche iShares ;
- un portefeuille obligataire se retrouve donc avec un WACI de ~446, et le verdict affiche en rouge « +288 % d'intensité carbone que l'indice de référence », ce qui donne l'impression que le portefeuille Seedow est "pire" qu'un ETF classique.

L'idée du miroir reste bonne : confronter le portefeuille à une référence sourcée. Mais le référentiel et la qualité des données doivent être corrigés.

## Objectif

Faire en sorte que le Miroir affiche une comparaison **juste, sourcée et pédagogique**, sans sur-promesse ni effet contre-productif.

---

## Étape 1 — Audit et correction des données WACI (quick win)

**But** : éliminer l'anomalie `BGRN = 757` qui fausse les portefeuilles obligataires.

- Vérifier la fiche iShares/BlackRock de `BGRN` et le parser `src/lib/esg/factsheet-parser.ts`.
- Si la valeur 757 est correcte (ce qui serait surprenant pour un green bond), ajouter un commentaire explicatif et la traiter comme un cas particulier.
- Si c'est une erreur de parsing (mauvaise colonne, unité, ou valeur mal lue), corriger le parser et réingérer.
- Ajouter un garde-fou côté ingestion : flaguer tout WACI > 300 comme "à vérifier" et ne pas l'utiliser dans le miroir tant qu'il n'est pas validé.

**Livrable** : `src/lib/esg/factsheet-parser.ts` corrigé + migration SQL si mise à jour de la valeur en base.

---

## Étape 2 — Choisir le bon référentiel

**But** : comparer à une référence qui a du sens pour un portefeuille Seedow.

Trois options, de la plus simple à la plus riche :

```text
Option A — Référentiel unique ESG large
  Remplacer MSCI ACWI (115) par MSCI World ESG Leaders (~85).
  Avantage : plus honnête pour un portefeuille éthique, message positif plus naturel.
  Inconvénient : reste un indice actions, donc biaisé si le portefeuille est très obligataire.

Option B — Référentiel composite (recommandée)
  Pondérer le référentiel selon l'allocation du portefeuille :
    - part actions  → MSCI ACWI classique (115)
    - part obligations → Bloomberg Global Aggregate (~120-140, ou un indice obligataire ESG ~80)
  Le benchmark devient dynamique et aligné sur la composition réelle.
  Avantage : comparaison honnête quelle que soit l'allocation.

Option C — Échelle de référence
  Afficher 3 repères simultanés :
    - ETF Monde classique (MSCI ACWI, 115)
    - ETF Monde ESG large (MSCI World ESG Leaders, ~85)
    - Paris-Aligned Benchmark (~50-60)
  Le portefeuille se positionne sur cette échelle.
  Avantage : pédagogique, transparent, pas de "gagnant/perdant" binaire.
```

**Recommandation** : implémenter l'**Option B** par défaut, avec un affichage inspiré de l'**Option C** (barre de positionnement visuelle).

**Livrable** : `src/lib/esg/benchmark.ts` enrichi avec plusieurs référentiels + logique de benchmark composite dans `src/lib/portfolio/server.functions.ts`.

---

## Étape 3 — Réécrire le verdict du Miroir

**But** : éviter l'effet "tu es pire que l'indice" quand la donnée ou le référentiel est discutable.

Changements dans `src/components/onboarding/MirrorReveal.tsx` :

- Remplacer le badge binaire "plus propre / plus intensif" par un **positionnement relatif** :
  - "Ton portefeuille est **X % en dessous / au-dessus** du référentiel Seedow (composite actions/obligations)."
- Ajouter un indicateur de **couverture des données** :
  - "Donnée calculée sur {{coverage}} % de ton allocation (WACI MSCI disponible)."
- Si la couverture est < 50 % ou qu'un actif aberrant est détecté, afficher un état "partiel" au lieu d'un verdict tranché.
- Utiliser la couleur `solar` (avertissement doux) plutôt que `alert` (rouge) quand le portefeuille est au-dessus du référentiel mais dans une fourchette acceptable.

**Livrable** : `MirrorReveal.tsx` refondu + clés i18n mises à jour dans `fr.json` et `en.json`.

---

## Étape 4 — Pédagogie et transparence

**But** : expliquer pourquoi le référentiel compte, et éviter les malentendus.

- Ajouter une infobulle / ligne d'explication dans le miroir :
  - "Pourquoi ce chiffre ? Le WACI mesure l'intensité carbone des entreprises détenues, pondérée par leur poids. Il ne mesure pas tes émissions personnelles, mais l'empreinte du capital investi."
  - "Référentiel Seedow = mix actions/obligations adapté à ton allocation. Sources : MSCI ESG Fund Ratings, iShares fact sheets."
- Mettre à jour le cours `11-mesurer-impact.ts` pour refléter le référentiel composite et la couverture des données.
- Dans `src/routes/methodologie.tsx`, documenter le calcul du benchmark composite et la gestion des valeurs manquantes.

**Livrable** : textes mis à jour dans le miroir, le cours 11 et la méthodologie.

---

## Critères d'acceptation

- [ ] Le miroir n'affiche plus de verdict négatif rouge sur un portefeuille obligataire à cause de `BGRN`.
- [ ] Le référentiel utilisé est explicitement nommé et sourcé.
- [ ] La couverture WACI est affichée à côté du chiffre.
- [ ] Les tests existants (`metrics.test.ts`, `carbon.test.ts`) passent ; de nouveaux tests couvrent le benchmark composite.
- [ ] `bun run typecheck` passe.

## Questions pour toi

1. **Référentiel** : tu préfères l'Option B (composite dynamique) ou l'Option C (échelle de 3 repères) ?
2. **BGRN** : as-tu accès à la fiche iShares de `BGRN` pour vérifier si 757 est la vraie valeur WACI ?
3. **Ton** : le message du miroir doit-il rester neutre/factuel, ou peut-il être légèrement valorisant quand le portefeuille fait mieux que le référentiel ESG ?
