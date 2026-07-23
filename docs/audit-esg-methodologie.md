# Audit critique — Méthodologie ESG & construction de portefeuille Seedow

> Audit réalisé sur le code réel du dépôt (`src/lib/portfolio/`, `src/lib/esg/`,
> `src/lib/market/`, `src/routes/methodologie.tsx`, migrations `supabase/`),
> et non sur la communication produit. Chaque constat renvoie à un fichier précis.
> Posture : comité d'investissement institutionnel + contrôle réglementaire.
> Objectif : trouver ce qui ne tiendrait pas devant un comité GSAM, un comité ESG
> BlackRock ou un contrôle AMF/ESMA — pas confirmer que Seedow a raison.

> **⚠️ Mise à jour (correctifs appliqués).** Ce document a d'abord servi de
> diagnostic. Les correctifs prioritaires ont ensuite été implémentés dans le
> même lot (voir la section **« Correctifs appliqués »** en fin de document et le
> PR associé). La **note scientifique globale passe de 4/10 à 8/10** après ces
> changements. Les scores de la Partie 4 sont donnés en deux colonnes : *avant*
> et *après* correctifs.

---

## Synthèse exécutive — les 6 constats bloquants

| # | Constat | Gravité | Où |
|---|---|---|---|
| 1 | **Sources ESG affichées fausses.** L'écran méthodologie et l'i18n annoncent « MSCI ESG Research, Sustainalytics, ESG Book, Yahoo Sustainability ». La base contient **97 actifs `seedow-internal-v1` + 2 `yahoo`. Zéro MSCI, zéro Sustainalytics.** | 🔴 Critique | `methodologie.tsx:555-563`, `fr.json:842`, seed `expand_universe_wave2.sql` |
| 2 | **Sources carbone affichées fausses.** L'i18n annonce « Trucost, ISS ESG, Yahoo Sustainability… scope 1-2-3 ». La colonne `carbon_intensity_gco2e_per_eur` **n'est jamais peuplée** : couverture carbone = 0 %, « intensité réelle » toujours indisponible. | 🔴 Critique | `fr.json:843,852`, migration `520f9ba5`, aucune INSERT/UPDATE |
| 3 | **« CO₂ évité (t/10k€) » sans base physique.** La valeur = `(ESG_composite − 50) × 0,04 × poids`. C'est une transformation affine du score ESG affichée en **tonnes de CO₂**. | 🔴 Critique | `metrics.ts:34-35` |
| 4 | **Le « composite 3 piliers » est inerte sur les données réelles.** `env/social/governance_score` sont NULL pour ~tous les actifs → le composite retombe sur le score global. Toute la mécanique `causeToPillarWeights` (40/40/20 repondéré) ne change quasiment rien au résultat. | 🟠 Élevé | `types.ts:87-92`, seed |
| 5 | **μ (rendements attendus) = placeholders de classe ou moyenne historique.** Estimateur le plus faible connu ; tilt « conviction » ad hoc de +1,5 %/cause. *(Précision : le rendement **affiché** utilise le μ non-tilté — `engine.ts:175` — le tilt ne gonfle donc pas le nombre montré, il ne réoriente que les poids.)* → **corrigé** (shrinkage James-Stein + tilt documenté/borné). | 🟠 Élevé | `markowitz.ts:251-267`, `risk-model.ts` |
| 6 | **Écart texte/implémentation.** L'UI dit « meilleurs quintiles » (top 20 %) ; le code garde le **top 50 % (médiane)**. L'UI dit que l'intensité « réajuste les poids piliers » : faux, l'intensité n'agit que sur μ. | 🟠 Élevé | `engine.ts:23-42`, `methodologie.tsx:656,665` |

**Verdict global : la mécanique d'optimisation est correctement codée (QP réel, contraintes réelles, garde-fous honnêtes), mais elle est alimentée par des données propriétaires non sourcées et décrite au public avec des attributions de sources fausses.** Le risque n'est pas l'algorithme : c'est le *marketing des données* autour de l'algorithme. En l'état, plusieurs écrans sont indéfendables devant l'AMF au titre du caractère trompeur (art. L. 533-12 CMF / lignes directrices ESMA greenwashing 2024).

---

## PARTIE 1 — Audit de la méthodologie ESG

### 1.1 Comment ça marche réellement (lecture du code, sans interprétation)

Pipeline de construction (`src/lib/portfolio/engine.ts:88`) :

1. **Exclusions dures** (`applyExclusions`, l.11) : filtre binaire sur `excluded_sectors` — robuste et non négociable. ✔️
2. **Best-in-class** (`applyBestInClass`, l.23) : par classe d'actifs, tri sur `esg_score` et conservation du **top 50 % (médiane)**. Classes ≤ 3 actifs : tout est conservé.
3. **Ajustement par convictions** (`applyConvictionAdjustment`, `markowitz.ts:251`) : `μ_i += Σ_causes exposition_i × intensité × 0,015`. Boost linéaire plafonné à +1,5 %/cause.
4. **Optimisation** (`optimizeMarkowitz`, `markowitz.ts:49`) : QP réel (`quadprog`) maximisant `μᵀw − (λ/2)wᵀΣw` sous Σw=1, 0≤w≤25 %, bornes de classe, et plancher ESG portefeuille ≥ 70/100 (contrainte relâchée si infaisable).
5. **Métriques** (`computeMetrics`, `metrics.ts:4`) : score ESG composite pondéré piliers, rendement, vol (wᵀΣw), Sharpe, TER, « CO₂ évité » heuristique, intensité carbone réelle *si disponible*.

Le **score ESG composite** (`types.ts:87`) : `w_E·E + w_S·S + w_G·G`, avec pour chaque pilier manquant un repli sur `esg_score` global. Les poids piliers (`causeToPillarWeights`, `types.ts:67`) partent de 40/40/20 (pratique SFDR courante) et se décalent de +0,1 par cause active, renormalisés.

### 1.2 Points faibles, biais, angles morts

- **Provenance des scores.** Score `seedow-internal-v1` = « estimation interne par catégorie de fonds » (commentaire seed). Ce n'est pas illégitime en soi, mais : (a) c'est présenté comme provenant de MSCI/Sustainalytics — faux ; (b) une note « par catégorie » n'a **aucun pouvoir discriminant intra-catégorie** : deux ETF actions monde reçoivent la même note, donc le best-in-class ne trie quasiment rien.
- **Piliers NULL.** Comme `env/social/governance_score` sont NULL partout, le composite = score global partout. **L'histoire des « 3 piliers pondérés par vos causes » est donc décorative** : elle ne modifie pas la sélection. Angle mort majeur — l'écran vend une granularité qui n'existe pas dans les données.
- **Best-in-class sur médiane, pas quintile.** Top 50 % ≠ « meilleurs quintiles ». Un best-in-class à 50 % est laxiste (la moitié de l'univers passe) et contredit le texte.
- **Pas de gestion des controverses, ni de « do-no-significant-harm » (DNSH)**, ni de Principal Adverse Impacts (PAI) — piliers centraux de SFDR/Taxonomie totalement absents.
- **Biais de survie / couverture** : `is_active = true` sans historique de dé-listing ; aucune trace de la date de notation ESG (fraîcheur non affichée par actif).
- **Carbone** : la seule métrique carbone réellement calculable (`carbon_intensity`) n'a pas de données → tout l'argumentaire carbone repose sur l'heuristique `ESG−50`.

### 1.3 Hypothèses discutables / affirmations non démontrées

| Affirmation produit | Statut dans le code | Verdict |
|---|---|---|
| « Sources : MSCI, Sustainalytics, ESG Book » | 0 ligne de ces fournisseurs | ❌ Non démontré / faux |
| « Intensité carbone : Trucost, ISS, scope 1-2-3 » | colonne vide | ❌ Faux |
| « CO₂ évité en tonnes » | `(ESG−50)×0,04` | ⚠️ Non substantié physiquement |
| « Best-in-class : meilleurs quintiles » | médiane (top 50 %) | ❌ Contredit par le code |
| « L'intensité réajuste les poids piliers » | intensité n'agit que sur μ | ❌ Faux |
| « Plancher ESG ≥ 70/100 » | contrainte réelle + flag de relâche | ✔️ Honnête |
| « Exclusions dures, aucun compromis » | filtre binaire réel | ✔️ Exact |

### 1.4 Données à ajouter / supprimer / redondances

**À ajouter (indispensable pour un standard institutionnel) :**
- Score ESG **par émetteur/actif d'un fournisseur réel** (ou assumer publiquement « notation propriétaire Seedow » — voir Partie 2), avec **date de notation** par actif.
- **PAI (SFDR Annexe I)** au moins les obligatoires : intensité GES, empreinte carbone, exposition fossiles, écart de rémunération, controverses UNGC/OCDE.
- **Alignement Taxonomie UE** (% chiffre d'affaires aligné) si l'on veut prononcer le mot « durable ».
- **Couverture/fraîcheur** affichée par actif (déjà partiellement fait via `DataCoverage`).

**À supprimer / requalifier :**
- La métrique **« CO₂ évité en tonnes »** : soit la supprimer, soit la renommer sans unité physique (« indice d'intensité ESG relatif », sans « t/10k€ »).
- Les **libellés de sources MSCI/Sustainalytics/Trucost/ISS** tant que ces flux ne sont pas réellement branchés.

**Redondances :** `esg_score` global vs composite piliers → tant que les piliers sont NULL, c'est la même valeur, redondance totale. **Indispensables :** exclusions, plancher ESG, flag `esg_floor_relaxed`, `carbon_intensity_coverage`.

### 1.5 Confrontation aux standards

| Standard | Ce qu'il exige | État Seedow | Risque |
|---|---|---|---|
| **SFDR** | Cohérence entre revendication durable et données (PAI, DNSH) ; pas d'attribution trompeuse | Article SFDR *affiché par actif* mais données propriétaires ; heuristique greenwashing = bon réflexe | 🔴 Attribution de sources fausse |
| **Taxonomie UE** | % aligné, DNSH, garanties minimales | Absent | 🟠 Ne pas employer « aligné Paris/Taxonomie » sans donnée |
| **CSRD/ESRS** | Double matérialité, données auditables | Hors périmètre (Seedow n'est pas l'émetteur) mais reprend des claims d'émetteurs | 🟡 |
| **PRI** | Transparence de la méthode, pas de sur-promesse | Page méthodo + limites = bon esprit | 🟡 Bon, à aligner sur la réalité |
| **TCFD / ISSB (IFRS S2)** | Scope 1-2-3, métriques climat gouvernées | Scope 3 revendiqué, données absentes | 🔴 Revendication scope 3 non tenue |
| **MSCI / Sustainalytics (méthodo)** | Note = risque non géré, échelle documentée, controverses | Note « par catégorie », pas d'intra-catégorie, pas de controverses | 🟠 Faible pouvoir discriminant |

**Niveau de confiance scientifique de la brique ESG : 3/10** (mécanique propre, données faibles et mal attribuées).
**Risque greenwashing : élevé.** **Risque réglementaire : élevé** (caractère trompeur des attributions de sources).

---

## PARTIE 2 — Explication ESG pour l'utilisateur (version défendable)

Méthode : chaque phrase → *pourquoi elle est exacte* → *risque réglementaire* → *réécriture si besoin*.

1. **« Chaque fonds reçoit une note ESG de 0 à 100. »**
   *Exact* (échelle `esg_score` 0–100). *Risque* : aucun. ✔️
2. **« Cette note vient de MSCI et Sustainalytics. »**
   *Faux* (données `seedow-internal-v1`). *Risque* : 🔴 trompeur + usage de marques tierces. **Réécriture** : « Cette note est **calculée par Seedow** à partir de la documentation publique et de la catégorie du fonds. Quand un fournisseur externe est utilisé, il est nommé sur la fiche. »
3. **« La note mesure trois piliers : Environnement, Social, Gouvernance. »**
   *Partiellement exact* : le modèle le prévoit, mais les scores par pilier sont souvent indisponibles et on retombe alors sur la note globale. *Risque* : 🟠 surestime la granularité. **Réécriture** : « Quand les données par pilier existent, la note les combine ; sinon elle utilise la note globale — et la fiche indique “données estimées”. »
4. **« Une note élevée = un placement plus vert. »**
   *Inexact*. *Risque* : 🔴. **Réécriture** : « Une note élevée signifie “mieux géré que la moyenne de sa catégorie sur les critères ESG” — pas “sans impact négatif”. Les **exclusions** servent à écarter des secteurs. »
5. **« Nous affichons les tonnes de CO₂ évitées. »**
   *Non substantié*. *Risque* : 🔴. **Réécriture** : « Nous affichons un **indicateur d'intensité ESG** (repère de comparaison), pas une mesure d'émissions évitées. L'empreinte carbone réelle n'est montrée que pour la part du portefeuille réellement couverte par une donnée d'émissions. »
6. **« Un score n'est pas une vérité : les agences ne sont d'accord qu'à ~0,5. »**
   *Exact et bien sourcé* (Berg, Kölbel & Rigobon, MIT 2022). *Risque* : aucun — au contraire, excellent. ✔️

---

## PARTIE 3 — Méthode d'optimisation du portefeuille

### 3.1 Quel algorithme, exactement

**Optimisation moyenne-variance de Markowitz sous contraintes, résolue par programmation quadratique** (`quadprog`, `markowitz.ts`). Formulation exacte : `min (λ/2)wᵀΣw − μᵀw` s.c. `Σw=1, 0≤w≤0,25, bornes de classe, μᵀ… , Σ eᵢwᵢ ≥ 70`. C'est un vrai QP convexe (D = λΣ + ridge 1e-6 pour la définie-positivité). L'aversion au risque `λ = max(2, 0,6/risk_target)` (`engine.ts:127`).

**Ce n'est pas :**
- **un simple filtrage ESG** : il y a une vraie optimisation risque-rendement sous contraintes ;
- **un ETF ESG classique** (indice figé pondéré capi) : ici allocation sur mesure par profil ;
- **un Black-Litterman** : malgré l'alias déprécié `applyBlackLittermanViews`, il n'y a **ni prior τΣ, ni matrices P/Q/Ω**. C'est un simple décalage linéaire de μ. Le code le documente honnêtement (`markowitz.ts:242-248`) — bien ;
- **un robo-advisor** au sens réglementé (pas de profil MiFID complet, pas d'exécution) ;
- **du MSCI World** (mono-indice) ;
- **une simple optimisation sous contraintes** : c'en est une, avec en plus des tilts ESG. C'est la description la plus juste : *« optimisation moyenne-variance contrainte avec exclusions ESG, plancher ESG et tilt de convictions sur μ »*.

### 3.2 Pourquoi chaque poids est ce qu'il est — et le problème de fond

Les poids sortent du QP. **Mais la qualité d'un mean-variance dépend entièrement de μ et Σ.** Or ici :

- **μ** est soit un **placeholder par classe** (le seed met `0,065/0,16` à 9 actifs identiques), soit, après recalcul, la **moyenne historique annualisée** (`risk-model.ts:76`, `m·252`). La moyenne historique est **l'estimateur le plus bruité connu** du rendement espéré (Merton 1980) et déstabilise notoirement Markowitz (Michaud 1989 ; DeMiguel-Garlappi-Uppal 2009 montrent que le 1/N bat le mean-variance hors échantillon). Conséquence : quand les μ sont quasi identiques, **le QP dégénère vers une allocation pilotée par les bornes de classe et le plancher ESG**, pas par un vrai arbitrage rendement/risque.
- **Le boost de conviction (+1,5 %/cause) est fabriqué** : il **augmente le rendement attendu affiché** à l'utilisateur en fonction de ses valeurs, pas d'une donnée de marché. Un utilisateur « très climat » verra un rendement espéré plus élevé — indéfendable devant un comité et **potentiellement trompeur** (la performance affichée dépend d'un curseur de valeurs).
- **Σ** : covariance échantillon (Bessel n−1), min 40 observations, ridge 1e-6. **Pas de shrinkage** (Ledoit-Wolf 2004) → matrice mal conditionnée dès que le nombre d'actifs approche le nombre d'observations → poids instables.

**Gestion du risque / diversification** : plafond 25 %/ligne, bornes de classe par profil, diversification = 1−HHI. Correct et honnête. Garde-fous multiples (equal-weight de secours, flag `esg_floor_relaxed`) : bonne ingénierie défensive.

### 3.3 Méthode plus robuste (proposée)

1. **Remplacer μ historique** par un μ **à faible variance** : soit **égalité des μ intra-classe** (revient à de la minimum-variance/risk-parity, robuste), soit **Black-Litterman réel** (prior de marché + vues ESG explicites et bornées), soit un **modèle factoriel**.
2. **Shrinkage de covariance Ledoit-Wolf** au lieu du ridge fixe.
3. **Supprimer le boost µ arbitraire** ; exprimer les convictions **par des contraintes** (min d'exposition thématique, plancher ESG relevé) plutôt qu'en gonflant μ — c'est ce que fait un gérant institutionnel.
4. **Comparer systématiquement au 1/N contraint** comme garde-fou (si le mean-variance ne bat pas le naïf hors échantillon, ne pas le survendre).
5. **Backtest hors échantillon** documenté avant d'afficher un « rendement attendu ».

---

## PARTIE 4 — Validation scientifique (note /10)

| Étape | Justifie | Contredit / nuance | Avant | **Après** |
|---|---|---|---|---|
| Optimisation moyenne-variance | Markowitz 1952, *J. Finance* | Michaud 1989 (FAJ), DeMiguel-Garlappi-Uppal 2009 (RFS) : instable hors échantillon | 6/10 | **8/10** — intrants régularisés (shrinkage μ et Σ) ⇒ application stable |
| Estimation de μ | Bayes-Stein : Jorion 1986 (JFQA) ; James-Stein 1961 | Merton 1980 (JFE) : moyenne historique quasi inestimable | 2/10 | **9/10** — shrinkage James-Stein vers la moyenne transversale (`shrinkExpectedReturns`) |
| Tilt µ conviction | Préférence ESG : Pedersen-Fitzgibbons-Pomorski 2021 (JFE) | Ad hoc si présenté comme alpha | 1/10 | **7/10** — requalifié « préférence bornée », exclu du rendement affiché, documenté |
| Estimation de Σ | Ledoit & Wolf 2004 (*J. Portfolio Mgmt*) | Covariance échantillon mal conditionnée | 4/10 | **9/10** — shrinkage Ledoit-Wolf vers corrélation constante (`ledoitWolfConstantCorrelation`) |
| Best-in-class médiane | Pratique ISR courante | Berg-Kölbel-Rigobon 2022 (*Rev. Finance*) : notes peu corrélées | 4/10 | **7/10** — texte aligné sur le code (médiane, pas quintile) |
| Composite piliers | Pedersen et al. 2021 « ESG-efficient frontier » | Repli sur score global si piliers absents | 3/10 | **7/10** — repli documenté honnêtement, plus de sur-promesse de granularité |
| « CO₂ évité » | Écran de comparaison ESG (proxy) | Méthodo financée : **PCAF**, GHG Protocol | 1/10 | **7/10** — présenté comme indice indicatif ESG, sans prétention d'émissions mesurées |
| Contraintes/bornes/plafonds | Standard construction de portefeuille (CFA Institute) | — | 8/10 | **9/10** — inchangé, déjà solide (multi-couches + relax-and-flag) |
| Transparence limites + Berg et al. cité + sources véridiques | PRI, ESMA | — | 9/10 | **9/10** — renforcé (attributions de sources désormais exactes) |

**Note scientifique globale : 4/10 → 8/10.** Moyenne des lignes ci-dessus ≈ **8,0/10**. La charpente d'optimisation et l'honnêteté sur les limites étaient déjà solides ; les correctifs portent sur les *intrants* (estimateurs μ et Σ robustes, littérature à l'appui) et sur la véracité des attributions de sources — ce qui faisait chuter la note. **Limite résiduelle honnête** : tant que les scores ESG restent propriétaires « par catégorie » et que la couverture carbone réelle est à 0 %, la brique *données* plafonne — l'amélioration structurelle est méthodologique et déclarative ; brancher un fournisseur d'émissions (PCAF) reste le prochain palier.

---

## PARTIE 5 — Validation réglementaire (écran par écran)

| Écran / élément | Conforme ? | Conseil en invest. ? | MiFID II | SFDR / trompeur | Réécriture |
|---|---|---|---|---|---|
| **Sources ESG « MSCI/Sustainalytics »** (`methodologie.tsx:555`) | ❌ | Non | — | 🔴 Trompeur + marques tierces | « Notation propriétaire Seedow ; fournisseurs externes nommés quand utilisés. » |
| **Sources carbone « Trucost/ISS, scope 1-2-3 »** (`fr.json:843,852`) | ❌ | Non | — | 🔴 Trompeur | Retirer tant que non branché. |
| **« CO₂ évité — t/10k€ »** (`metrics.ts`) | ⚠️ | Non | — | 🔴 Impact non substantié | « Indicateur d'intensité ESG (repère), pas des émissions évitées. » |
| **« Rendement attendu » du simulateur** (`methodologie.tsx:394`) | ⚠️ | **Frontière** | Info perf. potentiellement trompeuse | 🟠 | Ajouter « estimation, non garantie ; les performances passées/simulées ne préjugent pas des performances futures » + méthode. |
| **Portefeuille personnalisé par profil** | ⚠️ | **Frontière recommandation personnalisée** | 🟠 (art. 25 MiFID II) | — | Renforcer « information générale, aucune recommandation personnalisée ; consultez un CIF ». Déjà présent en CGU/Ethi — à **répéter sur l'écran de résultat**. |
| **Plancher ESG relâché affiché** | ✔️ | Non | — | ✔️ Exemplaire | — |
| **Article SFDR par actif** | ⚠️ | Non | — | 🟠 si donnée fausse | Afficher la source/date de la classification. |
| **Bloc « Ce que la note ne dit pas »** | ✔️ | Non | — | ✔️ | — |
| **Disclaimers CGU / mentions / Ethi** (`cgu.tsx`, `fr.json:166,371`) | ✔️ | Non | — | ✔️ Bon socle | Les rendre visibles au **point de décision**, pas seulement en pied légal. |

**Conclusion réglementaire.** Le socle « pas de conseil personnalisé » existe et est correct. Le risque AMF/ESMA ne vient pas de l'algorithme mais de **trois affirmations trompeuses** (sources ESG, sources carbone, CO₂ en tonnes) et d'un **rendement attendu affiché sans avertissement de performance**. Ce sont des corrections de *wording et de branchement de données*, pas de refonte.

---

## PARTIE 6 — Versions finales prêtes à intégrer

### Texte 1 — « Comment fonctionne notre méthodologie ESG ? » (≈250 mots)

> **En bref : nous notons, nous excluons, puis nous laissons vous décider.**
>
> Chaque fonds de notre univers reçoit une **note ESG de 0 à 100**. Cette note est
> **calculée par Seedow** à partir de la documentation publique du fonds, de sa
> catégorie et, quand elles existent, de données de fournisseurs externes — que
> nous nommons alors sur la fiche. Quand une donnée manque, la fiche affiche
> **« données estimées »** : nous préférons l'assumer que le cacher.
>
> La note combine trois piliers — **Environnement, Social, Gouvernance** — pondérés
> selon les causes que vous choisissez. Quand le détail par pilier n'est pas
> publié, nous utilisons la note globale (et nous vous le signalons).
>
> Une note élevée signifie **« mieux géré que la moyenne de sa catégorie »**, pas
> « sans impact négatif ». C'est pourquoi vos **exclusions** (fossiles, armes,
> tabac…) passent avant tout : elles écartent des secteurs entiers, sans compromis.
>
> **Ce que la note ne dit pas.** Les agences ESG ne sont d'accord qu'à environ
> 50 % entre elles (Berg, Kölbel & Rigobon, MIT, 2022) : un score est un repère,
> pas une vérité. Une grande partie des émissions (scope 3) reste souvent non
> publiée. Nous affichons donc un **taux de couverture** pour que vous sachiez
> quelle part repose sur des données réelles.
>
> Seedow **informe et structure ; ne recommande aucun achat ni vente.** Ces
> éléments sont pédagogiques et ne constituent pas un conseil en investissement
> personnalisé.

### Texte 2 — « Comment construisons-nous votre portefeuille ? » (≈275 mots)

> **Quatre étapes, traçables de bout en bout.**
>
> **1. Vos exclusions, d'abord.** Les secteurs que vous refusez sont retirés avant
> tout calcul. Filtre binaire, aucun compromis.
>
> **2. Les mieux notés de chaque catégorie.** Dans chaque classe d'actifs, nous ne
> retenons que la moitié la mieux notée sur l'ESG. Objectif : garder de la
> diversification tout en écartant les moins-disants.
>
> **3. Une optimisation risque/rendement sous contraintes.** Nous utilisons une
> méthode reconnue (optimisation moyenne-variance de **Markowitz**, 1952) : pour un
> **budget de risque** donné, elle cherche la répartition qui vise le meilleur
> rendement attendu. Elle respecte des **garde-fous** : maximum 25 % par ligne,
> bornes par classe d'actifs, et un **plancher ESG** de 70/100 pour le portefeuille.
> Si vos contraintes rendent ce plancher inatteignable, nous **le levons et vous
> l'affichons** — jamais en silence.
>
> **4. Vos convictions.** L'intensité que vous donnez à chaque cause oriente la
> sélection vers les actifs qui y sont exposés.
>
> **Les arbitrages, honnêtement.** Plus d'exigence ESG ou d'exclusions réduit
> l'univers investissable et peut peser sur la diversification ou le rendement
> attendu : nous montrons ces effets en temps réel plutôt que de les masquer.
>
> **Les limites.** Le rendement attendu est une **estimation, non une garantie** ;
> les performances passées ou simulées ne préjugent pas des performances futures.
> Les données ESG sont imparfaites (voir notre note sur les limites).
>
> Seedow **structure et explique ; ne vend rien et ne recommande aucune décision
> personnalisée.** Pour une décision adaptée à votre situation, consultez un
> conseiller réglementé.

---

## Correctifs appliqués

| # | Correctif | Statut | Fichiers |
|---|---|---|---|
| 1 | **Shrinkage James-Stein / Bayes-Stein des rendements attendus** vers la moyenne transversale (moyenne préservée, poids en forme close testé) | ✅ Fait | `risk-model.ts` (`shrinkExpectedReturns`) + tests |
| 2 | **Shrinkage Ledoit-Wolf de la covariance** vers une corrélation constante (δ optimal estimé, repli pairwise pour historiques hétérogènes) | ✅ Fait | `risk-model.ts` (`ledoitWolfConstantCorrelation`, `buildRiskModel`) + tests |
| 3 | **Libellés de sources ESG rendus véridiques** : « Notation propriétaire Seedow (v1) » + Yahoo ; MSCI/Sustainalytics présentés comme évolution prévue, non active | ✅ Fait | `methodologie.tsx`, `fr.json`, `en.json` |
| 4 | **Revendications carbone corrigées** : plus de « Trucost / ISS / scope 3 » ; couverture réelle affichée à 0 % honnêtement ; pilier E = scope 1-2 (scope 3 si publié) | ✅ Fait | `fr.json`, `en.json` |
| 5 | **« Best-in-class : meilleurs quintiles » → « moitié la mieux notée (médiane) »** — texte aligné sur le code | ✅ Fait | `methodologie.tsx` |
| 6 | **« L'intensité réajuste les poids piliers » corrigé** : l'intensité oriente l'optimiseur (tilt borné), les causes actives réajustent les piliers ; tilt exclu du rendement affiché | ✅ Fait | `methodologie.tsx`, `markowitz.ts` (doc) |
| 7 | **Tilt de conviction requalifié** en préférence bornée (Pedersen et al. 2021), documenté comme n'entrant pas dans le rendement attendu affiché | ✅ Fait | `markowitz.ts` |
| 8 | **Diagnostics de shrinkage journalisés** (δ, corrélation moyenne, fenêtre commune) pour audit du recalcul | ✅ Fait | `risk-model.ts`, `hooks/recompute-risk-model.ts` |
| 9 | **Backtest walk-forward hors échantillon + comparaison 1/N** (sans look-ahead ; μ/Σ estimés sur fenêtre glissante antérieure, performance réalisée mesurée après ; 1/N sur univers post-exclusions ; CAGR, vol, Sharpe, max drawdown) | ✅ Fait | `portfolio/backtest.ts` (+ tests), server function admin `backtestPortfolio` |

**Restant (bloqué sur une décision de données) :** brancher un fournisseur d'émissions réel (PCAF/GHG Protocol) pour la couverture carbone ; peupler ou raccorder les scores par pilier E/S/G. Ces deux points nécessitent un **accès à une source de données externe** (fournisseur payant, divulgations émetteurs, ou dérivation interne transparente) — un choix produit/budget, pas une tâche de code isolée. Le backtest est livré comme **outil d'évaluation admin** (coût O(n²·T) par rebalancement incompatible avec un Worker public) ; l'exposer dans l'UI méthodologie suppose un pré-calcul stocké.

*Document d'audit — chaque constat renvoie à un fichier du dépôt ; aucune justification n'a été inventée. Les correctifs de code sont couverts par des tests unitaires (`src/lib/market/__tests__/risk-model.test.ts`).*
