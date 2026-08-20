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

## Recommandation

Aucune source **gratuite unique** ne donne un `esg_score` propre pour des UCITS globaux. Chemin pragmatique, du plus intègre au plus large :

1. **SFDR via KID** en priorité (fait réglementaire sourçable, daté) — mais coverage limitée par la disponibilité de l'URL KID pour IE/LU. À évaluer : existe-t-il un annuaire de KID atteignable depuis Actions ?
2. **Yahoo `esgScores`** en complément, **seulement si** un probe Actions confirme une couverture ETF réelle sur nos 300 symboles — avec mapping d'inversion **documenté** et la mention de limite/contestation (§2 : « ce que dit la donnée, rien de plus »). Attribution Sustainalytics.
3. Le **gate ESG reste le filet** : le compteur Découvrir ne monte que pour des fonds réellement sourcés. Une couverture partielle est donc acceptable — pas de fonds non noté activé.

## Prochaine étape (probe, pas ingestion)

Un seul fait bloque la décision Yahoo : **quelle part de nos 300 ETF wirés renvoie un `esgScores` réel** (et le v10 passe-t-il le `crumb` depuis Actions ?). → un run Actions read-only (aucune écriture) sur un échantillon, qui compte les hits. Selon le taux : on branche Yahoo, on se rabat sur le KID/SFDR, ou on cherche une 3ᵉ source. **C'est le go/no-go, à faire avant toute ingestion.**

_Note de cadrage — ne décrit pas du code livré. Source à acter avant implémentation._
