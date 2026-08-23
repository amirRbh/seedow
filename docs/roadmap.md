# Roadmap Seedow — état & suite

> Doc vivant. Ancré sur l'état **réel** du repo au terme de l'intégration Adanos.
> Prime sur les colonnes « Next/Later » du CLAUDE.md §7 (qu'il synthétise et
> remplace). À tenir à jour à chaque décision structurante.
>
> Règle de lecture : une ligne n'est « Fait » que si elle est **mergée + vérifiée**
> (CI verte, comportement prouvé). Le reste est explicitement non engagé.

## 0. Rappel des non-négociables (ne pas contourner en avançant)

- **`is_active=false` par défaut** sur tout actif non enrichi ; aucun fonds non noté
  (`esg_score=0`) exposé dans Découvrir ni vu par l'optimiseur.
- **On n'invente jamais** : champ absent → `null`, valeur non sourcée → non écrite.
- **RLS** sur toute table utilisateur ; **secrets** jamais en clair.
- **Sources primaires visibles** ; un agrégateur n'est pas une source primaire.

---

## 1. Fait (mergé + vérifié)

### Socle méthodo & moteur (sessions précédentes)

- Audit du cœur méthodologique (`docs/methodologie-v2.md`).
- NOW roadmap N1–N5 (dont métriques ESG sourcées, qualification univers N4).
- Pipeline d'ingestion N2 (GECO/KID, `scripts/ingest-funds.ts`, backlog priorisé).
- Risk-parity ERC (`lib/portfolio/riskparity.ts`), overlap, onboarding.
- CI durcie (build→typecheck→lint→format 3.8.2→tests), verte sur `main`.

### Intégration Adanos (cette session — 11 PR, #141→#151)

- **Import catalogue** : `catalog_instruments` peuplée — **61 692 instruments**
  (16 530 ETF / 45 162 actions), refresh hebdo GitHub-native.
- **Promotion moteur** : **10 789 ETF** insérés dans `assets`, tous `is_active=false`
  (dormants, tracés `catalog_listing_key`).
- **Enrichissement — maillon 1 (cours)** : **300 ETF UCITS** wirés d'un `yahoo_symbol`
  validé → collecte horaire de cours amorcée.
- **Enrichissement — maillon 2 (identité)** : **285 ETF** complétés (issuer/region)
  dérivés du nom, sans invention.
- **🔒 Gate ESG anti-flood** (`activation.ts`) : un ETF catalogue ne s'active jamais
  sur la seule tradeabilité sans ESG sourcé.
- **Cadrage source ESG/SFDR** (`docs/esg-sources.md`) : Yahoo écarté (probe 0/80),
  KID primaires bloqués réseau, extraETF gated par ToS → **conclusion : nécessite un
  flux licencié**. Rien n'est bâti sur une source illicite.

### Bascule « pool plutôt qu'allocation » — alignement de la machinerie

Suite de #170→#173 (le moteur ne propose plus de poids). Les maillons qui
parlaient encore l'ancien modèle ont été repris :

- **Le questionnaire ne jette plus ses réponses.** Le montant saisi et le couple
  risque/horizon dérivé de l'objectif traversent le passe-plat `poolHandoff`
  jusqu'à `createCustomPortfolio` — qui écrivait jusque-là `100 €, 9 %, 10 ans`
  en dur. « Mon argent » sur Le Fil part donc du montant réel de l'utilisateur
  (§1.3 : aucun chiffre fabriqué).
- **`/le-fil` n'est plus un cul-de-sac.** Un compte sans portefeuille y déroulait
  quatre nœuds à zéro, sans issue ; il reçoit l'entrée à deux intentions déjà
  utilisée par `/portfolio` (questionnaire ou page blanche).
- **`/reglages` n'écrase plus la composition.** Bouger un curseur relançait
  l'optimiseur (`generatePortfolio`) et remplaçait le portefeuille composé à la
  main 700 ms plus tard. Remplacé par `savePortfolioPreferences` : préférences
  enregistrées, poids existants re-mesurés (jamais réécrits), aperçu = pool
  reclassé, recomposition explicite via `/construire`.
- **Copie produit** : landing, état vide, réglages et méthodologie ne promettent
  plus « Seedow construit l'allocation correspondante ».
- **Code mort retiré** : `PostSimulationFork`, `MirrorReveal`, phases
  `building`/`saving`.

### `/methodologie` — la page publie enfin la méthode qui tourne

Le simulateur appelait encore `simulatePortfolio` (Markowitz) et affichait une
allocation pondérée ; le pipeline publié décrivait un best-in-class, un plancher
ESG à 70 et des tilts d'optimiseur — trois mécanismes qui ne s'appliquent plus à
aucun portefeuille utilisateur. Repris :

- Simulateur = `screenAssetPool` : entonnoir (univers → écartés → retenus), pool
  classé par pertinence avec ESG, frais et fiabilité de la donnée, répartition du
  pool par classe **en nombre de fonds** (il n'y a plus de poids à montrer).
- **Curseurs supprimés** : budget de risque, horizon et intensité de cause
  n'entrent dans aucune formule de `screenPool` — les afficher faisait bouger une
  aiguille immobile. Le contrat de `screenPool` est désormais `ScreeningParams`
  (causes + exclusions), pour que le code dise la même chose que l'écran.
- Les cinq étapes publiées et le bloc « comment la note est construite »
  décrivent le vrai chemin ; les mesures de portefeuille sont annoncées pour ce
  qu'elles sont — calculées sur ce que l'utilisateur a composé.

**Tranché — l'intensité de cause disparaît de l'interface.** Elle était
collectée, stockée et réglable, mais n'était plus lue que par le chemin
optimiseur (mort) : un curseur sans effet. Décision produit : le classement ne
connaît que la PRÉSENCE d'une conviction, pas un dosage. Le curseur est retiré de
`/reglages`, l'intensité n'est plus transportée par le passe-plat ni écrite à la
création d'un portefeuille. La colonne `cause_intensity` reste en base — les
portefeuilles antérieurs gardent leur valeur, plus personne n'en écrit de
nouvelle. `PortfolioParams.cause_intensity` subsiste pour le moteur conservé.

**Tranché — la surface optimiseur reste exportée.** `generatePortfolio`
(+ `persistPortfolio`), `simulatePortfolio` et `rebalancePortfolio` sont
conservées volontairement : le moteur Markowitz garde sa valeur d'évaluation
(backtest, comparaison au 1/N). Aucun chemin produit ne les appelle ; la contre-
partie assumée est qu'un appel à `generatePortfolio` écrirait une allocation
par-dessus une composition.

**Surface restée en place, à trancher aussi** — plus aucun appelant côté produit,
mais toujours exportées : `generatePortfolio` (+ `persistPortfolio`, couverte par
`persist.test.ts`) écrit une allocation optimisée par-dessus le portefeuille
actif, et `simulatePortfolio` en calcule une sans la persister (son dernier
appelant était le simulateur). `rebalancePortfolio` garde un appelant,
`EthiBriefing`, mais dans le Dashboard authentifié devenu inatteignable. Ce n'est
pas une faille (RLS : chacun n'atteint que ses données), c'est une porte de
l'ancien modèle restée ouverte. La supprimer, c'est renoncer au chemin optimiseur
persistant ; la garder, c'est accepter qu'il puisse écraser une composition.

---

---

## 2. NOW — prêt côté ingénierie, aucun blocage externe

À prendre dans l'ordre de valeur ; chaque item est faisable sans dépendance tierce.

1. **Étendre le wiring cours** au-delà des 300 : wirer les ETF UCITS restants
   (mécanisme `wire-yahoo-symbols` déjà en place, borné) pour accumuler des cours
   sur un univers plus large — le socle de toute activation future.
2. **Étendre l'identité** (`ENRICH_ALL=1`) à l'ensemble des promus, pas seulement
   les wirés.
3. **Curer les non-mappés** : classifier les **3 086 Fixed Income** (souverain /
   corporate / green / social) pour les rendre promouvables — aujourd'hui non promus
   faute de clivage fiable. Chantier « une sous-catégorie à la fois », sourcé.
4. **Dashboard qualité données catalogue** (interne) : exposer les compteurs
   `cron_run_log` (imports, promotions, wiring, identité) — visibilité opérationnelle
   sur l'avancement de l'enrichissement.

## 3. NEXT — dépend d'une décision de source ou d'un pré-requis

- **Décision source ESG/SFDR** _(bloquant produit)_ : souscrire un flux licencié par
  ISIN. **Dès qu'il existe**, brancher l'ingestion ESG → l'activation automatique se
  déclenche seule (cours + identité + ESG réunis, gate levé). Le pipeline est prêt.
- **Correction `equity_dev`/`equity_em`** : Adanos ne distingue pas dev/em au niveau
  catégorie ; corriger le clivage à l'enrichissement (source d'exposition réelle).
- **Promotion des classes déjà mappées non encore wirées** : Real Estate (`reit`),
  Commodity, Money Market — même chemin que les equity.

## 4. LATER — produit & passage à l'échelle

- **Univers mondial réellement investissable** : activation à l'échelle une fois la
  source ESG en place — faire monter Découvrir de 112 vers des centaines de fonds
  **tous sourcés**.
- **Monitoring de dérive catalogue** : exploiter `is_present_in_latest` pour repérer
  les retraits Adanos (fonds fermés) sans supprimer l'historique.
- **Actions (stocks)** : le catalogue les porte (45 162), mais elles ne sont **pas**
  promues dans le moteur de fonds — réservé à un éventuel produit actions distinct.
- **Cross-listing / multi-devises** : gestion fine si on promeut des cotations
  secondaires (aujourd'hui exclues à la source par Adanos).

---

## 5. Definition of Done (rappel avant chaque PR)

Lint + format 3.8.2 + typecheck + tests (nouvelle logique `lib/` couverte) + build ;
RLS testée sur toute table touchée ; aucun secret en clair ; DA respectée ;
conformité Ethi si concerné (§8 CLAUDE.md). Un actif issu du catalogue reste
`is_active=false` tant que cours **et** identité **et** ESG sourcé ne sont pas réunis.

_Dernière mise à jour : clôture de l'intégration Adanos (import → promotion →
enrichissement cours/identité → gate ESG → cadrage source ESG)._
