# 13 — Financial Model (conceptuel, 3-5 ans)

> **Modèle conceptuel, pas prévision.** Point de départ réel : **revenu = 0, traction = UNKNOWN.** Toutes les entrées sont des HYPOTHÈSES explicites, à remplacer par des cohortes réelles. Objet : montrer la _forme_ de l'économie et ce qui la fait basculer.

## Hypothèses transverses

- Marché initial France, extension UE en année 3.
- Modèle : **Freemium B2C (abonnement ~50 €/an) + licence data B2B à partir de l'année 2** (`07`).
- Marge brute logicielle ~80 % ; coût IA compris.
- Équipe petite au départ (fondateur + 2-4), montant salaires = poste dominant.

## Trois scénarios (utilisateurs actifs annuels de fin d'année)

| An  | BEAR (inscrits / payants / ARR)   | BASE                          | BULL                          |
| --- | --------------------------------- | ----------------------------- | ----------------------------- |
| A1  | 5 k / 150 / ~7 k€                 | 15 k / 600 / ~30 k€           | 40 k / 2 400 / ~120 k€        |
| A2  | 12 k / 400 / ~20 k€ + data pilote | 50 k / 2 500 / ~125 k€ + data | 150 k / 12 k / ~600 k€ + data |
| A3  | 25 k / 900 / ~50 k€               | 150 k / 9 k / ~500 k€ + B2B   | 450 k / 45 k / ~2,5 M€ + B2B  |

_(Conversion payante : BEAR 3 % / BASE ~5-6 % / BULL ~10-12 % ; ARPU 40/50/60 € — cf. `08`.)_

## Structure de coûts (annuelle, ordre de grandeur — ESTIMATION)

| Poste                                    | A1              | Note                                   |
| ---------------------------------------- | --------------- | -------------------------------------- |
| Salaires (2-4 pers.)                     | 250-450 k€      | poste dominant                         |
| Infra (Cloud/Edge)                       | 5-20 k€         | scalable, faible                       |
| **IA (Ethi)**                            | 10-60 k€        | **variable, à surveiller**             |
| Données (marché gratuit / ESG premium ?) | 0-100 k€        | bascule si MSCI/Sustainalytics premium |
| Juridique / conformité                   | 20-80 k€        | ↑ fortement si option « exécution »    |
| Marketing                                | 20-150 k€       | selon scénario                         |
| **Total burn A1**                        | **~350-700 k€** |                                        |

## Lecture

- **A1 : ARR ≪ burn dans tous les scénarios** → phase d'investissement pure, financée par une levée (`14`). Normal à ce stade.
- **Le point de bascule n'est pas B2C seul** : dans BASE, le B2C ne couvre jamais le burn à 3 ans. **Ce sont la licence data B2B et/ou le passage au % d'encours (exécution) qui rendent l'économie viable.**
- **BEAR = zombie** : produit vivant, jamais rentable → scénario le plus probable _si rien ne change_ (pas d'exécution, pas de B2B). C'est le risque réaliste, pas le pire.
- **Cash burn / runway** : dépend entièrement du montant levé ; avec ~700 k€-1 M€ levés, ~12-18 mois de runway au burn BASE.

## Ce qui ferait mentir ce modèle (dans les deux sens)

- **↑** : une boucle virale (certificat/Vote) à CAC ~0 + un contrat B2B2C d'ancrage (néobanque/mutuelle) → BULL crédible.
- **↓** : conversion payante < 3 % (probable sur un simulateur), coût IA dérapant, ou donnée ESG premium obligatoire → BEAR.

> Conclusion : le modèle **ne tient pas sur le B2C d'abonnement seul**. La viabilité passe par **data B2B** et/ou **exécution (% d'encours)**. Toute conversation d'investisseur doit porter là-dessus, pas sur le nombre d'inscrits.
