## Constat

Aujourd'hui l'app expose beaucoup de portes d'entrée pour peu de contenu distinct :

- Rail desktop : 4 entrées primaires + **9 secondaires** (Ethi, Réveil, Profil, Wrapped, Objectifs, Comparatif, Certificat, Cours, Méthodologie).
- Portefeuille : **5 onglets** (Performance, Allocation, Affiner, Impact, Comparatif) — dont Comparatif qui existe aussi comme page `/comparatif`.
- Dashboard : Action du jour + valeur + Impact + allocation + bloc « Explorer » (Réveil, Watchlist, Vote, Comprendre, Intérêt réel) + « Voir le détail ».
- Doublons de surface : `/comparatif` ≡ onglet Comparatif · `/certificat` ≡ contenu Impact · `/methodologie` ≡ `/comprendre` · `/wrapped` ≡ bilan du Vote · `/profil` vs `/reglages`.

## Ce qu'on regroupe

**1. Rail desktop — 9 entrées secondaires → 4**

| Nouvelle entrée | Absorbe |
|---|---|
| Ethi | inchangé |
| Apprendre | Cours + Méthodologie + Comprendre (onglets internes sur `/cours`) |
| Réveil | inchangé (garde le Vote/Wrapped en teaser) |
| Mon compte | Profil + Wrapped + Certificat + Objectifs + Réglages |

Aucune route n'est supprimée : les URLs existantes restent valides (lien partagé, certificat, wrapped), elles deviennent simplement des destinations atteintes depuis un hub plutôt que depuis le rail.

**2. Portefeuille — 5 onglets → 3**

- **Performance** = Performance + Allocation fusionnés (graphe, P&L, puis répartition dessous).
- **Impact** = Impact + Comparatif + accès au certificat (le comparatif est un bloc dans Impact, pas un onglet).
- **Affiner** = inchangé.

**3. Dashboard — moins de blocs concurrents**

- « Explorer » repliable garde Réveil + Vote + Watchlist ; « Comprendre mon portefeuille » et « Intérêt investissement réel » descendent dans le hub Mon compte / la fin de page.
- Le lien « Voir le détail » reste l'unique sortie vers le portefeuille.

**4. Barre mobile** — reste à 4 entrées (Accueil, Portefeuille, Découvrir, Vote) + FAB Ethi ; « Mon compte » et « Apprendre » deviennent accessibles depuis l'en-tête (avatar) plutôt que d'ajouter des onglets.

## Détails techniques

- `src/components/layout/RailNav.tsx` : nouveau tableau `SECONDARY` à 4 items, nouvelles clés i18n (`rail_nav.learn`, `rail_nav.account`).
- Nouveau hub `src/routes/profil.tsx` (ou section en tête) listant Objectifs, Wrapped, Certificat, Réglages en cartes-liens ; `/reglages` reste une page à part entière.
- `src/routes/cours.tsx` : ajout d'un sous-onglet « Méthodologie » pointant sur le contenu existant de `/methodologie` (réutilisation du composant, pas de duplication).
- `src/routes/portfolio.tsx` : `PORTFOLIO_TABS` passe à `["performance", "impact", "affiner"]` ; `validateSearch` mappe les anciennes valeurs (`allocation` → `performance`, `comparatif` → `impact`) pour ne pas casser les liens `?tab=`.
- `AllocationBreakdown` + `BadgesCard` déplacés sous `GrowthComparison` dans l'onglet Performance ; `ComparatifPanel` monté dans `ImpactExperience`.
- `src/components/dashboard/ExploreSection.tsx` : liste réduite (3 cartes).
- i18n : ajout/renommage des clés dans `fr.json` et `en.json` via `update_locales.ts`.
- Aucune logique métier touchée (valorisation, moteur de portefeuille, ESG inchangés). Vérification : `tsgo --noEmit` + vitest + captures Playwright dashboard/portefeuille desktop & mobile.
