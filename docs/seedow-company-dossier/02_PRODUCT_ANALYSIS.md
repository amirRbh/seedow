# 02 — Product Analysis (Product Due Diligence)

## 1.1 Positionnement

- **Qu'est-ce que Seedow ?** Un constructeur de portefeuille responsable, piloté par convictions, avec pédagogie intégrée (Ethi + Cours) et transparence de la donnée ESG. **Simulation aujourd'hui, pas exécution** (voir `01`). *(FACT)*
- **Quel problème ?** L'investisseur retail veut aligner son argent avec ses valeurs mais (a) ne comprend pas les produits (statistique produit CLAUDE.md : 93 % connaissent le Bitcoin, 17 % savent comment il marche), (b) ne fait plus confiance aux labels verts (greenwashing), (c) ne sait pas traduire une conviction en allocation concrète. *(HYPOTHÈSE de problème, cohérente avec personas §2 CLAUDE.md ; à valider par interviews.)*
- **Pour qui ?** Léa (débutante engagée, 27), Karim (épargnant désabusé, 34), Inès (pressée méfiante, 31), Thomas (sceptique greenwashing, 40). *(FACT : personas documentés.)* Cœur de cible réel probable : **25-40 ans, premier capital, sensibilité ESG, francophone.** *(ESTIMATION.)*
- **Pourquoi maintenant ?** Poussée retail post-2020 (AMF : 780 000 nouveaux investisseurs en France en 2025, +83 % de transactions ETF), maturité de la donnée ESG, défiance envers les banques, IA conversationnelle abordable. *(FACT externe — voir `04`/`20`.)*
- **Proposition de valeur.** « Ton argent, aligné avec tes convictions — chaque choix expliqué, chaque chiffre sourcé, rien à vendre. » *(FACT : signature + non-négociables CLAUDE.md.)*
- **Avantage potentiel.** La combinaison **conviction → allocation optimisée (Markowitz) → transparence donnée (coverage + greenwashing) → pédagogie (Ethi) → engagement actionnarial (Vote)**, sans conflit d'intérêt commercial. *(interprétation.)*
- **Fonctionnalité centrale.** Le moteur de construction de portefeuille (`lib/portfolio/engine.ts`) + Le Fil comme surface de restitution. *(FACT.)*
- **Promesse utilisateur.** Comprendre et posséder ses choix, sans jargon ni conseil déguisé. *(FACT.)*

## 1.2 User Journey (reconstitué depuis les routes)

`index` (landing, sélecteur « Que veux-tu faire ? ») → `onboarding` (questionnaire convictions/exclusions/risque/horizon → **simulation** de portefeuille) → `auth`/`waitlist` (compte, cap bêta) → **`le-fil`** (accueil narratif post-auth) → `portfolio` / `discover` / `comparatif` / `certificat` / `objectifs` / `vote` / `cours` → capture `real_investment_intents` (« investir pour de vrai » = formulaire d'intention). *(FACT : ordre déduit des redirections post-auth, commits #81, #4a5ff33.)*

**Moments de valeur** *(HYPOTHÈSE)* : (1) la simulation instantanée en onboarding (« un portefeuille en 2 min »), (2) le certificat/impact partageable, (3) une réponse d'Ethi qui démystifie un terme, (4) voter sur une résolution d'AG (agentivité).

**Frictions / risques d'abandon** *(HYPOTHÈSE, à instrumenter)* :
- **Le mur de l'intention.** Le parcours culmine sur un formulaire d'intention, pas une action réelle → déception potentielle (« et maintenant ? »). C'est le trou noir du funnel.
- **Onboarding conviction** : trop de dimensions (6 causes × intensité + 6 exclusions + risque + horizon) peut surcharger Inès/Léa. À mesurer (drop-off par étape).
- **« esg_floor_relaxed »** : quand le plancher ESG (70) est relâché faute d'univers, l'app l'affiche (commit #99, transparence honnête) — bon pour la confiance, mais peut désorienter le débutant.
- **Cap bêta + liste d'attente** : friction d'accès assumée ; risque de perdre l'élan d'acquisition.

## 1.3 Inventaire des fonctionnalités

| Fonctionnalité | État | Valeur utilisateur | Importance | Problèmes |
|---|---|---|---|---|
| Moteur portefeuille (Markowitz + ESG) | Fait | Élevée | **Core** | Univers ~58 actifs (étroit) ; μ/vol = seeds, pas estimés live (voir `11`) |
| Le Fil (accueil narratif) | Fait | Élevée | **Core** | Nouveau (2.0) ; efficacité non mesurée |
| Onboarding / simulation | Fait | Élevée | **Core** | Surcharge cognitive potentielle |
| Ethi (chat pédagogique) | Fait | Élevée | **Core** | Coût variable IA ; qualité non instrumentée |
| Découvrir | Fait | Moyenne | Important | Univers étroit limite l'exploration |
| Comparatif vs MSCI World | Fait | Élevée | Important | Puissant argument de confiance |
| Transparence ESG / greenwashing | Fait | Élevée | **Core différenciant** | Heuristique dépend de SFDR (révision 2.0 en cours — `04`/`19`) |
| Certificat d'impact partageable | Fait | Moyenne | Important | Levier d'acquisition (#100) |
| Ton Argent Vote + Wrapped | Fait | Moyenne-Élevée | Différenciant (pari) | Données AG à curer manuellement ; scalabilité éditoriale |
| Objectifs financiers | Fait | Moyenne | Secondaire | |
| Cours (12 modules) | Fait | Moyenne | Important (SEO/pédago) | Coût de maintenance contenu |
| Communauté (partage portefeuille) | Fait | Faible-Moyenne | Secondaire | Effet réseau non prouvé |
| Data-engine (iShares holdings) | Fait (fondations) | Interne | Important (moat data) | 1 connecteur ; ampleur limitée |
| Serveur MCP | Fait | Faible (aujourd'hui) | Nice-to-have | Pari plateforme/agents ; ROI incertain à ce stade |
| Réveil / Construire | Fait | À qualifier | Nice-to-have | Périmètre à clarifier |
| **Exécution réelle (courtage/custody)** | **Absent** | **Manquant** | **Bloquant business** | Voir `07`, `12`, `14` |

**Verdict produit.** Ampleur fonctionnelle **impressionnante pour un stade pré-revenu** — c'est à la fois une force (vision claire, exécution rapide via Lovable) et un **risque de dispersion** : Vote, MCP, Wrapped, Communauté, Réveil sont autant de paris ouverts avant d'avoir prouvé l'activation du cœur (conviction → portefeuille → rétention). Voir `17` (Top 10 à NE PAS faire).
