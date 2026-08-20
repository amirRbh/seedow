# Sources ESG/SFDR pour les ETF promus — cadrage (avant implémentation)

> Dernier maillon du pipeline d'enrichissement Adanos : sourcer un `esg_score`
> (et idéalement l'article SFDR) pour débloquer l'activation des ETF promus. Le
> **garde-fou** (`activation.ts`) bloque toute activation d'un ETF catalogue sans
> ESG sourcé → on peut avancer source par source, sans risque de flood.
>
> **Aucune ligne de code d'ingestion ESG tant qu'une source atteignable + licite +
> exploitable n'est pas actée.** Ce document tranche ce choix.

## Contrainte réseau (mesurée)

Deux environnements, deux politiques d'egress — c'est déterminant :

| Depuis                                                      | Egress              | Constat                                                                                                                                                          |
| ----------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sandbox agent** (ici)                                     | Restreint par proxy | Seuls registres de paquets + GitHub + Anthropic. Yahoo, justETF, OpenFIGI, sites émetteurs → **403 CONNECT** (policy denial, vérifié via `__agentproxy/status`). |
| **GitHub Actions** (là où tournent les scripts d'ingestion) | Ouvert              | Yahoo v8 (cours) et Adanos raw **confirmés OK** cette session. Sites émetteurs (iShares/Amundi/Vanguard) historiquement **403** même depuis Actions.             |

→ La joignabilité qui compte est **celle des runners GitHub Actions**, pas du sandbox. Toute vérification de source doit se faire par un run Actions (probe read-only), pas depuis ici.

## Sources candidates

| Source                                                                        | Donnée                                                                        | Joignable (Actions)                                                                                                            | Fit                                                                                                                                                                      | Licence / risque                                                                                       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Yahoo `esgScores`** (`query2 …/v10/finance/quoteSummary?modules=esgScores`) | ESG Risk Sustainalytics (0–100, **bas = mieux**) + E/S/G + controverses, daté | Même famille d'hôtes que les cours (déjà OK), **mais** v10 exige un `crumb`+cookie (v8 non) → **à vérifier**                   | Couverture **ETF partielle** (Yahoo ESG est fort sur actions, lacunaire sur ETF) ; échelle **inversée** vs notre `esg_score` (haut = mieux) → mapping transparent requis | ToS Yahoo : usage interne gris, **redistribution restreinte** ; attribution Sustainalytics obligatoire |
| **KID/DIC** (parser existant `parseKidSfdrArticle`)                           | **Article SFDR** (6/8/9) + frais courants, fait réglementaire daté            | Dépend de l'URL du KID ; GECO ne résout que les ISIN **FR**, nos ETF sont **IE/LU** → besoin d'une source d'URL KID pour IE/LU | Donne le SFDR (le bon signal réglementaire) mais **pas** un `esg_score`                                                                                                  | Documents publics, faible risque ; attribution émetteur                                                |
| **EET / European ESG Template**                                               | SFDR complet par ISIN (standard industrie)                                    | Distribué **B2B**, pas de téléchargement ouvert                                                                                | Idéal sur le papier                                                                                                                                                      | Non librement accessible                                                                               |
| **ESMA FIRDS / GLEIF / OpenFIGI**                                             | Référentiel instrument, LEI, identité                                         | Ouverts                                                                                                                        | **Pas d'ESG** (utile pour `issuer`/LEI seulement)                                                                                                                        | Ouvert                                                                                                 |

## Résultat du probe Yahoo (mesuré 2026-08-20)

Run Actions read-only (`scripts/probe-yahoo-esg.ts`, 80 symboles wirés) :

```
crumb obtenu · RÉSULTAT: hits=0 no_data=0 http_error=80 → couverture ESG 0% (0/80)
```

→ **No-go Yahoo.** Le `crumb` est bien obtenu, mais les 80 requêtes `esgScores`
échouent **toutes en HTTP** (rejet uniforme, pas « pas de données »). Le v10
`quoteSummary` gate l'ESG derrière un flux de consentement/cookie plus strict que
le simple crumb et rejette les clients serveur. Avec les autres réserves
(couverture ETF partielle même quand ça marche, ToS de redistribution, échelle
inversée), Yahoo n'est **pas** retenu comme source ESG.

## Recommandation (après probe)

1. **SFDR via KID** — désormais la piste primaire : fait réglementaire sourçable et
   daté, licence propre. Verrou à lever : une **source d'URL KID atteignable** pour
   les ISIN IE/LU (les sites émetteurs sont bloqués ; GECO ne couvre que FR). C'est
   le prochain cadrage.
2. **Yahoo `esgScores`** — écarté (probe ci-dessus).
3. Le **gate ESG reste le filet** : le compteur Découvrir ne monte que pour des
   fonds réellement sourcés ; une couverture partielle est acceptable.

## Résultat du probe sources KID/SFDR (mesuré 2026-08-20)

Run Actions read-only (`scripts/probe-kid-sources.ts`, 2 ISIN IE/LU) :

| Source              | Joignable (Actions) | Signal SFDR dans la réponse | Lecture                                            |
| ------------------- | ------------------- | --------------------------- | -------------------------------------------------- |
| OpenFIGI (baseline) | ✅ HTTP 200         | ✅ (identité, pas SFDR)     | egress Actions ouvert hors Yahoo — confirmé        |
| justETF             | ✅ HTTP 200         | ❌ absent du HTML brut      | contenu rendu côté JS → non exploitable simplement |
| **extraETF**        | ✅ HTTP 200         | ✅ présent (IE + LU)        | **candidat technique**, mais **ToS à vérifier**    |

## Conclusion du cadrage ESG

Aucune source **gratuite, licite ET programmatique** n'est disponible pour l'ESG/SFDR
des UCITS IE/LU depuis cet environnement :

- **KID primaires** (sites émetteurs) : bloqués réseau.
- **Yahoo `esgScores`** : rejeté systématiquement (probe 0/80).
- **extraETF** : seul joignable-avec-signal, mais son usage automatisé se heurte à
  ses **conditions d'utilisation** — pas de scraping d'ingestion sans revue/licence
  (§ respect des ToS, intégrité de la donnée : un agrégateur est une source
  seconde, pas le KID primaire).

→ Le dernier maillon n'est plus un problème d'ingénierie mais une **décision de
source** : souscrire un flux de données licencié (SFDR/ESG par ISIN), ou attendre
qu'une source primaire s'ouvre. Le reste du pipeline est prêt et protégé par le
gate — il n'attend que cette source.

_Note de cadrage — ne décrit pas du code d'ingestion livré. Source à acter avant implémentation._

---

# Pipeline SFDR livré + POC mesuré (2026-08-20)

Le cadrage ci-dessus concluait « aucune source gratuite+licite+programmatique »
sans avoir **empiriquement** passé des ISIN IE/LU à travers GECO. Ce POC comble ce
trou : le pipeline complet (`src/lib/esg/sfdr-pipeline/`, cf. `docs/esg-pipeline.md`)
a été construit et **mesuré sur 100 ETF réels**, source primaire GECO/AMF.

## Résultat mesuré (run Actions, 100 ETF, `persist=false`)

Échantillon stratifié par domicile : IE 35 · LU 30 · FR 20 · AE 10 · CH 2 · XS 2 · DE 1.

| Métrique                        | Valeur            |
| ------------------------------- | ----------------- |
| GECO résolus (fonds identifiés) | 1 doc-porteur     |
| Documents officiels téléchargés | 1                 |
| Texte PDF extrait               | 1                 |
| **SFDR vérifié (PRIMARY)**      | **0**             |
| Article 6 / 8 / 9               | 0 / 0 / 0         |
| **Couverture officielle**       | **0 / 100 = 0 %** |

**Taxonomie d'échec (§12)** :

| Raison            | Nb  | Lecture                                                                             |
| ----------------- | --- | ----------------------------------------------------------------------------------- |
| `NO_GECO_MATCH`   | 83  | ISIN inconnu de GECO. Couvre **100 % des IE/LU/AE/CH/XS/DE** (80) + 3 FR.           |
| `NO_DOCUMENT`     | 16  | Fonds FR résolu par GECO, mais **aucun document téléchargeable** exposé.            |
| `NO_SFDR_MENTION` | 1   | Le seul document réellement extrait ne portait aucune classification SFDR affirmée. |

Par domicile : **IE 0/35 · LU 0/30 · FR 0/20** · AE 0/10 · CH 0/2 · XS 0/2 · DE 0/1.

## Ce que la mesure établit (fait, pas supposition)

1. **GECO n'indexe pas les UCITS étrangers.** Les 80 ISIN non-FR de l'échantillon
   sont tous `NO_GECO_MATCH`. GECO est la base des OPC **de droit français** ; les
   ETF IE/LU (l'essentiel du catalogue Seedow) n'y sont pas résolus. Confirmé
   empiriquement, plus une hypothèse.
2. **Même pour les fonds FR, GECO expose rarement un KID téléchargeable.** Sur 20
   FR, ~17 sont résolus en **identité** (utile, déjà exploité ailleurs), mais **1
   seul** a livré un document PDF, et ce document ne contenait pas de mention SFDR
   affirmée. GECO reste donc une bonne source d'**identité FR**, mais **pas** une
   source de **documents SFDR** à l'échelle.
3. **Le pipeline, lui, fonctionne de bout en bout.** La chaîne complète s'est
   exécutée (résolution → téléchargement → extraction PDF → parsing → preuve) sur
   le fonds qui l'a permise. Un bug réel (buffer PDF détaché par pdf.js) a même été
   révélé par le run et corrigé. L'infrastructure est prête ; c'est **la source**
   qui manque, pas le code.

## Décision (§13)

**0 % < 40 % → NE PAS industrialiser GECO comme source SFDR pour ce catalogue.**
Présenter les résultats et revoir la stratégie de source (ce document).

## Prochaine étape recommandée

Le verrou n'est pas l'ingénierie (pipeline générique + gate + preuve = prêts) mais
la **source primaire adaptée à un univers IE/LU** :

1. **KID de l'asset-manager** (source primaire officielle, niveau 1) — brancher un
   `IssuerResolver` (ISIN + émetteur connu → URL du KID sur le domaine officiel).
   L'interface `DocumentResolver` l'accepte **sans toucher le cœur**. Verrou : les
   domaines émetteurs (iShares/Amundi/Vanguard…) répondaient **403 même depuis
   Actions** (probes précédents) — à re-mesurer avant d'investir.
2. **Flux EET / SFDR licencié** (European ESG Template par ISIN) — source primaire
   standard de l'industrie, payante mais faisant-foi et redistribuable. La seule
   voie **fiable** pour une couverture large IE/LU aujourd'hui.
3. **GECO conservé pour l'identité FR** uniquement (déjà le cas), pas pour le SFDR.

Le gate ESG reste souverain : tant qu'aucune de ces sources n'est branchée, aucun
ETF non sourcé n'est exposé — une couverture de 0 % vérifié est **assumée**, jamais
compensée par une donnée inventée (§1).

_Résultats mesurés le 2026-08-20 via `.github/workflows/esg-sfdr-poc.yml` (run #2,
100 ETF, lecture seule). Reproductible : `parser_version=1`, échantillon
`catalog_instruments` stratifié par préfixe ISIN._
