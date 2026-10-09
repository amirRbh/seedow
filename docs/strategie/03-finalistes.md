# Livrable 3 — Les cinq finalistes

> Finalistes retenus par score (voir `02`) : **A** (avec C comme canal), **B**, **D**, **F**, **E**. V est absorbé comme module futur de A. Q (allégations environnementales des marques, hors finance) est gardée comme option de repli et analysée brièvement en fin de document.
>
> Limite générale : **aucun avis client sur ces concurrents n'a pu être collecté** (pas d'avis publics exploitables pour Clarity AI, Quantalys ou les cabinets de conformité dans les recherches du 2026-10-09). Les forces et faiblesses ci-dessous reposent sur leurs pages produit et sur la presse spécialisée.

---

## A — Pré-contrôle documentaire ESG des gammes de fonds, pour sociétés de gestion

### Le client

- **Univers** : 684 SGP « vivantes » en septembre 2025, 695 fin 2024 (AMF, S11) ; 671 fin 2025 selon l'AFG (périmètre différent).
- **Cible qualifiée** [SUPPOSÉ, à mesurer pendant la constitution de la liste] : SGP qui (1) distribuent au moins un OPC à des non-professionnels, (2) ont au moins un fonds dont le nom contient un terme ESG, (3) n'appartiennent pas à un groupe bancaire ou assurantiel doté d'une direction de la conformité de plus de 5 personnes. Estimation de travail : 150 à 300 sociétés. **Ce chiffre n'est pas mesuré.**
- **Acheteur** : RCCI (souvent seul, ou fonction externalisée). **Utilisateurs** : RCCI, responsable produit, marketing.

### Concurrence observée

| Acteur                                | Produit, cible                                                                                               | Prix observé                      | Force                                      | Faiblesse pour notre cible                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Clarity AI                            | Boîte à outils « ESMA fund naming » : exclusions PAB/CTB au niveau des positions, au chiffre d'affaires (S6) | Non publié                        | Données émetteurs fines, couverture large  | Abonnement plateforme, pensé pour les gérants dotés d'équipes data                       |
| MSCI, ISS                             | Données ESG émetteurs, études sur les noms de fonds (S7)                                                     | Non publié                        | Référence de marché                        | Données, pas contrôle documentaire ; coût élevé [SUPPOSÉ]                                |
| Cabinets d'avocats                    | Analyse des prospectus, renommage                                                                            | Honoraires horaires [non relevés] | Avis juridique, responsabilité             | Cher pour une revue périodique de 10 fonds                                               |
| Cabinets de conformité externalisée   | Fonction RCCI déléguée (ex. RSM, S14b)                                                                       | Non publié                        | Relation installée, connaissent la société | Relecture manuelle ; capacité limitée → **ce sont aussi nos partenaires potentiels (C)** |
| FE fundinfo, Kneip, producteurs d'EET | Production et diffusion de données réglementaires                                                            | Non publié                        | Intégrés au flux de données                | Produisent la donnée du producteur, ne la contrôlent pas contre ses documents            |
| Faire en interne + ChatGPT            | Relecture par le RCCI                                                                                        | 0 € apparent                      | Gratuit, immédiat                          | Pas de traçabilité, pas de méthode opposable, temps du RCCI                              |

### Pourquoi un RCCI choisirait-il ce service plutôt que ce qu'il a déjà ?

Pas parce que « c'est de l'IA ». Trois raisons qui ont une valeur pour lui :

1. **Un livrable opposable** : chaque point cite le document, la page, la date, et dit ce qu'il ne prouve pas. C'est ce qu'un contrôleur AMF demande ; ChatGPT ne le produit pas de façon reproductible.
2. **Un coût fixe et faible pour une revue complète** : 2 400 € HT pour 10 fonds, contre des honoraires d'avocat ou des jours de cabinet [prix concurrents non relevés — à confirmer en entretien].
3. **Un regard extérieur de sélectionneur de fonds** : le fondateur a lu des documentations de fonds du côté acheteur institutionnel (~3 Md€). Il sait ce qu'un distributeur va relever.

**Segment mal servi** : la SGP entrepreneuriale de 5 à 50 personnes, trop petite pour une plateforme de données ESG, trop exposée pour ignorer le sujet.

### Distribution

Voir `06` et `09`. En résumé : prospection directe sur une liste construite depuis les registres publics de l'AMF, et 5 cabinets de conformité externalisée approchés comme partenaires.

### Coûts

Temps fondateur (≈ 10–14 h par pilote au début, objectif 5–6 h), API d'extraction de texte et LLM (< 20 € par pilote [SUPPOSÉ]), infrastructure existante. Détail dans `05`.

### Stress test

| Question                                    | Réponse honnête                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pourquoi échouerait-elle ?                  | Les SGP ont déjà fait leur mise en conformité « noms » avant mai 2025 : le besoin ponctuel est passé, il ne reste que le suivi, moins urgent.                                                                                                                                          |
| Pourquoi un client refuserait-il de payer ? | « Notre cabinet de conformité ou notre avocat l'a déjà fait » ; « on n'achète pas à une structure d'une personne » ; « pas de budget avant 2027 ».                                                                                                                                     |
| Copiable en deux semaines ?                 | Le code, oui. La méthode de preuve, la crédibilité du fondateur et la base de documents déjà lus, non. La défendabilité est faible au départ ; elle se construit par l'accumulation de fonds contrôlés et de relations.                                                                |
| ChatGPT rend-il le produit inutile ?        | Pour une relecture ponctuelle par un RCCI à l'aise, en partie. Pas pour une revue datée, sourcée et reproductible sur une gamme, avec mémoire des versions.                                                                                                                            |
| Événement destructeur de demande            | SFDR 2.0 change les règles en 2029 (S9) : la demande pourrait se déplacer vers « préparer les nouvelles catégories ». C'est aussi une deuxième vague de besoin.                                                                                                                        |
| Blocage réglementaire                       | **Consultation juridique réservée** (loi n° 71-1130) : un service qui dit « votre fonds est conforme » pourrait être qualifié de consultation juridique. Parade : constats documentaires factuels, jamais d'avis de conformité, et validation par un avocat avant la première facture. |
| Canal trop cher                             | Peu probable : la prospection est directe, l'univers est fini et public.                                                                                                                                                                                                               |
| Hypothèse la plus dangereuse                | **H2** : les SGP achètent ce service à une petite structure extérieure (voir `hypotheses.md`).                                                                                                                                                                                         |
| Ce qui suffirait à abandonner               | 40 sociétés qualifiées contactées, ≥ 10 entretiens, 0 pilote payé ni engagement écrit, avec des objections qui portent sur le besoin (et pas sur le prix ou le calendrier).                                                                                                            |

---

## B — Réexamen de gouvernance produit « durabilité », pour distributeurs

- **Client** : CIF de plus de 50 clients (~1 470 structures, S1), PSI de taille moyenne, courtiers et plateformes. Obligation de réexamen régulier applicable aux CIF par renvoi (RG AMF 325-31 → 313-18 à 313-27, S15).
- **Douleur documentée par le régulateur** (S2) : dépendance aux producteurs, EET hétérogènes, marchés cibles repris à l'identique, réexamen périodique absent chez 3 établissements sur 5.
- **Concurrents** : Quantalys (Pro+ ≈ 2 000 € HT/an en 2022, S12) et son module ESG 360 ; O2S (Harvest), Manymore (S13) ; Morningstar. **Différence apportée** : non pas une note ESG de plus, mais un **contrôle de cohérence** entre ce que le producteur déclare (EET) et ce que ses propres documents disent — la « bonne pratique » citée par l'AMF.
- **Prix testable** : 150–400 € HT/mois, ou 900–1 500 € HT par revue semestrielle.
- **Stress test** : capacité de paiement médiane faible (CA CIF médian 13 k€, S1) ⇒ il faut viser le quintile supérieur ; les éditeurs installés peuvent ajouter la fonction ; l'accès aux fichiers EET n'est pas garanti hors relation producteur [À VÉRIFIER]. **Abandon si** : les 15 premiers distributeurs interrogés déclarent tous que leur logiciel actuel couvre déjà le besoin.

## D — Relecture conformité des documents commerciaux de fonds

- **Preuve de marché** : aux États-Unis, la relecture assistée des communications commerciales est un marché établi (Saifr, Red Oak, ACA, S14). En Europe, l'ESMA a publié le 01/07/2025 des notes thématiques sur les allégations de durabilité dans les communications non réglementaires (S10).
- **Pourquoi pas en premier** : périmètre trop large pour une seule personne (MiFID II, PRIIPs, AMF, publicité financière), risque élevé de « consultation juridique », et pas d'avantage spécifique hors ESG. **Rôle** : extension naturelle de A une fois la relation installée (« on relit aussi vos plaquettes ESG »).

## F — Veille réglementaire personnalisée pour RCCI

- **Problème réel** (SFDR 2.0 en trilogue, S9 ; DORA, S17 ; synthèses SPOT), mais substituts **gratuits** abondants (associations professionnelles, lettres de cabinets). Volonté de payer faible et non différenciante.
- **Rôle retenu** : **outil d'acquisition** pour A et B — une note mensuelle courte « ce qui a changé pour vos noms de fonds et vos annexes SFDR », envoyée aux prospects.

## E — Due diligence documentaire des fonds non cotés en UC, pour CGP

- **Fenêtre** : quotes-parts minimales de non coté en gestion pilotée (S18) ; univers de fonds encore restreint et frais élevés selon les professionnels interrogés par la presse.
- **Fit fondateur** : le plus fort de la liste (private equity, sélection de fonds institutionnelle).
- **Pourquoi pas en premier** : volumes faibles, documentation souvent non publique, responsabilité de l'avis plus lourde, et pas d'actif Seedow directement réutilisable (Seedow est construit sur des fonds cotés et des documents publics).
- **Rôle** : piste de développement à 6–12 mois si B fonctionne (même acheteur).

---

## Option de repli hors finance — Q, allégations environnementales des marques

- **Déclencheur réglementaire** : directive 2024/825, applicable depuis le 27/09/2026 ; allégations génériques interdites sauf justification (S16). Transposition française via le projet de loi DDADUE, en cours mi-2026 [À VÉRIFIER à date].
- **Réutilisation** : la logique « revendication citée + preuve citée + aucune inférence » est la même.
- **Faiblesses** : clients très fragmentés, pas de réseau du fondateur, achats ponctuels, concurrence des avocats et agences.
- **Usage** : à tester seulement si A et B échouent selon les critères fixés.
