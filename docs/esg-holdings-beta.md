# Données ESG & holdings pour la bêta — décision de source

> **Question posée** : quel est le meilleur moyen d'obtenir gratuitement les
> données ESG et les compositions de fonds (holdings) pour la bêta ?
>
> **Réponse courte** : le blocage n'était pas là où les cadrages précédents le
> plaçaient. Le verrou **technique** sur les holdings est levé (mesuré, cf. §2).
> Le verrou **restant est contractuel**, pas technique (§3). Et sur l'ESG, la
> bonne stratégie n'est pas d'acheter une notation de fonds — c'est de la
> **calculer par transparisation** à partir de sources primaires gratuites (§4).
>
> Document de décision. Mesures datées, reproductibles, aucune donnée devinée (§1.3).

---

## 1. Pourquoi les cadrages précédents concluaient « impossible »

`docs/esg-sources.md` accumule 5 probes et se termine sur : « la voie HTTP simple
est **épuisée** pour iShares », avec pour seule issue un navigateur sans tête ou
un flux EET licencié. Cette conclusion était **juste sur l'endpoint testé et
fausse sur la source** :

- Les probes #1–#5 visaient `product-data.jsn` (l'API du _screener_), qui répond
  bien 200 avec un `data` vide, piloté par un `localConfig` assemblé en JS.
  Constat exact.
- Mais la page produit déclare, dans le même `url_map`, une **seconde API,
  distincte** — `product_data_api` — qui n'avait jamais été testée. C'est une API
  REST classique, et elle répond en simple GET.

Deux enseignements de méthode : un endpoint mort n'est pas une source morte, et
un constat de blocage doit être **re-mesuré** avant d'être capitalisé (l'entrée
« 403 depuis Actions », déjà infirmée en août, avait tenu des semaines).

---

## 2. Ce qui est mesuré aujourd'hui (2026-08-21) — chaîne complète

Toutes les mesures ci-dessous en **HTTP simple, sans navigateur**, depuis
l'environnement d'agent. Reproductible :
`bun run scripts/probe-ishares-product-api.ts` (workflow
`.github/workflows/probe-ishares-product-api.yml`, lecture seule).

### A. Énumération — le sitemap déclaré par `robots.txt`

`https://www.ishares.com/uk/product-sitemap.xml` (déclaré en clair par le
`robots.txt` du site, c'est-à-dire la voie **prévue pour les robots**) :

| Mesure                  | Valeur         |
| ----------------------- | -------------- |
| HTTP                    | 200 (≈ 913 Ko) |
| URLs de pages produit   | 3 027          |
| `portfolioId` distincts | **1 621**      |

### B. Identité — `portfolioId` → ISIN

`GET .../product-data/api/v2/get-product-data?portfolioId=…&component=keyFundFacts`
→ HTTP 200, contient `isin`. Vérifié sur le fonds test 251882 → `IE00B4L5Y983`.
Le champ `productIsin` est également présent via `component=fundHeader`.

→ **La correspondance ISIN → portfolioId, verrou déclaré bloquant depuis 5
probes, se construit par une passe de 1 621 GET.**

### C. Composition — `portfolioId` → holdings

`GET …&component=holdings`, mesuré sur iShares Core MSCI World UCITS ETF :

| Mesure                         | Valeur                                            |
| ------------------------------ | ------------------------------------------------- |
| HTTP / taille                  | 200 · ≈ 800 Ko JSON                               |
| Lignes de composition          | **1 311**                                         |
| ISIN renseignés                | **1 281 / 1 311 (97,7 %)**                        |
| Somme des poids                | **100,00 %** (passe la QC `validateHoldingsSum`)  |
| Date de référence (`asOfDate`) | **2026-08-20** (veille du run)                    |
| Historique disponible          | 4 dates (`dateList` : 20/08, 31/07, 30/06, 31/12) |
| Statut de validation obtenu    | `valid` via `buildHoldingRows`                    |

Les colonnes arrivent en tableaux parallèles — `isin`, `issueName`,
`holdingPercent`, `sectorName`, `countryOfRisk`, `ticker`, `marketValue`,
`unitsHeld` — chacune sous deux formes : la valeur **brute** (`value`, ex.
`5.4582`) et la valeur affichée arrondie (`formattedValue`, `"5.46"`). Le parser
lit la brute, ce qui vaut d'être noté pour deux raisons : `formattedValue`
afficherait 100 % d'ISIN renseignés (il duplique la chaîne vide) et une somme de
poids à 100,11 % (cumul des arrondis), là où la brute donne les 97,7 % et 100,00 %
du tableau. Les 30 lignes sans ISIN sont les positions de trésorerie et de
dérivés, qui n'en ont pas : elles restent à `null`, jamais comblées (§1.3).

### D. Document réglementaire — KID par URL statique

Le KIID est servi depuis un CDN statique, à une URL **qui porte l'ISIN** :

```
https://www.ishares.com/gls-download/literature/kiid/ucits_kiid-ishares-core-msci-world-ucits-etf-gb-ie00b4l5y983-en.pdf
→ HTTP 200 · application/pdf · 170 Ko
```

C'est exactement l'entrée qu'attend `parseKidSfdrArticle` (`src/lib/esg/kid-parser.ts`),
resté sans source depuis le POC SFDR à 0 %.

### Ce que ça débloque côté code

Le pipeline N2 (`docs/n2-holdings-ingestion.md`) était **construit, testé, et sans
source**. Il lui manquait un parser pour ce format. Il est livré :
`parseISharesProductDataHoldings()` (`src/lib/data-engine/holdings.ts`), qui rend
le même `ParsedHoldings` que le parser CSV existant — donc **QC, persistance,
overlap look-through et carbone bottom-up fonctionnent sans autre modification**.

---

## 3. Le verrou réel : les conditions d'utilisation, pas le réseau

Il faut le dire aussi nettement que le reste, parce que le §1.2 et le §1.3 y
obligent, et parce que le même critère a déjà servi à écarter extraETF.

Les **conditions d'utilisation d'iShares** (`/uk/individual/en/compliance/terms-and-conditions`,
lues le 2026-08-21) stipulent :

> « This website is for your **personal and internal use** and is **not to be used
> for any commercial purposes** (whether or not for profit) unless […] you are a
> financial adviser […] »
>
> « You may not sell, copy, publish, distribute, transfer, modify, display,
> reproduce, and/or **create any derivative works** from the information […] »

Le `robots.txt` n'interdit pas ces chemins, mais **`robots.txt` n'est pas une
licence**. En droit européen s'ajoute le **droit _sui generis_ du producteur de
base de données** : l'extraction substantielle et répétée d'une base est protégée
même quand les données isolées sont des faits.

**Conclusion honnête : techniquement débloqué, contractuellement non acquis.**
Écarter extraETF pour ses ToS puis moissonner iShares en ignorant les siennes
serait incohérent. On ne le fera pas.

### Ce que ça implique concrètement

Ce n'est pas un mur : c'est **un e-mail à envoyer, pas un projet à financer**.
Les sociétés de gestion accordent couramment un accès données à des fintechs qui
redirigent vers leurs produits — c'est de la distribution pour elles. La demande
porte sur : composition + document réglementaire, usage applicatif, avec
attribution visible et lien vers la page produit.

À demander en parallèle, par ordre d'utilité pour le catalogue Seedow :
**BlackRock/iShares**, **Amundi**, **Vanguard**, **DWS/Xtrackers**, **UBS**.

Le jour où l'autorisation arrive, l'activation est **un changement de
configuration**, pas un développement : le probe, le parser, la QC et le gate
sont déjà livrés et testés.

---

## 4. ESG : arrêter de chercher une notation, la calculer

C'est le vrai retournement de ce document.

Depuis le début, le repo cherche un **`esg_score` au niveau du fonds**. Cette
donnée n'est jamais gratuite, et ne le sera jamais : c'est le produit vendu par
MSCI, Sustainalytics et Morningstar. Chaque probe (Yahoo `esgScores` 0/80, GECO
0/100, extraETF bloqué par ses ToS) redécouvre la même chose.

Or, dès lors que les holdings sont transparisées, **Seedow n'a pas besoin
d'acheter une note : il peut la calculer.**

```
score_fonds = Σ (poids_titre_i × signal_entreprise_i)
```

Et les **signaux au niveau entreprise**, eux, existent en accès libre, parce
qu'ils sont produits par des ONG, des régulateurs ou des initiatives publiques
dont la mission est justement de les diffuser.

### Sources primaires gratuites — joignabilité mesurée le 2026-08-21

| Source                             | Donnée                                                         | HTTP mesuré           | Statut licence                                                            |
| ---------------------------------- | -------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| **SEC EDGAR** (`data.sec.gov`)     | dépôts US, XBRL, **N-PORT = holdings de fonds US**             | 200 (UA requis)       | **Domaine public** — usage commercial explicite                           |
| **GLEIF** (`api.gleif.org`)        | LEI ↔ entité juridique, structure de groupe                    | 200                   | **CC0** — sans restriction                                                |
| **filings.xbrl.org**               | dépôts **ESEF/CSRD** balisés → émissions Scope 1/2/3 déclarées | 200 (`index.json`)    | Dépôts réglementaires publics                                             |
| **TPI** (Transition Pathway Init.) | qualité de gouvernance climat + trajectoire carbone            | 200                   | Libre, académique — **à confirmer par écrit**                             |
| **SBTi**                           | objectifs climat validés (binaire + niveau)                    | 200 (redirection)     | Fichier public, licence **non explicitée** — à confirmer                  |
| **UN Global Compact**              | adhérents + **radiés** (manquements normatifs)                 | 200                   | Public — à confirmer                                                      |
| **Urgewald GCEL / GOGEL**          | charbon, expansion pétrole & gaz → **exclusion**               | domaine principal 200 | Gratuit et public, mais **usage commercial soumis à autorisation écrite** |
| **Banque mondiale**                | contexte macro / pays                                          | 200                   | CC-BY                                                                     |

⚠️ **« Joignable » ≠ « licite ».** Le tableau mesure la joignabilité ; la colonne
licence dit ce qui est acquis et ce qui ne l'est pas. Deux sources seulement sont
**sans ambiguïté** aujourd'hui : SEC EDGAR et GLEIF. Pour les autres, la
confirmation écrite doit précéder la mise en production — même règle que pour
iShares (§3). Urgewald invite explicitement les acteurs financiers à les
contacter : c'est une demande à envoyer, pas un obstacle.

### Pourquoi cette voie est meilleure, pas seulement moins chère

1. **Elle est conforme au §1.2.** Chaque chiffre remonte à une source primaire
   nommée et datée. Une note MSCI achetée serait, elle, une boîte noire qu'on ne
   pourrait ni expliquer ni sourcer à l'écran.
2. **Elle est conforme au §1.3.** On dit « 62 % des encours de ce fonds sont dans
   des entreprises sans objectif climat validé SBTi, au 20/08/2026 » — un fait
   vérifiable — plutôt que « note ESG : B ».
3. **Elle sert Ethi (§5).** Ethi peut expliquer _pourquoi_ un fonds est noté ainsi,
   ligne par ligne. Avec une note achetée, il ne pourrait que la répéter.
4. **C'est un actif, pas une dépense.** La méthodologie devient différenciante ;
   revendre une note MSCI ne l'est pas.
5. **Elle survit au greenwashing.** La détection de greenwashing déjà présente
   (`src/lib/esg/`) devient mesurable : écart entre le discours du fonds
   (article SFDR affiché) et la réalité de ses lignes.

### Limite assumée

La couverture sera **partielle et inégale** : ces bases couvrent surtout les
grandes capitalisations cotées. Un fonds small-cap ou émergents sera mal couvert.
C'est acceptable **à condition de l'afficher** : « score calculé sur 78 % des
encours ». Le gate ESG (`activation.ts`) reste souverain — aucun fonds non sourcé
n'est exposé, et 0 % assumé vaut mieux qu'un chiffre inventé (§1.3).

---

## 5. Plan pour la bêta

### Lot 1 — sans attendre aucune autorisation (démarrable tout de suite)

1. **Identité** : GLEIF (CC0) pour l'axe ISIN → LEI → entité. Sans réserve.
2. **Holdings de fonds US** : SEC EDGAR **N-PORT**, domaine public, usage
   commercial explicitement permis (UA d'identification + limite de débit).
   Couvre les ETF de droit américain du catalogue.
3. **Émissions déclarées** : `filings.xbrl.org` (ESEF/CSRD) → Scope 1/2/3
   **réellement déclarés et balisés XBRL** par les émetteurs européens. C'est la
   donnée carbone la plus solide accessible gratuitement, et elle alimente
   directement `carbon-engine.ts` en bottom-up.

### Lot 2 — les e-mails à envoyer cette semaine

4. Autorisation d'usage applicatif : **BlackRock/iShares**, puis Amundi,
   Vanguard, DWS, UBS (§3).
5. Confirmation écrite de licence : **Urgewald** (exclusions charbon/pétrole),
   **SBTi**, **TPI**, **UNGC** (§4).

Ce lot ne coûte rien, ne bloque pas le lot 1, et conditionne le lot 3.

### Lot 3 — à l'arrivée des accords (activation par configuration)

6. Table ISIN → portfolioId construite par la passe sitemap (§2A/2B), sur le
   périmètre bêta uniquement — **pas les 1 621 fonds** : la bêta a besoin de
   quelques dizaines de fonds curés, pas d'un moissonnage de catalogue. Périmètre
   réduit = charge minimale sur la source et posture ToS proportionnée.
7. Ingestion des holdings via `parseISharesProductDataHoldings` → `fund_holdings`
   (QC et persistance déjà en place).
8. SFDR via les KID `gls-download` (§2D) → `parseKidSfdrArticle`.
9. Score ESG calculé par transparisation (§4) + affichage du **taux de
   couverture** à côté de chaque score.

### Ce qui n'est plus recommandé

- **Le flux EET licencié comme prochaine étape** : c'était la recommandation
  sortante de `esg-sources.md`. Elle reste un repli valable pour une couverture
  large et redistribuable, mais la faire **avant** d'avoir demandé les
  autorisations gratuites du lot 2 serait payer pour ce qu'on n'a pas encore
  demandé.
- **Le navigateur sans tête sur la SPA iShares** : devenu inutile (§2), et il
  n'aurait de toute façon rien réglé au vrai verrou (§3).

---

## 6. Ce que ce document ne dit pas

- Il **ne dit pas** que la donnée iShares est libre d'usage. Elle ne l'est pas
  aujourd'hui (§3).
- Il **ne dit pas** que la couverture ESG sera complète. Elle sera partielle et
  devra l'afficher (§4).
- Il **n'établit pas** les licences de TPI, SBTi, UNGC et Urgewald : il indique
  qu'elles doivent être confirmées par écrit avant toute mise en production.
- Aucune donnée n'a été ingérée, persistée, ni exposée dans le cadre de ces
  mesures : lecture seule, un fonds de test.

_Mesuré le 2026-08-21. Reproductible via `scripts/probe-ishares-product-api.ts`
(lecture seule). Voir aussi `docs/esg-sources.md` (historique du cadrage) et
`docs/n2-holdings-ingestion.md` (pipeline holdings)._
