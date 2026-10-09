# Stratégie — de Seedow à une entreprise qui encaisse

> Dossier de travail ouvert le **2026-10-09**. Il ne remplace pas `docs/seedow-company-dossier/` (diagnostic d'août 2026, orienté levée de fonds) : il le prolonge avec une question plus étroite, **qui paie, pour quoi, et comment le prouver en 30 jours**.
>
> Convention utilisée partout : **[VÉRIFIÉ]** constaté par nous à une date donnée · **[DOC]** affirmé par le code, la doc ou une source tierce, non revérifié · **[SUPPOSÉ]** hypothèse de travail · **[À VÉRIFIER]** à établir avant d'agir dessus.

## Les livrables

| #   | Fichier                                                | Contenu                                                     |
| --- | ------------------------------------------------------ | ----------------------------------------------------------- |
| 1   | [01-diagnostic.md](01-diagnostic.md)                   | État réel de Seedow, actifs, dette, options                 |
| 2   | [02-carte-opportunites.md](02-carte-opportunites.md)   | 23 opportunités notées sur 100                              |
| 3   | [03-finalistes.md](03-finalistes.md)                   | 5 finalistes : concurrence, prix, distribution, stress test |
| 4   | [04-decision.md](04-decision.md)                       | Recommandation, alternative, conditions d'invalidation      |
| 5   | [05-plan-economique.md](05-plan-economique.md)         | Scénarios prudent / central / ambitieux, point mort         |
| 6   | [06-plan-commercial-30j.md](06-plan-commercial-30j.md) | Semaine par semaine, critères d'arrêt                       |
| 7   | [07-produit-minimal.md](07-produit-minimal.md)         | Le produit vendable, et ce qu'on ne construit pas           |
| 8   | [08-execution-technique.md](08-execution-technique.md) | Ce qui a été codé, testé, et ce qui reste                   |
| 9   | [09-kit-de-vente.md](09-kit-de-vente.md)               | Page de vente, messages, relances, démo, offre pilote       |
| 10  | [10-pilotage.md](10-pilotage.md)                       | Indicateurs, seuils de décision, revue hebdomadaire         |
| —   | [hypotheses.md](hypotheses.md)                         | Registre des hypothèses et de leur niveau de preuve         |
| —   | [sources.md](sources.md)                               | Sources externes, URL, dates, ce qu'elles prouvent ou non   |

## La décision en cinq lignes

1. **Seedow B2C ne génère pas de revenu et n'a pas de chemin court vers un revenu** : pas d'exécution, pas de prix, pas de traction mesurée accessible, et un marché où l'acquisition coûte cher. On le **gèle** : le site reste en ligne, on arrête d'y ajouter des fonctionnalités.
2. **L'actif qui a de la valeur, c'est la discipline documentaire de Seedow** : lire des documents réglementaires de fonds, relier chaque affirmation à sa source datée, ne jamais conclure au-delà du document. C'est exactement le travail que les orientations ESMA sur les noms de fonds, la doctrine AMF 2020-03 et la gouvernance produit imposent à des équipes de conformité de petite taille.
3. **Recommandation** : un **service productisé B2B de pré-contrôle documentaire ESG** pour les sociétés de gestion françaises (≈ 684 en septembre 2025 selon l'AMF), vendu directement et via les cabinets de conformité externalisée. Pilote payant à 2 400 € HT, puis suivi à 450 € HT par mois.
4. **Alternative** : la même brique, vendue côté distributeurs (CIF de plus de 50 clients, PSI, plateformes) pour le réexamen périodique de gouvernance produit que l'AMF trouve lacunaire (synthèse SPOT du 26/02/2026).
5. **Rien n'est validé commercialement.** Le seuil de décision est fixé à l'avance : **au moins 2 pilotes payés ou engagés par écrit sur 40 sociétés contactées, d'ici le 2026-11-08**. En dessous, on bascule sur l'alternative ; si elle échoue aussi, on arrête cette famille d'opportunités.

## Journal de décision

| Date       | Décision                                                                                                 | Réversible ? | Raison courte                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-10-09 | Geler le développement de fonctionnalités B2C                                                            | Oui          | Aucun chemin de revenu court ; chaque heure de code B2C retarde le test commercial                                      |
| 2026-10-09 | Cible principale : sociétés de gestion (SGP), offre de pré-contrôle documentaire ESG                     | Oui          | Obligation en vigueur, acheteur identifiable (RCCI), budget conformité, actifs Seedow directement réutilisables         |
| 2026-10-09 | Construire uniquement le moteur de pré-contrôle « noms de fonds » + le générateur de rapport             | Oui          | C'est le livrable du pilote ; tout le reste se fait à la main tant qu'aucun client ne paie                              |
| 2026-10-09 | Ne pas créer de nouvelle marque à ce stade                                                               | Oui          | Le nom n'est pas la contrainte ; décision reportée après les 10 premiers entretiens                                     |
| À trancher | Suspendre la publication de constats nominatifs sur l'Observatoire public pendant la prospection des SGP | Oui          | Vendre un service à un émetteur qu'on épingle publiquement crée un conflit d'intérêts apparent — **décision fondateur** |

## État d'avancement

- [x] Audit du dépôt, des tests, du site public (2026-10-09)
- [x] Recherche de marché externe, sources datées
- [x] Carte des opportunités, finalistes, décision
- [x] Moteur de pré-contrôle « noms de fonds » codé et testé (22 tests)
- [ ] **Constituer la liste de 40 SGP cibles** (procédure dans `06`) — prochaine action
- [ ] Valider le cadre juridique de l'offre avec un avocat (périmètre « consultation juridique », loi de 1971) — avant la première facture
- [ ] Premiers entretiens de découverte

## Prochaine action à plus fort impact commercial

**Construire la liste des 40 sociétés de gestion cibles depuis les registres publics de l'AMF, puis envoyer les 10 premiers messages.** Rien d'autre ne produit d'information sur la volonté de payer.
