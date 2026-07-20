# Build in public — calendrier LinkedIn 30 jours + 5 premiers posts

> Compte personnel du fondateur, pas la page entreprise. Objectif : que le réseau
> finance (SKEMA, banque, marché) devienne le premier cercle de diffusion.
>
> Règles de rédaction communes :
> - Première ligne = accroche seule, avant le « voir plus ». Jamais de lien dans le corps (le mettre en premier commentaire).
> - Un post = une idée. Pas de hashtags au-delà de 3. Pas d'emojis en rafale.
> - Chaque chiffre produit cité doit être vérifiable dans Seedow au moment de la publication — remplacer tous les `[X]` par les vraies valeurs.
> - Jamais de recommandation d'achat/vente ni de « ce fonds est bon/mauvais » : des données, des questions, de la méthode. (Cadre non-conseil, cf. `FINFLUENCEURS_PRESSE.md`.)
> - Répondre à tous les commentaires dans les 2 h suivant la publication.

## Calendrier 30 jours (5 posts/semaine, lun–ven)

Quatre types de posts en rotation :
**[C]oulisses** (histoire, décisions, doutes) · **[D]onnées** (mini-analyses avec captures Seedow) · **[P]édagogie** (décoder le jargon ESG/SFDR) · **[T]raction** (chiffres d'avancement honnêtes).

| Jour | Type | Sujet |
|---|---|---|
| J1 | C | **Le pivot** : pourquoi j'ai abandonné l'idée du robo-advisor pour la détection de greenwashing (post complet ci-dessous) |
| J2 | P | « Article 8, Article 9 : ce que ces étiquettes disent vraiment (et surtout ce qu'elles ne disent pas) » (post complet ci-dessous) |
| J3 | D | Première mini-analyse : un fonds « durable » grand public passé au crible Seedow (post complet ci-dessous) |
| J4 | C | Ce que 10 ans de finance m'ont appris sur ce qu'on ne montre pas au client (post complet ci-dessous) |
| J5 | T | Chiffres semaine 1 de la beta, sans filtre : inscrits, activés, ce qui n'a pas marché (post complet ci-dessous) |
| J8 | P | « Pourquoi un fonds peut être déclassé d'Article 9 à Article 8 sans que son portefeuille change » |
| J9 | C | La règle que je me suis fixée : chaque signal de greenwashing doit afficher ses raisons. Pourquoi c'est plus dur (et plus lent) que de mettre une note sur 100 |
| J10 | D | Les 5 fonds les plus recherchés sur Seedow cette semaine — et ce que leurs données de transparence ont en commun |
| J11 | P | « Un score ESG de 72… selon qui ? » Pourquoi deux agences peuvent noter le même fonds A et C, et comment on gère ça |
| J12 | T | Rétention J7 de la première cohorte : le chiffre, et les 3 choses qu'on change à cause de lui |
| J15 | C | Le message le plus dur reçu d'un utilisateur cette semaine, et ce qu'on en fait |
| J16 | D | « Données complètes / partielles / estimées » : la répartition réelle sur l'univers de fonds couvert par Seedow |
| J17 | P | Les lignes directrices ESMA sur les noms de fonds, expliquées en 60 secondes : pourquoi votre fonds a peut-être changé de nom récemment |
| J18 | C | Construire seul avec un budget de 0 € : mon stack complet et ce que ça coûte vraiment par mois |
| J19 | T | Le fonds le plus vérifié du mois sur Seedow + le verbatim utilisateur de la semaine |
| J22 | P | « Frais de 1,8 % sur un fonds "vert" : ce que ça mange sur 20 ans » (calcul simple, comparatif public) |
| J23 | D | J'ai comparé un fonds ISR et son équivalent ETF monde sur les données que Seedow trace : transparence, frais, alignement des promesses |
| J24 | C | Pourquoi Ethi (notre assistant IA) n'a pas le droit de donner un conseil d'investissement — et comment on l'en empêche techniquement |
| J25 | T | 1 mois de build in public : ce que ça a réellement apporté (chiffres LinkedIn → inscrits → activés) |
| J26 | P | Comment lire un DIC/DICI en 3 minutes : les 4 lignes qui comptent |
| J29 | D | Mini-analyse à la demande : le fonds le plus demandé en commentaires la semaine dernière |
| J30 | C | Bilan du mois 1 de la beta : les 3 hypothèses validées, les 2 invalidées, la suite |

> Les jours « creux » (week-ends) : pas de post, mais 15 min de commentaires utiles sous les posts d'autres comptes finance durable — c'est ce qui nourrit la portée de la semaine suivante.
>
> Si une actualité ESMA/SFDR/AMF tombe : elle **remplace** le post du jour (voir `NEWSJACKING.md`), le post prévu glisse au jour suivant.

---

## Post 1 (J1) — Le pivot [Coulisses]

> J'ai passé [X] mois à construire un robo-advisor. Je l'ai jeté.
>
> L'idée de départ de Seedow était raisonnable : un portefeuille durable, automatisé, aligné sur vos convictions. Le problème, c'est qu'en construisant la partie « durable », j'ai passé des semaines dans les données des fonds ESG. Et ce que j'y ai trouvé m'a occupé bien plus que l'algorithme d'allocation.
>
> Des fonds « Article 9 » — la catégorie la plus exigeante de la réglementation européenne — déclassés en Article 8 par vagues entières. Des fonds rebaptisés discrètement quand les règles de l'ESMA sur les noms « verts » sont entrées en application. Des scores ESG affichés fièrement… calculés sur des données déclaratives, avec des trous partout.
>
> Venant de [ton expérience : la banque / les marchés], je savais que l'asymétrie d'information existait. Je n'avais pas mesuré à quel point elle était la norme sur les produits vendus aux particuliers comme « responsables ».
>
> Donc j'ai pivoté. Seedow n'est plus un robo-advisor. C'est l'inverse d'un vendeur : un outil qui vous montre ce que les fonds ne disent pas. Vous tapez le nom d'un fonds, vous obtenez son score ESG sourcé, un indice de transparence des données, et un signal de risque de greenwashing — toujours accompagné de ses raisons, jamais un verdict opaque.
>
> C'est gratuit, ça marche sans compte, et la beta ouvre [date].
>
> Pendant les 30 prochains jours, je partage ici les coulisses : les chiffres réels, ce qui marche, ce qui rate, et des analyses de fonds avec nos données. Si vous travaillez en finance, vous allez reconnaître des choses.
>
> Premier épisode demain : ce que « Article 8 » veut vraiment dire. Spoiler : pas ce que la plaquette laisse entendre.

*(Lien seedow.life en premier commentaire : « Le vérificateur de fonds est là → seedow.life »)*

⏱ 20 min de finalisation (remplir les crochets) + 45 min de gestion des commentaires.

---

## Post 2 (J2) — Article 8 / Article 9 [Pédagogie]

> « Mon fonds est Article 9, donc c'est du solide. » Non. Et ce n'est même pas la bonne question.
>
> SFDR, la réglementation européenne sur la finance durable, classe les fonds en trois catégories. En clair :
>
> Article 6 : le fonds ne prétend rien de particulier sur la durabilité.
> Article 8 : le fonds dit « promouvoir des caractéristiques » environnementales ou sociales. C'est déclaratif, et le niveau d'exigence réel varie énormément d'un fonds à l'autre.
> Article 9 : le fonds affiche un objectif d'investissement durable. La catégorie la plus stricte sur le papier.
>
> Ce que la plaquette ne dit pas :
>
> 1. Ce classement est **auto-déclaré** par la société de gestion. Ce n'est pas un label décerné par un régulateur après contrôle.
> 2. Il y a eu des vagues massives de déclassements d'Article 9 vers Article 8 ces dernières années. Le portefeuille de ces fonds n'a souvent pas changé — c'est la promesse qui a été révisée à la baisse, discrètement.
> 3. Un fonds Article 8 peut détenir des choses qui vous surprendraient. « Promouvoir des caractéristiques ESG » est une formulation suffisamment souple pour couvrir des réalités très différentes.
> 4. La réglementation elle-même est en cours de refonte — signe que même le régulateur reconnaît que ces catégories ont été utilisées comme des arguments marketing plutôt que comme des engagements.
>
> La bonne question n'est pas « quel est l'article du fonds ? » mais : **« les données du fonds sont-elles cohérentes avec ce qu'il revendique ? »**
>
> C'est exactement ce que fait Seedow : pour chaque fonds, on croise les revendications (article SFDR, vocabulaire « vert » du nom) avec les données observables (scores, exclusions, empreinte carbone, complétude des données). Quand ça ne colle pas, on le signale — avec les raisons en clair.
>
> Demain : je passe un vrai fonds grand public au crible, en public.

*(Premier commentaire : « Vérifiez votre propre fonds ici, sans compte → seedow.life »)*

⏱ 15 min de relecture. Prêt à publier tel quel.

---

## Post 3 (J3) — Première mini-analyse [Données]

> J'ai passé [nom du fonds — choisir un fonds très diffusé en assurance-vie] au crible de Seedow. Voici ce que les données disent. Et ce qu'elles ne disent pas.
>
> Ce fonds, vous l'avez peut-être en assurance-vie : [encours ~X Md€, classé Article 8/9, présent chez les grands distributeurs].
>
> Ce que Seedow observe (données publiques, méthodologie ouverte — lien en commentaire) :
>
> ✅ Ce qui est solide :
> — [ex. : score ESG de X, au-dessus de la médiane de sa catégorie]
> — [ex. : exclusions charbon/tabac effectivement documentées]
>
> ⚠️ Ce qui interroge :
> — Transparence des données : [complète / partielle / estimée] — [ex. : l'empreinte carbone du portefeuille n'est pas publiée, le chiffre disponible est une estimation]
> — [ex. : le fonds revendique l'Article 8 mais X % des données extra-financières nécessaires pour le vérifier sont manquantes]
> — Frais courants : [X] % — sur 20 ans, à rendement égal, c'est [X] € de moins sur 10 000 € investis qu'un ETF monde à 0,2 %
>
> Mon point n'est PAS « ce fonds est mauvais » — je n'en sais rien, et ce n'est pas mon rôle de vous dire quoi acheter. Mon point : **avant Seedow, vérifier ça vous aurait pris une après-midi dans des PDF de 200 pages.** Là, 10 secondes.
>
> La question à poser à votre conseiller la prochaine fois : « sur quelles données repose le caractère durable de ce fonds, et lesquelles sont estimées plutôt que mesurées ? » Sa réponse vous en dira long.
>
> Quel fonds je passe au crible la semaine prochaine ? Proposez en commentaire, je prends le plus demandé.

*(Premier commentaire : lien seedow.life + lien méthodologie. La demande « proposez un fonds » crée l'engagement ET le sujet du post J29.)*

⚠️ **Prudence (important)** : uniquement des faits sourcés et vérifiables dans le produit, formulés comme des observations de données (« la donnée X n'est pas publiée ») et jamais comme des jugements (« ce fonds trompe ses clients »). Garder la capture d'écran Seedow correspondante. Ne pas cibler un petit acteur : un grand fonds institutionnel très diffusé est un sujet d'intérêt général.

⏱ 1 h 30 (analyse + remplissage + captures).

---

## Post 4 (J4) — Ce que la banque m'a appris [Coulisses]

> En [X] années en [banque / salle de marché / gestion], je n'ai jamais vu un client demander la donnée qui compte vraiment.
>
> Les clients demandent la performance. Parfois les frais. Presque jamais : « d'où vient ce chiffre ? »
>
> Et c'est normal — tout, dans la présentation d'un produit financier, est fait pour que la question ne se pose pas. Une plaquette est une œuvre de mise en confiance : le score en gros, la méthodologie en note de bas de page, les données manquantes nulle part.
>
> Quand j'ai commencé à construire Seedow, j'ai pris le problème à l'envers. La règle que je me suis fixée : **chaque chiffre affiché doit répondre à « d'où ça vient ? » en un clic.** Score ESG → source. Signal de greenwashing → la liste des raisons, en français. Donnée manquante → on l'affiche comme manquante, on ne la maquille pas en moyenne.
>
> C'est plus lent à construire qu'un score sur 100 balancé sans explication. Ça fait des fiches moins « propres » — il y a des trous visibles, des mentions « donnée estimée ». Mais c'est exactement le contrat : un outil qui vous montre aussi ce qu'on ne sait PAS.
>
> Dans la finance que j'ai connue, l'asymétrie d'information est un modèle d'affaires. Seedow parie sur l'inverse : la transparence comme produit.
>
> (Et si vous travaillez encore côté banque et que vous lisez ça : vous savez que j'ai raison. Écrivez-moi, je cherche des regards critiques pour la beta.)

*(Le dernier paragraphe est un recruteur silencieux : il transforme le réseau bancaire en testeurs.)*

⏱ 15 min de personnalisation (remplir l'expérience réelle).

---

## Post 5 (J5) — Chiffres semaine 1, sans filtre [Traction]

> Semaine 1 de la beta ouverte de Seedow. Voici les vrais chiffres, y compris ceux qui piquent.
>
> 📊 Ce qui s'est passé :
> — [X] fonds vérifiés via le quick check public
> — [X] inscriptions à la beta ([X] % venant de LinkedIn, [X] % du bouche-à-oreille)
> — [X] utilisateurs ont créé un portefeuille ou une watchlist — c'est MA métrique, le reste est de la vanité
> — Fonds le plus recherché : [nom] ([X] recherches)
>
> 📉 Ce qui pique :
> — [ex. : X % des visiteurs repartent sans tester le quick check → le hero de la landing ne fait pas le job, on teste 3 accroches]
> — [ex. : la rétention J1 est de X % — les gens vérifient UN fonds et partent. Vérifier, c'est ponctuel ; suivre, c'est récurrent. D'où la priorité de la semaine 2 : les alertes sur la watchlist]
> — [un bug ou raté honnête]
>
> 🧠 L'apprentissage de la semaine :
> [ex. : les gens ne cherchent pas « un fonds durable ». Ils cherchent LEUR fonds — celui de leur assurance-vie — pour savoir s'ils se sont fait avoir. L'usage réel n'est pas la découverte, c'est la contre-expertise. Toute la roadmap vient de bouger.]
>
> Merci aux [X] premiers. La semaine prochaine : [prochaine brique].
>
> Je continue à tout partager ici, les bonnes semaines comme les mauvaises. C'est le contrat du build in public — et venant de la finance, un secteur qui ne montre que ce qui monte, ça me fait un bien fou.

*(Les chiffres viennent des vues `beta_retention_cohorts` et `app_events` déjà en place. Un post de traction honnête sur-performe systématiquement un post de traction flatteur.)*

⏱ 45 min (extraction des chiffres + rédaction).
