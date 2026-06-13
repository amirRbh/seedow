## Objectif

Faire d'Ethi un vrai conseiller : à l'ouverture il **diagnostique** ton portefeuille avec des chiffres concrets, ses réponses suivent un canevas **Constat → Impact → Action**, et il sait simuler proprement des scénarios (versement, choc marché, horizon).

---

## 1. Briefing d'ouverture proactif (client)

Remplacer le message d'accueil actuel (1 phrase générique) par un **briefing structuré** calculé côté client à partir du portefeuille déjà chargé. Aucune nouvelle table, aucun appel IA pour le briefing — c'est déterministe et instantané.

Le briefing contient :
- **En-tête** : valeur actuelle, P&L, retour %.
- **2 à 4 observations** générées par des règles simples (`src/lib/ethi/diagnostics.ts`, nouveau fichier) :
  - Concentration : une ligne pèse > 30 % → flag.
  - Doublons sectoriels/géographiques : > 60 % sur une même région ou catégorie.
  - TER moyen élevé (> 0,4 %).
  - Score ESG faible (< 60) ou très bon (> 80) → ton positif.
  - Volatilité vs profil (si dispo).
  - Pas de versement récent / portefeuille non alimenté.
- **3 chips d'action contextuelles** (remplacent les suggestions actuelles génériques) : "Diagnostique mon portefeuille", "Simule +100 €/mois pendant 10 ans", "Et si le marché baisse de 20 % ?", etc., adaptées aux flags détectés.

FR + EN. Format markdown court (KPI gras + liste de 2-4 puces).

## 2. Canevas de réponse Constat → Impact → Action

Mettre à jour les system prompts (`src/routes/api.ethi.ts`) pour imposer la structure suivante sur **chaque réponse non triviale** :

```
**Constat.** <1 phrase, chiffrée si possible>
**Impact.** <1 phrase : pourquoi ça compte pour toi>
**Action.** <1 phrase actionnable, + éventuel tag [deposit:…] ou [seed:…]>
```

Pour les questions purement informatives (ex : "c'est quoi le Sharpe ?"), Ethi répond librement mais reste court (≤ 4 phrases).

## 3. Simulations chiffrées robustes

Aujourd'hui les calculs d'intérêts composés sont délégués au LLM → résultats incohérents. On bascule sur un **tool côté serveur** appelé via une boucle simple :

- Ajouter dans `api.ethi.ts` la détection d'intent simulation (regex sur mots-clés "simul", "si je place", "dans X ans", "si le marché", "horizon", "krach") **OU** étendre le prompt pour que le LLM renvoie un tag `[sim:<json>]` que le serveur intercepte, calcule, et réinjecte.
- Choix retenu (plus simple, déterministe) : créer un endpoint `createServerFn` `runSimulation` (`src/lib/ethi/simulation.functions.ts`) qui prend `{ monthly, initial, years, annualReturnLow, annualReturnHigh, shockPct? }` et renvoie une fourchette + valeur médiane via formule intérêts composés mensuelle. Côté client, on détecte les patterns simples dans l'input (ou les chips ouvrent un mini-formulaire) → appel direct + injection du résultat formaté dans le chat sous forme de bulle assistant.
- Garde-fou : toute simulation se termine par le disclaimer en italique (déjà dans le prompt).

## 4. Contexte envoyé au LLM enrichi

Étendre `ctx` côté `ethi.tsx` avec les agrégats utiles au diagnostic (déjà calculables, pas de backend) :
- `topHoldingPct`, `topRegionPct`, `topCategoryPct`.
- `diagnostics`: tableau des flags détectés (même règles que §1) → le LLM s'appuie dessus au lieu de réinventer.

## 5. UX du chat

- Garder la bulle de bienvenue actuelle mais y rendre **les chips d'action contextuelles** (composant `EthiSuggestionChips` étendu pour accepter une liste dynamique).
- Sur clic d'une chip "simulation", ouvrir un mini-formulaire inline (3 champs : montant mensuel, durée, rendement) plutôt qu'envoyer une question vague.
- Ne pas toucher au design (palette/typo Emerald Prestige conservés).

---

## Détails techniques

**Fichiers créés**
- `src/lib/ethi/diagnostics.ts` — règles de flags + générateur de briefing (pur, testable, FR/EN).
- `src/lib/ethi/simulation.functions.ts` — `createServerFn` `runSimulation` (formule VF = P×(((1+r)^n − 1)/r) + initial×(1+r)^n, fourchette low/high, choc optionnel).
- `src/components/ethi/EthiBriefing.tsx` — bloc d'accueil (KPIs + observations + chips).
- `src/components/ethi/SimulationForm.tsx` — mini-form inline.

**Fichiers modifiés**
- `src/routes/ethi.tsx` — remplacer le `useEffect` du message d'accueil par `EthiBriefing` ; enrichir `ctx` ; gérer l'appel `runSimulation` et l'injection du résultat ; passer les chips dynamiques.
- `src/routes/api.ethi.ts` — system prompts FR/EN : imposer Constat/Impact/Action, expliquer que `context.diagnostics` est la source de vérité, retirer l'instruction "fais le calcul toi-même" (remplacée par "si simulation demandée sans chiffres déjà fournis dans le contexte, propose le mini-formulaire").
- `src/components/ethi/EthiSuggestionChips.tsx` — accepter `chips: string[]` en prop.
- `src/i18n/locales/fr.json` + `en.json` — clés `ethi.briefing.*`, `ethi.diagnostics.*`, `ethi.simulation.*`.

**Hors scope**
- Pas de nouvelle table en base.
- Pas de changement de modèle IA (on garde `gemini-2.5-flash`).
- Pas de refonte visuelle (design system Emerald Prestige conservé).
- Pas de tool-calling AI SDK (overkill ici, on garde fetch direct + detection client).

---

## Vérification

1. Ouvrir `/ethi` avec un portefeuille concentré → vérifier que le briefing flag la concentration avec le bon %.
2. Cliquer la chip "Simule +100 €/mois 10 ans" → vérifier fourchette cohérente (autour de 14k–16k €) et disclaimer présent.
3. Poser une question libre ("dois-je investir plus ?") → vérifier le format Constat/Impact/Action.
4. Tester EN : briefing + simulation + format respectés en anglais.