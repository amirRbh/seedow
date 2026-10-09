# Livrable 6 — Plan commercial sur 30 jours (du 2026-10-09 au 2026-11-08)

> Cycle de vente attendu pour un ticket de 2 400 € HT dans une SGP : une à trois réunions, décision du RCCI ou du dirigeant, **4 à 8 semaines** [SUPPOSÉ]. Le plan vise donc des **engagements écrits** (bon de commande, acompte, lettre d'intention signée avec date) d'ici le jour 30, pas nécessairement des factures encaissées.
>
> **Rien n'a été envoyé ni publié pendant cette session.** Toutes les actions ci-dessous sont à exécuter par le fondateur ou sur son autorisation explicite.

## Objectifs chiffrés et critères d'arrêt (fixés avant de commencer)

| Indicateur à J30                            | Seuil d'arrêt | Seuil « continuer » | Objectif |
| ------------------------------------------- | ------------: | ------------------: | -------: |
| SGP qualifiées dans la liste                |          < 40 |                ≥ 40 |       60 |
| SGP contactées                              |          < 30 |                ≥ 40 |       50 |
| Taux de réponse                             |         < 8 % |              ≥ 15 % |     25 % |
| Entretiens de découverte tenus              |           < 5 |                ≥ 10 |       12 |
| Propositions de pilote envoyées             |             0 |                 ≥ 4 |        6 |
| **Pilotes payés ou engagés par écrit**      |         **0** |             **≥ 2** |    **3** |
| Cabinets de conformité rencontrés (canal C) |             0 |                 ≥ 2 |        4 |

**Règle de décision au jour 30** :

- **≥ 2 pilotes engagés** → livrer, mesurer le temps passé, proposer le suivi. Poursuivre A.
- **0 ou 1 pilote, mais ≥ 10 entretiens dont la majorité confirme le besoin et objecte sur le prix ou le calendrier** → 15 jours de plus, prix d'entrée à 1 500 € HT pour 5 fonds.
- **0 pilote et objections sur le besoin lui-même** (« c'est fait », « notre cabinet le fait ») → arrêter A, lancer B avec le même protocole.

## Semaine 1 (J1–J7) — Liste, cadre, messages

| Action                                                                                                                                                                                                                                  | Livrable                     | Temps |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----: |
| Télécharger la liste des SGP agréées (data.gouv.fr, jeu « Liste des sociétés de gestion de portefeuille (SGP) agréées par l'AMF », S11) — **injoignable depuis l'environnement de cette session, à faire depuis le poste du fondateur** | CSV brut                     |   1 h |
| Pour chaque SGP, relever dans la base GECO de l'AMF les OPC distribués au grand public et leurs dénominations                                                                                                                           | Tableau SGP × fonds          |   8 h |
| Passer les dénominations dans `detectNameTerms` (voir `08`) pour ne garder que les SGP avec au moins un nom ESG                                                                                                                         | Liste qualifiée              |   1 h |
| Exclure les filiales de grands groupes bancaires et assurantiels ; noter la taille (effectif, encours public)                                                                                                                           | 40–60 cibles                 |   3 h |
| Identifier pour chaque cible le nom du RCCI ou du dirigeant **depuis des sources publiques** (site, documents réglementaires, profil professionnel). **Ne jamais deviner une adresse e-mail.**                                          | Colonne « contact + source » |   6 h |
| Prendre rendez-vous avec un avocat en droit financier : la formulation « constat documentaire » sort-elle le livrable de la consultation juridique réservée ?                                                                           | RDV fixé                     | 0,5 h |
| Lister 5–8 cabinets de conformité externalisée (sites, annuaires des associations)                                                                                                                                                      | Liste canal C                |   2 h |
| Préparer un rapport de démonstration **sur des fonds fictifs** (`data/demo/precheck-demo.json`) — déjà fait                                                                                                                             | Rapport démo                 |   0 h |

**Colonnes de la liste** : société · numéro d'agrément · site · nb d'OPC grand public · noms ESG relevés · effectif (source) · contact (nom, fonction, **source de l'information**) · canal · date du 1er contact · réponse · entretien · proposition · issue.

## Semaine 2 (J8–J14) — 25 premiers contacts, entretiens

- Envoyer 25 messages (séquence dans `09`), en personnalisant la première ligne avec un **fait public** propre à la SGP (nom de fonds, date de renommage, article SFDR).
- Appeler les cabinets de conformité de la liste C.
- Mener les premiers entretiens de découverte (script ci-dessous). **Ne pas présenter l'offre pendant les 20 premières minutes.**
- Tenir le tableau de bord (`10`) chaque soir.

## Semaine 3 (J15–J21) — 25 contacts de plus, propositions

- Relances J+4 et J+10 (voir `09`).
- À chaque entretien où le besoin est confirmé : envoyer **dans les 24 h** la proposition de pilote (`09`), avec une date de démarrage et l'acompte de 50 %.
- Construire seulement ce qui manque pour livrer le premier pilote (voir `07`) — rien d'autre.

## Semaine 4 (J22–J30) — Clôture et décision

- Relancer chaque proposition ouverte une fois, avec une question fermée (« on démarre le 17 novembre ou on reporte à janvier ? »).
- Livrer le premier pilote s'il est signé ; chronométrer chaque étape.
- Revue de décision le 2026-11-08 avec les seuils ci-dessus. Écrire le résultat dans `hypotheses.md` et dans le journal du `README`.

## Script d'entretien de découverte (30 minutes, questions neutres)

Objectif : apprendre comment le problème est vécu **aujourd'hui**, pas faire valider une idée. On ne demande jamais « est-ce que vous achèteriez ? ».

1. Pouvez-vous me raconter comment s'est passée la mise en conformité de vos noms de fonds avant mai 2025 ? Qui a fait quoi, combien de temps ?
2. Qu'est-ce qui a été le plus long ou le plus incertain ?
3. Quels fonds avez-vous renommés ou modifiés ? Pourquoi ceux-là ?
4. Aujourd'hui, quand un nouveau document commercial ou une nouvelle annexe SFDR sort, qui vérifie sa cohérence avec le prospectus ? Comment ?
5. La dernière fois qu'une incohérence a été trouvée, qui l'a trouvée, et à quel moment ?
6. Avez-vous fait appel à un prestataire (cabinet, avocat, outil) sur ce sujet ? Combien cela a-t-il coûté, à peu près ? Qu'en avez-vous pensé ?
7. Qu'est-ce qu'un contrôleur de l'AMF vous demanderait sur ce point, selon vous ? Seriez-vous à l'aise ?
8. Comment préparez-vous SFDR 2.0 ?
9. Qui d'autre dans la société s'occupe de ce sujet ? Qui signe une dépense de 2 000 à 3 000 € ?
10. (Fin) Est-ce que je peux vous montrer à quoi ressemble un pré-contrôle sur des fonds fictifs, et vous me dites ce qui ne vous servirait à rien ?

**Signaux forts à noter** : coût déjà dépensé sur le sujet, incident récent, contrôle AMF annoncé, nouveau fonds en préparation, acceptation d'un second rendez-vous avec le dirigeant, envoi spontané de documents.

**Signaux faibles à ne pas surinterpréter** : « intéressant », « envoyez-moi une plaquette », « revenez vers nous en janvier » sans date.

## Objections attendues et réponses

| Objection                                     | Réponse                                                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « On a déjà tout revu avant mai 2025. »       | « Le pilote sert justement de contrôle a posteriori : si tout est documenté, le rapport le montre, avec les citations, et vous l'avez pour votre prochain contrôle. »      |
| « Notre cabinet de conformité s'en occupe. »  | « Le rapport peut leur être remis : il leur fait gagner le temps de relecture. Nous travaillons aussi avec des cabinets directement. »                                     |
| « C'est un avis juridique ? »                 | « Non. Ce sont des constats documentaires : ce que le nom déclenche, ce que vos documents disent, avec la page. L'appréciation reste la vôtre ou celle de votre conseil. » |
| « Vous êtes une petite structure. »           | « Raison pour laquelle chaque point est sourcé et vérifiable par vous en deux minutes. Et le pilote est à prix fixe, payable 50 % à la commande. »                         |
| « Pas de budget cette année. »                | « On peut signer maintenant avec un démarrage et une facturation en janvier. »                                                                                             |
| « Et la confidentialité de nos documents ? »  | « Nous ne travaillons que sur les documents que vous transmettez et vos documents publics ; accord de confidentialité signé avant envoi ; aucun document n'est publié. »   |
| « Seedow publie des constats sur des fonds. » | Réponse à préparer selon la décision du fondateur sur le gel des constats nominatifs (voir `04`). **Ne pas improviser.**                                                   |

## Indicateurs qui disent si le canal fonctionne

- Après 25 envois : < 2 réponses ⇒ le message ou la cible est mauvais ; réécrire la première ligne, tester le téléphone.
- Après 5 entretiens : 0 demande de proposition ⇒ le problème n'est pas assez aigu chez ce profil ; revoir la qualification (taille, nb de fonds ESG, contrôle AMF récent).
- Après 4 propositions : 0 signature ⇒ problème d'offre (prix, périmètre, confiance) ; tester 1 500 € pour 5 fonds.
