# Livrable 7 — Produit minimal commercialisable

## Positionnement

- **En une phrase** : chaque fonds de votre gamme confronté aux exigences que son nom déclenche, avec la citation du document qui y répond — ou le constat qu'aucun document fourni n'y répond.
- **Client** : société de gestion française de 5 à 150 personnes, au moins un fonds grand public avec un terme ESG dans le nom.
- **Problème** : prouver, fonds par fonds, que la documentation porte les engagements que le nom appelle (seuil de 80 %, socle d'exclusions CTB ou PAB, investissements durables) et que documents commerciaux et prospectus disent la même chose.
- **Résultat promis** : un rapport daté et sourcé, utilisable en contrôle, livré en 10 jours ouvrés ; la liste des écarts documentaires à corriger, classés.
- **Ce qui n'est pas promis** : un avis juridique, une attestation de conformité, une vérification des positions.

## Fonctionnement

1. Le client transmet (ou autorise la collecte de) : prospectus, annexes précontractuelles SFDR, DIC/KID, politique d'exclusion, documents commerciaux, pour ≤ 10 fonds.
2. Seedow extrait les engagements de chaque document, chacun avec sa citation, sa page et sa date (pipeline documentaire existant + saisie contrôlée).
3. Le moteur `checkFundName` confronte le nom aux exigences et produit les points N0–N6.
4. Le fondateur relit chaque point (contrôle humain systématique au stade pilote), ajoute les constats de cohérence entre documents (E5).
5. Rapport livré, puis réunion de restitution de 45 minutes.
6. Suivi mensuel : contrôle de chaque nouveau document, revue complète trimestrielle, note de veille réglementaire.

## Parcours client

Premier contact → entretien de découverte → démonstration sur fonds fictifs → proposition → accord de confidentialité + bon de commande + acompte → collecte des documents → livraison J+10 → restitution → proposition de suivi.

**Il n'y a pas d'interface client au stade pilote** : le livrable est un rapport (Markdown → PDF). Un espace client ne sera construit qu'après 5 clients en suivi, et seulement s'ils le demandent.

## Fonctionnalités indispensables (et pourquoi)

| Fonctionnalité                                                                 | Justification                                        | État                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Détection des termes ESG dans un nom (FR/EN), avec catégories ESMA             | Besoin client : savoir ce que le nom déclenche       | **Fait** (cette session)                                                      |
| Exigences par catégorie (80 %, CTB/PAB, durable, transition/impact)            | Besoin client                                        | **Fait**                                                                      |
| Confrontation exigences ↔ engagements sourcés                                  | Besoin client, cœur du livrable                      | **Fait**                                                                      |
| Rapport avec statuts en toutes lettres et ligne « ce que ce point ne dit pas » | Exigence de vente (opposabilité, prudence juridique) | **Fait**                                                                      |
| Mention « démonstration » obligatoire sur les données fictives                 | Exigence d'honnêteté commerciale                     | **Fait**                                                                      |
| Extraction semi-automatique des engagements depuis les PDF                     | Impératif de marge (passer de 12 h à 6 h)            | Partiel (pipeline SFDR existant) — à construire **après** le 1er pilote signé |
| Contrôle E5 (document commercial vs prospectus)                                | Besoin client                                        | Manuel au pilote ; à outiller après 3 pilotes                                 |
| Export PDF du rapport                                                          | Exigence de vente                                    | Manuel (pandoc ou impression)                                                 |

## Explicitement exclus

- Vérification des positions contre les exclusions PAB/CTB (exige des données émetteurs au chiffre d'affaires, payantes : terrain de Clarity AI, MSCI, ISS).
- Toute note, score ou classement de fonds dans le livrable B2B.
- Espace client, authentification, tableau de bord, facturation en ligne.
- Couverture automatique de tous les émetteurs de documents.
- Tout ce qui ressemble à une recommandation d'investissement.

## Prix

Pilote 2 400 € HT (≤ 10 fonds, 50 % à la commande) · Fonds supplémentaire 180 € HT · Suivi 450 € HT/mois, engagement 6 mois, résiliable ensuite à tout moment avec un mois de préavis (pas de reconduction cachée — cohérent avec CLAUDE.md §1.5).

## Rétention

Le suivi vaut quelque chose seulement s'il **attrape quelque chose** : chaque nouveau document est contrôlé, chaque évolution réglementaire (SFDR 2.0, Q&A ESMA) est traduite en « ce que ça change pour vos fonds ». Indicateur de rétention : nombre de points corrigés par le client sur signalement de Seedow.

## Plan d'acquisition

Voir `06` et `09`. Canal direct sur liste publique, canal partenaire (cabinets de conformité), et une note de veille mensuelle envoyée aux prospects qui l'ont demandée.

## Métriques de succès

Pilotes signés · temps de livraison par fonds · points d'écart trouvés par pilote (un pilote sans aucun écart trouvé est un pilote difficile à renouveler) · conversion pilote → suivi · attrition.
