# Liste des 40 sociétés de gestion cibles

> Construite le **2026-10-09** depuis **GECO**, la base publique de l'AMF, par `scripts/build-sgp-prospects.ts`. Fichier de travail : [`data/prospects/sgp-cibles-2026-10-09.csv`](../../data/prospects/sgp-cibles-2026-10-09.csv). Il contient les colonnes de suivi du `06`, vides : contact, source du contact, dates, issue.
>
> **Aucune personne n'a été identifiée ni contactée.** La liste ne contient que des données publiques sur des sociétés : nom, numéro d'agrément, site, siège, standard, fonds. Le nom du RCCI ou du dirigeant reste à trouver à la main, en notant la source, sans jamais deviner une adresse e-mail.

## Méthode

1. **Collecte** : la recherche publique de fonds de GECO est interrogée avec chaque terme du lexique ESMA (FR/EN, forme accentuée et non accentuée), soit 50 requêtes, toutes pages comprises.
2. **Filtre fonds** : compartiment vivant, de droit français, ouvert à tous souscripteurs, géré par une société française. Le nom doit déclencher un terme ESMA en mot entier (`detectNameTerms`), car la recherche GECO fonctionne par sous-chaîne.
3. **Résultat brut** : **743 fonds, 112 sociétés de gestion** (`data/prospects/geco-fonds-esg-2026-10-09.json`, `geco-sgp-2026-10-09.json`).
4. **Exclusions** (motif par société en annexe) :
   - 41 sociétés rattachées à un groupe bancaire, assurantiel ou public ;
   - 8 très grands gérants ;
   - 4 sociétés dont le seul terme reconnu est « évolution ».
5. **Classement** des 59 sociétés restantes :
   - **P1** : au moins 3 fonds ESG grand public, une gamme qui remplit un pilote de 10 fonds ;
   - **P2** : 2 fonds ;
   - **P3** : 1 fonds au nom clairement environnemental ou durable.

   Les 19 sociétés suivantes forment la réserve.

## Les 40 cibles

Colonnes : nombre de fonds ESG grand public / nombre total de compartiments dans GECO (approximation de la taille de la gamme), socles d'exclusions appelés par les noms, trois premiers fonds.

| #   | Prio. | Société                                                  | Agrément    | Fonds ESG / total | Socles  | Fonds (extrait)                                                                                                                                                         | À vérifier                                                                                        |
| --- | ----- | -------------------------------------------------------- | ----------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | P1    | ERES GESTION                                             | GP-07000005 | 14 / 176          | CTB+PAB | ACTIONS SOLIDAIRES ISR · ERES MULTI ISR COURT TERME · ERES MULTI ISR ENVIRONNEMENT · +11                                                                                |                                                                                                   |
| 2   | P1    | FINANCIERE DE L'ECHIQUIER                                | GP91004     | 11 / 83           | PAB     | TOCQUEVILLE SILVER AGE ISR · ECHIQUIER ALPHA MAJOR SRI · ECHIQUIER ARTY SRI · +8                                                                                        | Actionnariat : participation possible d'un groupe bancaire — à vérifier                           |
| 3   | P1    | MANDARINE GESTION                                        | GP-08000008 | 8 / 127           | CTB+PAB | MAM TRANSITION DURABLE ACTIONS · MANDARINE PATRIMOINE DURABLE · PROXIMITE RENDEMENT DURABLE · +5                                                                        |                                                                                                   |
| 4   | P1    | MANSARTIS GESTION                                        | GP90045     | 7 / 21            | PAB     | MANSARTIS AMERIQUE ISR · MANSARTIS ASIE ISR · MANSARTIS INVESTISSEMENTS ISR · +4                                                                                        |                                                                                                   |
| 5   | P1    | MONTPENSIER ARBEVEL                                      | GP97125     | 5 / 51            | PAB     | AESCULAPE SRI · BEST BUSINESS MODELS SRI · M SPORT SOLUTIONS SRI · +2                                                                                                   |                                                                                                   |
| 6   | P1    | 1 2 3 INVESTMENT MANAGERS                                | GP01021     | 5 / 99            | CTB+PAB | IMPACT SENIOR · 123 TRANSITION ENERGETIQUE · SOLIDAIRE MAIF 2014 · +2                                                                                                   |                                                                                                   |
| 7   | P1    | GAY-LUSSAC GESTION                                       | GP95001     | 3 / 27            | PAB     | COLGATE PALMOLIVE ACTIONS DURABLES · GAY-LUSSAC GREEN IMPACT · GAY-LUSSAC IMPACT SOCIAL                                                                                 |                                                                                                   |
| 8   | P1    | LA FINANCIERE RESPONSABLE                                | GP-08000001 | 3 / 4             | PAB     | LFR EURO DEVELOPPEMENT DURABLE ISR · LFR ACTIONS SOLIDAIRES ISR · LFR INCLUSION RESPONSABLE ISR                                                                         |                                                                                                   |
| 9   | P1    | WORMSER FRERES GESTION                                   | GP97088     | 3 / 39            | PAB     | WF Continuation Durable · WF FCPE VALEURS INTERNATIONALES DURABLES · WF VALEURS INTERNATIONALES DURABLES                                                                |                                                                                                   |
| 10  | P1    | EIFFEL INVESTMENT GROUP                                  | GP-10000035 | 3 / 68            | PAB     | EIFFEL NOVA EUROPE ISR · EIFFEL HIGH YIELD LOW CARBON · FONDS EIFFEL GAZ VERT S.L.P.                                                                                    |                                                                                                   |
| 11  | P1    | INDEP'AM                                                 | GP-06000016 | 3 / 16            | CTB+PAB | INDEP ACTIONS ISR BAS CARBONE · INDEP INDEXACTIONS EURO ESG · GARANCE ÉQUILIBRE ET SOLIDAIRE                                                                            |                                                                                                   |
| 12  | P1    | IMPACT PARTNERS                                          | GP-08000053 | 3 / 13            | PAB     | IMPACT CREATION ILE-DE-FRANCE · IMPACT CREATION I · IMPACT PARTENAIRES III                                                                                              |                                                                                                   |
| 13  | P1    | SANSO LONGCHAMP ASSET MANAGEMENT                         | GP-11000033 | 3 / 53            | PAB     | SANSO SMART CLIMATE · SANSO CARBON INITIATIVE TRENDS · APICIL MONDE ACTIONS RESPONSABLES                                                                                |                                                                                                   |
| 14  | P1    | SWEN CAPITAL PARTNERS                                    | GP-14000047 | 3 / 62            | PAB     | BLUE OCEAN · SWEN IMPACT FUND FOR TRANSITION · SWEN IMPACT FUND FOR TRANSITION 2                                                                                        | Actionnariat : lien possible avec un groupe d'assurance — à vérifier                              |
| 15  | P1    | MERIDIAM                                                 | GP-14000003 | 4 / 31            | PAB     | MERIDIAM SUSTAINABLE INFRASTRUCTURE EASTERN EUROPE IV · MERIDIAM SUSTAINABLE INFRASTRUCTURE EUROPE IV · MERIDIAM SUSTAINABLE INFRASTRUCTURE EUROPE IV PARALLEL SLP · +1 | Gérant d'infrastructures surtout institutionnel : vérifier la distribution réelle au grand public |
| 16  | P2    | DEMEA SUSTAINABLE INVESTMENT                             | GP-05000027 | 2 / 17            | PAB     | FMET-FONDS DE MODERNISATION ECOLOGIQUE DES TRANSPORTS · PARIS FONDS VERT                                                                                                |                                                                                                   |
| 17  | P2    | TAILOR AM                                                | GP90031     | 2 / 23            | PAB     | TAILOR ACTIONS AVENIR ISR · LYSIS ESG THEMATICS                                                                                                                         |                                                                                                   |
| 18  | P2    | C-QUADRAT ASSET MANAGEMENT FRANCE                        | GP97124     | 2 / 9             | PAB     | C-QUADRAT GLOBAL EQUITY ESG · C-QUADRAT GREENSTARS ESG FLEXIBLE                                                                                                         |                                                                                                   |
| 19  | P2    | Althéis                                                  | GP-15000014 | 2 / 3             | PAB     | YOMONI ALLOCATION ESG · YOMONI MONDE ESG                                                                                                                                |                                                                                                   |
| 20  | P2    | AMIRAL GESTION                                           | GP-04000038 | 2 / 48            | PAB     | AMIRAL CLIMATE SOLUTIONS – DEBT FUND 1 · SEXTANT CLIMATE TRANSITION EUROPE                                                                                              |                                                                                                   |
| 21  | P2    | PHILIPPE HOTTINGUER GESTION - Groupe Philippe HOTTINGUER | GP-11000021 | 2 / 6             | PAB     | ABACUS GREEN DEAL · ABACUS CREDIT IMPACT                                                                                                                                |                                                                                                   |
| 22  | P2    | SUNNY ASSET MANAGEMENT                                   | GP-08000045 | 2 / 59            | CTB+PAB | SUNNY GREEN BONDS 2028 · CP INVEST EVOLUTION                                                                                                                            |                                                                                                   |
| 23  | P2    | QUAERO CAPITAL (FRANCE) SAS                              | GP-14000016 | 2 / 14            | PAB     | Quaero Water Infra Fund S.L.P. · QUAERO BONDS IMPACT OPPORTUNITIES                                                                                                      |                                                                                                   |
| 24  | P3    | EQUIGEST                                                 | GP99020     | 1 / 13            | PAB     | EQUI-DEVELOPPEMENT DURABLE                                                                                                                                              |                                                                                                   |
| 25  | P3    | OCTOBER FACTORY                                          | GP-16000030 | 1 / 7             | PAB     | FONDS ASSUREURS - CDC RELANCE DURABLE TOURISME                                                                                                                          |                                                                                                   |
| 26  | P3    | MONTAIGNE CAPITAL                                        | GP-09000024 | 1 / 10            | PAB     | MC LEADERS DURABLES                                                                                                                                                     |                                                                                                   |
| 27  | P3    | SAGIS ASSET MANAGEMENT                                   | GP-13000024 | 1 / 12            | PAB     | S ACTIONS DURABLES MIROVA                                                                                                                                               |                                                                                                   |
| 28  | P3    | GEFIP - GESTION FINANCIERE PRIVEE                        | GP90043     | 1 / 8             | PAB     | GEFIP EUROLAND ISR                                                                                                                                                      |                                                                                                   |
| 29  | P3    | KEREN FINANCE                                            | GP01001     | 1 / 16            | PAB     | KEREN CREDIT ISR                                                                                                                                                        |                                                                                                   |
| 30  | P3    | AURIS GESTION                                            | GP-04000069 | 1 / 145           | PAB     | LC EURO TUTELLE ISR                                                                                                                                                     |                                                                                                   |
| 31  | P3    | ARGOS FRANCE S.A.S                                       | GP-05000033 | 1 / 20            | PAB     | ARGOS CLIMATE F&F                                                                                                                                                       |                                                                                                   |
| 32  | P3    | FIDEAS CAPITAL SAS                                       | GP-07000046 | 1 / 12            | PAB     | FIDEAS ACT FOR CLIMATE                                                                                                                                                  |                                                                                                   |
| 33  | P3    | KANOPY AM                                                | GP-10000038 | 1 / 2             | PAB     | KANOPY ACTIVE CLIMATE TRANSITION                                                                                                                                        |                                                                                                   |
| 34  | P3    | HOMA CAPITAL                                             | GP-11000002 | 1 / 11            | PAB     | GREEN AND IMPACT BOND FRANCE                                                                                                                                            |                                                                                                   |
| 35  | P3    | SAINT OLIVE GESTION                                      | GP-05000016 | 1 / 29            | PAB     | SOLAR AKICITA                                                                                                                                                           |                                                                                                   |
| 36  | P3    | DAUPHINE AM                                              | GP-17000033 | 1 / 4             | PAB     | AMBITION POUR LA PLANETE                                                                                                                                                |                                                                                                   |
| 37  | P3    | MCA FINANCE                                              | GP90116     | 1 / 22            | PAB     | GESTION PRIVEE PLANETE                                                                                                                                                  |                                                                                                   |
| 38  | P3    | UZES GESTION                                             | GP-04000053 | 1 / 26            | CTB     | FCPE TRECENTO OBLIGATAIRE SOLIDAIRE                                                                                                                                     | Seul fonds retenu : un FCPE (épargne salariale)                                                   |
| 39  | P3    | HORIZON ASSET MANAGEMENT                                 | GP-16000018 | 1 / 10            | PAB     | HORIZON IMPACT - COMPARTIMENT FRANCE HABITAT                                                                                                                            |                                                                                                   |
| 40  | P3    | RCUBE ASSET MANAGEMENT                                   | GP-13000027 | 1 / 6             | CTB     | GBI GOOD GOVERNANCE UCITS                                                                                                                                               |                                                                                                   |

## Ce que la liste montre, et ce qu'elle ne montre pas

- **Hypothèse H1 (≥ 60 cibles qualifiées) : juste sous le seuil.** 59 sociétés indépendantes passent les filtres. C'est la limite fixée dans `04` (condition n° 2). Le marché français seul est **petit** : il suffit pour un test de 30 jours, mais pas pour une entreprise à 50 clients sans le canal des cabinets de conformité (C), l'extension au Luxembourg et à la Belgique, ou l'alternative distributeurs (B). Ce constat renforce la priorité du canal C.
- **Couverture** : seuls les fonds trouvés par la recherche GECO sur les termes du lexique sont couverts. Un fonds au terme ESG absent du lexique n'apparaît pas. Les fonds étrangers commercialisés en France sont exclus volontairement : leur société de gestion n'est pas française.
- **Les rattachements de groupe** utilisés pour exclure une société relèvent de la connaissance générale, **pas d'une vérification documentaire**. Ils sont à confirmer avant d'écarter définitivement une société. Inversement, deux cibles portent la mention « actionnariat à vérifier ».
- **Ouvert à tous souscripteurs** (GECO) ne prouve pas une distribution effective au grand public. Exemple : Meridiam, gérant d'infrastructures surtout institutionnel.
- **Un nom ESG n'est pas un écart.** La liste dit qui est concerné par les orientations, pas qui est en défaut. Aucun message ne doit sous-entendre le contraire.
- Les données datent de la collecte du 2026-10-09. GECO est mis à jour en continu.

## Prochaines étapes (semaine 1 du `06`)

1. Pour chaque cible P1, trouver le nom du RCCI ou du dirigeant dans une source publique (site, documents réglementaires, profil professionnel), et noter la source dans `contact_source`.
2. Ouvrir la fiche GECO de 2 ou 3 fonds par cible (colonne `fiche_geco`) et relever un fait public pour la première ligne du message : article SFDR dans l'annexe, date du dernier document.
3. Envoyer les 10 premiers messages, uniquement sur autorisation explicite du fondateur.

## Annexe A — Réserve (19 sociétés, à mobiliser si une cible tombe)

| Société                      | Agrément    | Fonds ESG |     |
| ---------------------------- | ----------- | --------- | --- |
| CONQUEST ADVISORS FRANCE     | GP-21000022 | 1         |     |
| YOTTA CAPITAL PARTNERS       | GP-19000035 | 1         |     |
| SLATE Venture Capital        | GP-20240023 | 1         |     |
| AEDGIS                       | GP-20250002 | 1         |     |
| PRIVATE CORNER               | GP-20000038 | 1         |     |
| ALOE PRIVATE EQUITY          | GP03005     | 1         |     |
| NORD CAPITAL PARTENAIRES SAS | GP-10000039 | 1         |     |
| ATALANTE                     | GP-04000065 | 1         |     |
| ANDERA PARTNERS              | GP02029     | 1         |     |
| ALPHAJET FAIR INVESTORS      | GP-202162   | 1         |     |
| CITIZEN CAPITAL PARTENAIRES  | GP-10000045 | 1         |     |
| FAMAE IMPACT                 | GP-20000012 | 1         |     |
| FRENCHFOOD CAPITAL           | GP-17000005 | 1         |     |
| CAPITAL CROISSANCE SAS       | GP-12000028 | 1         |     |
| ESFIN GESTION SA             | GP-10000026 | 1         |     |
| RAISE                        | GP-18000007 | 1         |     |
| WEINBERG CAPITAL PARTNERS    | GP-05000018 | 1         |     |
| WENOVA ASSET MANAGEMENT      | GP-202212   | 1         |     |
| SMALT CAPITAL                | GP00046     | 1         |     |

## Annexe B — Sociétés exclues et motif

| Société                                        | Agrément    | Fonds ESG | Motif                                  |
| ---------------------------------------------- | ----------- | --------- | -------------------------------------- |
| AMUNDI ASSET MANAGEMENT                        | GP-04000036 | 91        | Groupe bancaire, assurantiel ou public |
| LBP AM                                         | GP-20000031 | 67        | Groupe bancaire, assurantiel ou public |
| BNP PARIBAS ASSET MANAGEMENT Europe            | GP96002     | 59        | Groupe bancaire, assurantiel ou public |
| VEGA INVESTMENT SOLUTIONS                      | GP-04000045 | 55        | Groupe bancaire, assurantiel ou public |
| OFI INVEST ASSET MANAGEMENT                    | GP92012     | 42        | Groupe bancaire, assurantiel ou public |
| CREDIT MUTUEL ASSET MANAGEMENT                 | GP97138     | 38        | Groupe bancaire, assurantiel ou public |
| NATIXIS INVESTMENT MANAGERS INTERNATIONAL      | GP90009     | 31        | Groupe bancaire, assurantiel ou public |
| CPR ASSET MANAGEMENT                           | GP01056     | 26        | Groupe bancaire, assurantiel ou public |
| SIENNA GESTION                                 | GP97020     | 24        | Groupe bancaire, assurantiel ou public |
| HSBC GLOBAL ASSET MANAGEMENT (FRANCE)          | GP99026     | 17        | Groupe bancaire, assurantiel ou public |
| ECOFI INVESTISSEMENTS                          | GP97004     | 17        | Groupe bancaire, assurantiel ou public |
| SOCIETE GENERALE GESTION                       | GP-09000020 | 14        | Groupe bancaire, assurantiel ou public |
| ARKEA ASSET MANAGEMENT                         | GP01036     | 13        | Groupe bancaire, assurantiel ou public |
| SWISS LIFE ASSET MANAGERS FRANCE               | GP-07000055 | 11        | Groupe bancaire, assurantiel ou public |
| LAZARD FRERES GESTION                          | GP-04000068 | 10        | Très grand gérant                      |
| AG2R LA MONDIALE GESTION D'ACTIFS              | GP03027     | 9         | Groupe bancaire, assurantiel ou public |
| MYRIA ASSET MANAGEMENT                         | GP-14000039 | 7         | Groupe bancaire, assurantiel ou public |
| MIROVA                                         | GP02014     | 6         | Groupe bancaire, assurantiel ou public |
| SYCOMORE ASSET MANAGEMENT                      | GP01030     | 5         | Groupe bancaire, assurantiel ou public |
| APICIL ASSET MANAGEMENT                        | GP98038     | 5         | Groupe bancaire, assurantiel ou public |
| ROTHSCHILD & CO ASSET MANAGEMENT               | GP-17000014 | 5         | Très grand gérant                      |
| PRO BTP FINANCE                                | GP97083     | 5         | Groupe bancaire, assurantiel ou public |
| PALATINE ASSET MANAGEMENT                      | GP-05000014 | 4         | Groupe bancaire, assurantiel ou public |
| GROUPAMA ASSET MANAGEMENT                      | GP93002     | 4         | Groupe bancaire, assurantiel ou public |
| Société Générale Investment Solutions (France) | GP-06000029 | 3         | Groupe bancaire, assurantiel ou public |
| PORTZAMPARC GESTION                            | GP97077     | 3         | Groupe bancaire, assurantiel ou public |
| ABN AMRO INVESTMENT SOLUTIONS                  | GP99027     | 3         | Groupe bancaire, assurantiel ou public |
| TIKEHAU INVESTMENT MANAGEMENT                  | GP-07000006 | 3         | Très grand gérant                      |
| OSTRUM ASSET MANAGEMENT                        | GP-18000014 | 2         | Groupe bancaire, assurantiel ou public |
| EDMOND DE ROTHSCHILD ASSET MANAGEMENT (FRANCE) | GP-04000015 | 2         | Très grand gérant                      |
| ZENCAP ASSET MANAGEMENT                        | GP-11000024 | 2         | Groupe bancaire, assurantiel ou public |
| PROMEPAR ASSET MANAGEMENT                      | GP92017     | 2         | Groupe bancaire, assurantiel ou public |
| AEW                                            | GP-07000043 | 2         | Groupe bancaire, assurantiel ou public |
| DORVAL ASSET MANAGEMENT                        | GP93008     | 2         | Groupe bancaire, assurantiel ou public |
| ODDO BHF ASSET MANAGEMENT SAS                  | GP99011     | 2         | Très grand gérant                      |
| EURAZEO INFRASTRUCTURE PARTNERS                | GP-202173   | 2         | Très grand gérant                      |
| AGRICA Gestion d'actifs                        | GP-04000005 | 2         | Groupe bancaire, assurantiel ou public |
| TRAIL SOLUTIONS PATRIMOINE                     | GP-04000041 | 2         | Seul terme reconnu : « évolution »     |
| NOVAXIA INVESTISSEMENT                         | GP-14000022 | 2         | Seul terme reconnu : « évolution »     |
| CARMIGNAC GESTION                              | GP97008     | 1         | Très grand gérant                      |
| COVEA FINANCE                                  | GP97007     | 1         | Groupe bancaire, assurantiel ou public |
| OFI INVEST REAL ESTATE                         | GP-17000003 | 1         | Groupe bancaire, assurantiel ou public |
| SCOR INVESTMENT PARTNERS SE                    | GP-09000006 | 1         | Groupe bancaire, assurantiel ou public |
| DNCA FINANCE                                   | GP00030     | 1         | Groupe bancaire, assurantiel ou public |
| BPIFRANCE INVESTISSEMENT                       | GP01006     | 1         | Groupe bancaire, assurantiel ou public |
| SWISSLIFE GESTION PRIVEE                       | GP00038     | 1         | Groupe bancaire, assurantiel ou public |
| BDF-GESTION                                    | GP97069     | 1         | Groupe bancaire, assurantiel ou public |
| MONCEAU IS                                     | GP-20250007 | 1         | Groupe bancaire, assurantiel ou public |
| IQ EQ Management                               | GP02023     | 1         | Très grand gérant                      |
| VAUBAN INFRASTRUCTURE PARTNERS                 | GP-19000044 | 1         | Groupe bancaire, assurantiel ou public |
| FIL GESTION                                    | GP03004     | 1         | Groupe bancaire, assurantiel ou public |
| ZENITH AM                                      | GP-11000028 | 1         | Seul terme reconnu : « évolution »     |
| SOGELYM DIXENCE INVESTMENT MANAGEMENT          | GP-15000011 | 1         | Seul terme reconnu : « évolution »     |
