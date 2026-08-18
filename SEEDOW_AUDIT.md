# Audit complet de Seedow

> Audit réalisé par lecture réelle du repo (`amirRbh/seedow`, branche `claude/seedow-complete-audit-9fxd67`).
> Chaque constat est rattaché à un fichier observé. Aucun fichier de code n'a été modifié.
> **Verdict global : 6,3 / 10** — une base technique et éditoriale largement au-dessus de la moyenne des projets à ce stade, plombée par un décalage entre l'ambition (moteur ESG/carbone de niveau institutionnel, 40 routes) et la réalité des données qui l'alimentent (quasi vide) et des moyens (équipe très limitée).

---

## 0. Ce que j'ai réellement observé (chiffres bruts)

| Élément | Constat | Source |
|---|---|---|
| Taille | 413 fichiers `src/`, 74 migrations SQL, 40 routes, 69 fichiers de test | `find`, `ls` |
| Univers d'actifs | ~135 ETF/fonds seedés à la main (wave1-4) | `*expand_universe*.sql` |
| Score ESG | **Un seul entier hardcodé par actif** (`esg_score`), source `'seedow-internal-v1'` | `20260721150000_expand_universe_wave3.sql` |
| Rendement/vol | `expected_return` (0.07) et `volatility` (0.30) **saisis à la main** par actif | idem |
| Moteur carbone | Méthodo PCAF/EVIC complète, 297 LOC + schéma SQL (issuer_emissions, sector_carbon_intensity, fund_holdings) | `src/lib/esg/carbon-engine.ts`, `20260817120000_carbon_estimation_engine.sql` |
| Données carbone | **Aucun seed** dans `issuer_emissions`, `sector_carbon_intensity`, `fund_holdings`, `securities` | `grep -i "insert into"` sur toutes les migrations |
| Data-engine | 2 950 LOC, connecteurs iShares/Amundi/Vanguard/MSCI/AMF-GECO | `src/lib/data-engine/` |
| Valorisation | 100 % déclarative (`initial_amount`), pas de dépôts, P&L dépend du cron Yahoo | `usePortfolioValuation.tsx:114` |
| Fichiers géants | `onboarding.tsx` 1550, `reglages.tsx` 1306, `methodologie.tsx` 1053, `index.tsx` 778 | `wc -l` |

**Le fait le plus important de tout cet audit :** Seedow a construit une **usine de crédibilité ESG de qualité institutionnelle** (cascade de qualité `measured > reported > estimated_company > estimated_sector > proxy > unavailable`, refus explicite d'inventer un chiffre, arrondi significatif anti-fausse-précision)… mais **cette usine tourne à vide**. Aucune émission d'émetteur, aucun benchmark sectoriel, aucun holding de fonds n'est chargé. Le seul signal ESG réellement affiché est un entier tapé à la main. C'est le paradoxe central du produit.

---

## 1. Audit global (technique de surface)

**Points forts réels :**
- Architecture propre, routing fichier cohérent, séparation `lib/` (métier pur, testé) vs `components/` respectée.
- **69 fichiers de test**, dont la logique financière (`markowitz`, `engine`, `metrics`, `backtest`) et carbone (`carbon-engine`, `sustainability-classification`). Discipline rare.
- Méthodo carbone honnête et défendable (voir §5).
- Sécurité : RLS activée systématiquement (ex. `issuer_emissions ENABLE ROW LEVEL SECURITY` visible dès la création), secrets via Vault, `has_role()`.

**Fragilités transverses :**
- **Sur-ingénierie du socle vs vide de données.** Le ratio « machinerie / données réelles » est inversé. On a codé le moteur avant d'avoir le carburant.
- **Fichiers monolithes** (`reglages.tsx` 1306 lignes, `onboarding.tsx` 1550) — viole la propre règle CLAUDE.md §3 « un composant par responsabilité ».
- **22 fichiers** contenant `TODO/FIXME/placeholder/à venir` — features partiellement livrées.
- **40 routes pour une équipe très limitée** : dispersion (voir §14).

---

## 2. Audit produit

**Proposition de valeur réelle aujourd'hui :** « Construis un portefeuille d'ETF filtré par tes convictions, et comprends ce que ton argent finance, avec un assistant qui n'a rien à te vendre. »

- **Immédiatement compréhensible ?** Partiellement. La promesse marketing (index.tsx) est forte, mais l'app livre surtout un **screener d'ETF + un score ESG opaque**. L'écart entre « ce que ton argent finance » (promesse) et « voici 135 ETF avec un score interne » (réalité) est le risque n°1 de déception.
- **Moment "aha" :** censé être `ImpactMoment` (dashboard) + `MirrorReveal`/`AgencyReveal` (onboarding). Mais `ImpactMoment` est **gaté** derrière `portfolio.metrics && impact` non nuls (`ImpactMoment.tsx:41`) — un nouvel utilisateur ou invité ne le voit pas. Le vrai aha vit dans la simulation d'onboarding, pas dans le produit.
- **Où l'utilisateur décroche :** (a) onboarding trop long (values → exclusions → objective → amount → reveals, 1550 LOC) ; (b) découverte d'un univers de 135 lignes toutes taguées « best-in-class MSCI » sans différenciateur perçu ; (c) score ESG sans explication → méfiance (cf. persona Thomas « seulement les chiffres vérifiables »).
- **Inutile / prématuré :** `wrapped`, `observatoire`, `reveil`/`le-fil`, `communaute` — features d'engagement construites avant que le cœur (données réelles) soit crédible.
- **Ce qui manque :** la traçabilité du score ESG jusqu'à la **composition réelle du fonds** (holdings). C'est promis par tout le schéma `fund_holdings` mais non alimenté.
- **Ce qui pourrait être bien plus puissant :** la feature **« Ton argent vote »** (résolutions d'AG, `vote.tsx` + `agm_resolutions` seedées) — c'est le seul truc que Trade Republic/Goodvest ne font pas. Sous-exploitée (route de 93 lignes).

### Top 5 améliorations produit
1. **Rendre le score ESG traçable et honnête** (du fonds → holdings → émetteurs) plutôt qu'un entier magique.
2. **Débloquer l'aha moment pour l'invité/nouveau** : montrer « ce que ton argent finance » AVANT d'avoir un portefeuille valorisé.
3. **Faire de "Ton argent vote" la signature produit** — c'est le différenciateur défendable.
4. **Alimenter au moins 20-30 fonds phares avec de vrais holdings + carbone** pour que le moteur existant cesse de tourner à vide.
5. **Élaguer** les features d'engagement prématurées pour concentrer l'équipe.

---

## 3. Audit UX/UI

- **Cohérence DA : excellente.** Tokens couleur/typo (Inter + IBM Plex Mono), sémantique mint/alert respectée, point pulsant « live » réutilisé (`ImpactMoment.tsx:62-65`). C'est le point le plus solide du produit.
- **Onboarding :** riche mais long. 4 questions + reveals + explainers de cours intégrés (`StepExplainer`). Risque de décrochage pour persona Inès (« décroche si c'est long »).
- **Empty/loading states :** présents (`EmptyPortfolioState`, `skeleton`, `GuestBanner`) — bon.
- **Nombre de clics / hiérarchie :** dashboard bien pensé (`ImpactMoment` en tête). Mais la nav porte 40 routes — surface cognitive lourde.
- **Feedback ESG reposant sur la couleur :** à vérifier vs CLAUDE.md §4 (jamais couleur seule) — les badges impact doivent doubler d'un label.

**Écrans à :**
- **Conserver :** dashboard, `ImpactMoment`, discover/AssetScreener, comparatif, certificat.
- **Simplifier :** `onboarding` (couper de moitié), `reglages` (1306 LOC → découper), `methodologie` (1053 LOC).
- **Fusionner :** `reveil` + `le-fil` + `observatoire` (trois surfaces de « feed/actualité » qui se recouvrent).
- **Supprimer/geler :** `wrapped` (gadget annuel prématuré).
- **Redesigner :** la page fonds (`fonds.$isin.tsx`) pour exposer la composition réelle une fois les holdings chargés.

---

## 4. Audit du "aha moment"

**Où il doit frapper :** juste après la sélection des convictions en onboarding, AVANT toute création de compte — « Voilà, concrètement, ce que ton argent arrête de financer et ce qu'il finance à la place ».

**État actuel :** l'aha est dispersé entre `MirrorReveal`/`AgencyReveal` (onboarding, 272+210 LOC) et `ImpactMoment` (dashboard, **gaté**). Il n'y a pas UN moment unique, visuel et mémorable. Le « wow » est intellectuel (des phrases) plutôt que visceral.

**Meilleur parcours proposé :**
1. Convictions choisies → **immédiatement** un écran plein : « Sur ton profil, un ETF Monde classique finance X € de fossiles / an. Ta version Seedow : 0 € sur ce critère, et Y € vers [tes 3 convictions]. »
2. Rendre ce moment : **plus visuel** (une seule grande comparaison avant/après, pas un tableau) ; **plus émotionnel** (nommer les entreprises concrètes exclues/financées, via les holdings réels) ; **plus crédible** (source + date attribuées à l'écran, cf. §1.2 CLAUDE.md) ; **plus mémorable** (un chiffre unique, arrondi honnêtement — le moteur `roundSignificant` existe déjà).

Le blocage n°1 pour rendre l'aha crédible = **les holdings réels ne sont pas chargés**. Sans eux, on ne peut nommer aucune entreprise, donc l'aha reste abstrait.

---

## 5. Audit ESG / Impact

**La méthodologie est bonne. Les données ne suivent pas.**

| # | Problème | Pourquoi c'est grave | Meilleure méthode | Gratuit ? | Complexité |
|---|---|---|---|---|---|
| E1 | **`esg_score` = 1 entier hardcodé/actif**, source `seedow-internal-v1` | Pile le « score arbitraire / faux niveau de précision » redouté. Persona Thomas ne fait confiance qu'aux chiffres vérifiables → défiance immédiate | Décomposer : afficher les **sous-signaux réels** (SFDR article, exclusions respectées, intensité carbone estimée avec sa couverture) plutôt qu'une note synthétique inexpliquée. Si note il y a, publier la formule | Oui | Moyenne |
| E2 | **Moteur carbone non alimenté** : `issuer_emissions`/`sector_carbon_intensity`/`fund_holdings` vides | Tout affiche « données indisponibles » → le meilleur atout du produit est invisible | Charger (a) holdings des 20-30 ETF phares (déjà : connecteur `ishares.ts`, `amundi.ts`), (b) un jeu de benchmarks sectoriels ADEME/EXIOBASE, (c) émissions des plus gros émetteurs (CDP/rapports) | Partiellement (holdings iShares gratuits ; émissions manuelles au début) | Élevée |
| E3 | **Pas de traçabilité fonds→holding→émetteur affichée** | La promesse « chaque chiffre sourcé à l'écran » (§1.2) n'est pas tenue tant que la chaîne n'est pas visible | Le moteur `resolveHoldingCarbon` produit déjà `methodology` par ligne — l'exposer dans `fonds.$isin.tsx` | Oui (déjà codé) | Faible |
| E4 | **« N entreprises financées » = nombre de fonds, pas d'entreprises** (`ImpactMoment.tsx:89`, `holdings.length`) | Sur-promesse involontaire : un ETF n'est pas une entreprise. Viole §1.3 | Compter les émetteurs sous-jacents uniques via `fund_holdings` (une fois chargés), sinon dire « N fonds » | Oui | Faible |

**Ce qui est déjà exemplaire (à garder tel quel) :** le refus de fondre scope 3 dans scope 1+2, le palier `unavailable` qui contribue 0 au lieu d'inventer, `roundSignificant` contre la fausse précision, la distinction `coverage` vs `sourcedCoverage`. C'est du travail de pro — il ne lui manque que des données.

---

## 6. Audit data

**Chaîne : Source → ingestion → normalisation → stockage → calcul → affichage.**

Le **calcul** et le **stockage** (schéma) sont surdimensionnés ; la **source** et l'**ingestion réelle** sont le maillon faible.

**Top 3 problèmes data :**
1. **Données calculées mais jamais produites** — tout le pipeline carbone (`carbon-engine.ts`, `carbon-estimate.server.ts`, migration `carbon_estimation_engine`) existe sans une ligne de donnée en entrée. Data disponible dans le code (connecteurs) mais **non exploitée** faute d'exécution/seed.
2. **Valorisation fragile** — dépend du cron Yahoo (`refresh-market-data`) ; en environnement frais, `asset_prices` est vide → P&L/valorisation nuls, seul `initial_amount` déclaratif reste. Aucun fallback affiché clairement à l'utilisateur au-delà de `MarketFreshnessBanner`.
3. **ESG mono-source manuelle** — pas d'ISIN systématique reliant `assets` ↔ `fund_holdings` ↔ `securities`, donc pas de jointure possible même si on chargeait les holdings. Le mapping ISIN est le prérequis oublié.

---

## 7. Audit technique

- **Architecture :** saine, pas de refactor massif justifié. Tests solides.
- **Dette réelle qui ralentira le dev :** (a) monolithes `reglages.tsx`/`onboarding.tsx` — toute évolution y est coûteuse ; (b) 40 routes à maintenir avec équipe réduite ; (c) couplage fort du produit à des données qui n'existent pas → chaque écran « impact » doit gérer le cas vide, ce qui multiplie la complexité conditionnelle.
- **Ce qui risque de casser :** le cron Yahoo (source non contractuelle, rate-limit) est le SPOF de toute la valorisation. Prévoir dégradation gracieuse + source de repli.
- **Sécurité :** bon niveau (RLS, Vault, `has_role`). Rien de bloquant observé. Vérifier le rate-limit Ethi (`ethi_rate_limits` existe).
- **Ne PAS faire :** de refactor d'architecture. Elle est correcte.

---

## 8. Audit business

- **Activation :** freinée par l'aha gaté + onboarding long.
- **Rétention :** les features d'engagement (vote, reveil, wrapped) visent la rétention mais arrivent trop tôt.
- **Monétisation réaliste avec peu de capital :** Seedow n'exécute pas d'ordres (montant déclaratif) → pas de courtage. Modèles viables :
  1. **Freemium données/transparence** : accès gratuit au screener, abonnement pour le suivi impact avancé + alertes greenwashing + certificat.
  2. **B2B / lead-gen vers un courtier partenaire** : `real_investment_intents` existe déjà en base → Seedow qualifie l'intention et route vers un partenaire (affiliation). **Le plus réaliste sans capital.**
  3. **B2B2C / API ESG** : le moteur carbone, une fois alimenté, est vendable à des CGP.
- **Trop coûteux/irréaliste maintenant :** devenir courtier, couverture ESG exhaustive multi-milliers de fonds.

---

## 9. Concurrence / différenciation

| Concurrent | Ce qu'il fait mieux | Faille que Seedow peut exploiter |
|---|---|---|
| Trade Republic / Scalable | exécution, coût, largeur | zéro pédagogie d'impact, boîte noire ESG |
| Goodvest / Yomoni / Nalo | gestion pilotée ESG réelle, exécution | opacité méthodo, pas d'engagement actionnarial |
| Revolut | tout-en-un | ESG cosmétique |

**Pourquoi choisir Seedow :** pour **comprendre et agir**, pas seulement placer. Deux différenciateurs défendables, tous deux déjà amorcés dans le code :
1. **Transparence radicale de la méthode carbone** (la cascade de qualité est un argument unique — aucun néobroker ne montre « 62 % sourcé, 38 % estimé secteur »).
2. **« Ton argent vote »** (résolutions d'AG) — engagement actionnarial grand public, quasi inexistant chez les concurrents.

Le différenciateur n'est PAS la sélection de fonds (tout le monde a du MSCI SRI). C'est **la preuve + l'agir**.

---

## 10. Audit mobile-first

- Base responsive présente (`use-mobile.tsx`, `BottomNavigation.tsx`), Tailwind mobile-first.
- **Risques :** densité d'info sur `methodologie`/`reglages` (pages fleuves) en mobile ; 40 routes → nav secondaire lourde. La `BottomNavigation` doit se limiter à 4-5 entrées cœur (Dashboard, Découvrir, Portefeuille, Ethi, +1).
- **Recommandation nav :** réduire à 5 destinations principales, reléguer vote/communauté/cours dans un « Plus » ou dans le dashboard contextuel.

---

## 11. Priorisation (score = Impact × 2 − Effort, sur 20)

| P | Problème | Solution | Impact U | Impact B | Effort | Score |
|---|---|---|---|---|---|---|
| 🔴 P0 | Score ESG opaque (E1) | Éclater en sous-signaux réels + sourcés | 9 | 8 | 3 | **15** |
| 🔴 P0 | Aha gaté / abstrait (§4) | Écran comparaison avant/après en onboarding, sans compte | 9 | 9 | 4 | **14** |
| 🔴 P0 | « N entreprises » faux (E4) | Corriger le libellé (fonds vs entreprises) | 6 | 5 | 1 | **11** |
| 🟠 P1 | Moteur carbone à vide (E2) | Charger holdings+carbone de 20-30 fonds phares | 9 | 8 | 8 | **10** |
| 🟠 P1 | Valorisation SPOF Yahoo | Dégradation gracieuse + repli | 6 | 6 | 3 | **9** |
| 🟠 P1 | Traçabilité non affichée (E3) | Exposer `methodology` par holding | 7 | 7 | 2 | **12** |
| 🟠 P1 | Vote sous-exploité | Étoffer « Ton argent vote » en feature signature | 7 | 8 | 5 | **9** |
| 🟡 P2 | Onboarding trop long | Couper à l'essentiel, différer les explainers | 6 | 5 | 3 | **9** |
| 🟡 P2 | Monolithes reglages/onboarding | Découper | 3 | 2 | 4 | **2** |
| 🟢 P3 | Feeds redondants (reveil/le-fil/observatoire) | Fusionner ou geler | 3 | 3 | 3 | **3** |

---

## 12. TOP 10 des améliorations à faire

1. **Rendre le score ESG honnête et traçable**
   Problème : entier hardcodé opaque (`seedow-internal-v1`). Important : c'est le cœur de la crédibilité et le risque greenwashing n°1. Solution : afficher SFDR + exclusions respectées + intensité carbone estimée (avec couverture %) au lieu d'une note nue ; si note, publier la formule. Impact : élevé (confiance). Effort : moyen. Fichiers : `discover/AssetScreener.tsx`, `discover/AssetDetailSheet.tsx`, `fonds.$isin.tsx`, `lib/esg/`. Dépend de : rien (peut se faire avec les champs existants).

2. **Un aha moment unique, visuel, avant compte**
   Problème : aha dispersé/gaté. Solution : après les convictions, un écran plein « avant/après » (ETF Monde vs ta version) avec 1 chiffre honnête. Impact : très élevé (activation). Effort : moyen. Fichiers : `onboarding.tsx`, `components/onboarding/MirrorReveal.tsx`, `lib/impact/`. Dépend de : E4 corrigé, idéalement holdings réels.

3. **Corriger « N entreprises financées »**
   Problème : compte des fonds, pas des entreprises (§1.3). Solution : libellé « N fonds » tant que les holdings ne sont pas chargés. Impact : moyen (honnêteté). Effort : très faible. Fichiers : `ImpactMoment.tsx:89`, i18n.

4. **Alimenter 20-30 fonds phares (holdings + carbone)**
   Problème : moteur carbone à vide. Solution : exécuter/seed les connecteurs iShares/Amundi pour les holdings, seed benchmarks sectoriels + émissions des top émetteurs. Impact : élevé. Effort : élevé. Fichiers : `lib/data-engine/connectors/`, `scripts/ingest-*.ts`, migration seed. Dépend de : mapping ISIN.

5. **Afficher la traçabilité carbone déjà calculée**
   Problème : `methodology` par holding produit mais non montré. Solution : l'exposer dans la page fonds. Impact : élevé (différenciation transparence). Effort : faible. Fichiers : `fonds.$isin.tsx`, `carbon-engine.ts` (déjà prêt).

6. **Sécuriser la valorisation (repli Yahoo)**
   Problème : SPOF cron. Solution : dernier prix connu + bannière d'âge de la donnée + désactivation gracieuse du P&L si trop vieux. Impact : moyen. Effort : faible. Fichiers : `usePortfolioValuation.tsx`, `MarketFreshnessBanner.tsx`, `lib/market/`.

7. **Faire de "Ton argent vote" la signature**
   Problème : différenciateur unique sous-développé. Solution : étoffer résolutions, expliquer l'impact, pousser en dashboard. Impact : élevé (rétention + différenciation). Effort : moyen. Fichiers : `vote.tsx`, `components/vote/`, `agm_resolutions`.

8. **Raccourcir l'onboarding**
   Problème : 1550 LOC, décrochage. Solution : 3 étapes cœur, explainers différés post-inscription. Impact : moyen. Effort : moyen. Fichiers : `onboarding.tsx`.

9. **Mapping ISIN systématique**
   Problème : pas de clé de jointure fonds↔holdings↔émetteurs. Solution : imposer/renseigner l'ISIN sur `assets`, l'utiliser partout. Impact : moyen (débloque #4). Effort : moyen. Fichiers : migration `assets`, `lib/data-engine/isin.ts` (déjà présent).

10. **Élaguer les feeds redondants**
    Problème : reveil/le-fil/observatoire/wrapped dispersent l'équipe. Solution : geler wrapped, fusionner les feeds. Impact : moyen (focus). Effort : faible. Fichiers : routes concernées.

---

## 13. Roadmap 30 jours

**Semaine 1 — Quick wins + honnêteté (crédibilité immédiate)**
- Corriger « N entreprises » → « N fonds » (#3).
- Exposer la `methodology` carbone déjà calculée sur `fonds.$isin.tsx` (#5).
- Éclater le score ESG en sous-signaux sourcés (#1, phase 1 : afficher SFDR + exclusions + couverture).
- Repli de valorisation + bannière d'âge (#6).
- Geler `wrapped`, décision fusion feeds (#10).

**Semaine 2 — UX + onboarding + aha**
- Écran aha « avant/après » unique, avant compte (#2).
- Raccourcir l'onboarding à 3 étapes (#8).
- Débloquer `ImpactMoment` pour l'invité (version dégradée sans metrics).

**Semaine 3 — Data + méthodologie + crédibilité**
- Mapping ISIN sur `assets` (#9).
- Charger holdings + carbone de 20-30 fonds phares via connecteurs existants (#4).
- Faire remonter la vraie chaîne fonds→holdings→carbone dans l'UI.

**Semaine 4 — Différenciation + polish + conversion**
- Étoffer « Ton argent vote » et le pousser au dashboard (#7).
- Découper `reglages.tsx`/`onboarding.tsx` (dette, #P2).
- Instrumenter le funnel d'activation (`app_events` existe) pour mesurer l'aha.
- Passer le tunnel de conversion vers `real_investment_intents` (piste business #2).

---

## 14. NE PAS FAIRE

- ❌ **Refactor d'architecture massif** — elle est saine, ce serait du temps volé aux données.
- ❌ **`wrapped` (rétro annuelle)** — gadget d'engagement prématuré sans base d'utilisateurs.
- ❌ **Multiplier l'univers de fonds** (viser 500+) — mieux vaut 30 fonds vraiment documentés que 300 avec un score magique.
- ❌ **Une note ESG synthétique « propriétaire » unique** — c'est précisément ce qui déclenche l'accusation de greenwashing. Montrer les composantes, pas une boîte noire.
- ❌ **Devenir courtier / exécution d'ordres** — hors de portée avec peu de capital.
- ❌ **Trois surfaces de feed** (reveil + le-fil + observatoire) — complexité pour rien tant que le cœur n'est pas crédible.
- ❌ **Ajouter des dépendances lourdes** (limite bundle Edge Cloudflare, cf. CLAUDE.md §8).

---

## 15. Verdict final

### Seedow aujourd'hui : **6,3 / 10**

| Dimension | Note | Commentaire |
|---|---|---|
| Produit | 6 | Vision claire, exécution en avance sur les données |
| UX | 6,5 | Bonne, mais onboarding long et aha gaté |
| UI | 8,5 | DA remarquable, cohérente, éditoriale |
| Data | 3,5 | Machinerie superbe, réservoir vide |
| ESG | 6 | Méthodo excellente (8), données inexistantes (3) |
| Technique | 7,5 | Propre, testé, sécurisé ; monolithes à surveiller |
| Business | 5 | Monétisation floue mais piste affiliation crédible |
| Différenciation | 7 | Transparence + vote = défendables, sous-exploités |
| Crédibilité | 5,5 | Sabotée par le score opaque et le carbone vide |

### Les 5 réponses directes

1. **Le plus gros problème ?** Le décalage entre une machinerie ESG/carbone de niveau institutionnel et l'absence quasi totale de données qui l'alimentent. Seedow *ressemble* à un produit de transparence mais n'a, à l'écran, qu'un score inventé à la main.

2. **La meilleure amélioration immédiate ?** Éclater le score ESG opaque en sous-signaux réels et sourcés (SFDR, exclusions, couverture carbone) — transforme la faiblesse de crédibilité en force, sans nouvelle donnée.

3. **Le plus gros potentiel inexploité ?** « Ton argent vote » (engagement actionnarial) : personne d'autre ne le fait pour le grand public, et c'est déjà amorcé en base.

4. **À supprimer/simplifier ?** Les feeds redondants (reveil/le-fil/observatoire), `wrapped`, et les routes monolithes. Concentrer l'équipe réduite sur le cœur.

5. **Si j'avais 30 jours ?** Semaine 1 : honnêteté immédiate (score éclaté + traçabilité affichée + libellés corrigés). Semaine 2 : un aha « avant/après » unique avant inscription. Semaine 3 : charger pour de vrai 20-30 fonds (holdings + carbone) pour que le moteur cesse de tourner à vide. Semaine 4 : ériger « Ton argent vote » en signature et brancher le tunnel vers `real_investment_intents`. En un mois, Seedow passe de « belle promesse à vide » à « preuve concrète sur un univers restreint mais irréprochable » — exactement la posture de ses personas (Thomas, Karim).

---
_Audit statique du repo — aucun fichier de code modifié. Recommandations rattachées aux fichiers observés ci-dessus._
