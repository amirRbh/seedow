# Refonte /discover — Screener financier

## Problème

La page actuelle est un Tinder d'actifs : on swipe à gauche/droite sur des cartes "Plant/Pass" sans aucune info pour trancher (perf, frais, volatilité absents). Aucune valeur ajoutée pour une décision d'investissement, et le lexique "planter / graine" contredit la mémoire projet (lexique jardin retiré).

## Direction validée

- **Rôle** : screener financier sérieux (filtres, tri, recherche)
- **Mode swipe** : supprimé
- **Action carte** : ouvre la fiche détaillée (pas d'investissement direct depuis la liste)

## Nouvelle structure

```text
┌─ AppHeader (eyebrow + titre) ────────────────────────┐
│  Onglets : Explorer · Communauté                     │
├──────────────────────────────────────────────────────┤
│  [🔍 Recherche ticker/nom..........................] │
│  [Catégorie ▾] [Risque ▾] [Frais ▾] [ESG ▾] [Région]│  ← filtres déroulants
│  Tri : Pertinence | ESG | Frais | Perf 1Y | A→Z      │
│  N résultats · [✕ Réinitialiser]                     │
├──────────────────────────────────────────────────────┤
│  Tableau / liste dense                               │
│  ┌────────────────────────────────────────────────┐  │
│  │ IWRD  iShares Core MSCI World                  │  │
│  │ ETF · Monde · SRRI 4 · TER 0,20 %              │  │
│  │ ESG 8,1  ·  92,40 €  ·  Voir fiche →           │  │
│  └────────────────────────────────────────────────┘  │
│  …                                                   │
└──────────────────────────────────────────────────────┘
```

Clic sur une ligne → ouvre `AssetDetailSheet` (déjà existant). L'investissement se fait depuis la fiche.

## Filtres (dérivés du modèle `MockAsset`)

- **Catégorie** : ETF, Action, Fonds, Obligation… (multi-select via dropdown)
- **Risque SRRI** : slider 1 → 7 (max)
- **Frais TER** : slider 0 → 1 % max
- **ESG** : slider score minimum 0 → 10
- **Région** : dominante du `geo_breakdown` (Europe, Monde, US, Émergents)
- **Recherche texte** : ticker + nom + issuer

Tous combinables. Compteur de résultats temps réel. Bouton "Réinitialiser" si ≥1 filtre actif.

## Tri

- Pertinence (défaut, ordre du mock)
- ESG ↓ / ↑
- Frais TER ↑
- Prix ↑ / ↓
- A → Z

## Composants

**À créer** :
- `src/components/discover/AssetScreener.tsx` — barre filtres + tri + recherche, état local
- `src/components/discover/AssetRow.tsx` — ligne dense uniforme (remplace la double UI swipe/list)
- `src/lib/discover/filters.ts` — helpers purs `applyFilters`, `applySort`, `dominantRegion`

**À modifier** :
- `src/routes/discover.tsx` — supprime swipe, currentIndex, planted, viewMode toggle, handleDrag, handleSwipe. Remplace par `<AssetScreener />` dans l'onglet Explorer.
- `src/i18n/locales/fr.json` + `en.json` — clés `discover.filters.*`, `discover.sort.*`, `discover.results_count`, `discover.reset`, `discover.search_placeholder`. Retirer les clés mortes (`swipe`, `pass`, `select`, `restart`, `all_seen_*`, `swipe_hint`, `selected_one/other`).

**À supprimer** :
- `src/components/discover/SeedCard.tsx` (carte swipe Tinder, lexique "graine")
- `src/components/discover/ThemeFilter.tsx` (remplacé par filtres screener)
- Ré-utilise `AssetDetailSheet.tsx` tel quel (déjà la fiche complète).

## Détails techniques

- Vocabulaire respecte la mémoire : "actifs", "filtrer", "comparer", "fiche". Aucun "planter / graine / jardin".
- Style Emerald Prestige : eyebrow or uppercase, KPI `font-value`, séparateurs `.gold-rule`, montants `formatCurrency` (2 décimales).
- Filtres = `Popover` shadcn pour mobile-friendly, dropdowns compacts (≤ `max-w-lg`).
- Pas de Tabs Explorer/Communauté changeants — on garde la structure Tabs existante.
- Aucun changement DB / backend / API.

## Hors scope

- Pas de comparateur côte-à-côte (option 2 non choisie).
- Pas de recommandations personnalisées Ethi (option 3 non choisie).
- Pas de migration des `MOCK_ASSETS` vers la vraie table `assets` (autre chantier).
- Pas de tests automatisés ajoutés.
