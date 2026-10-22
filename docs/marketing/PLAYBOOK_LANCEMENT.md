# Seedow — Playbook de lancement beta ouverte (budget zéro)

> Plan maître. Chaque section détaillée vit dans son propre fichier de ce dossier :
>
> | Fichier | Contenu |
> |---|---|
> | `PLAYBOOK_LANCEMENT.md` (ce fichier) | Positionnement, accroches, priorités semaine 1, checklist jour J |
> | `LINKEDIN_30J.md` | Calendrier build in public 30 jours + 5 posts prêts à publier |
> | `NEWSJACKING.md` | Template de réaction à chaud + cartographie médias/comptes à taguer |
> | `ECOSYSTEMES_COMMUNAUTES.md` | Candidature Panorama Fintechs Durables, annuaires, messages communautés, réseau étudiant/alumni |
> | `PARRAINAGE_WAITLIST.md` | Mécanisme de parrainage à coût zéro + emails waitlist |
> | `VIDEO_COURTE.md` | 10 formats Reels/TikTok/Shorts + 3 scripts complets |
> | `FINFLUENCEURS_PRESSE.md` | Approche micro-créateurs + pitchs presse + garde-fous AMF/ESMA |

---

## 1. Le message qui tranche

### Positionnement en une phrase

> **Seedow vous montre ce que les fonds « durables » ne vous disent pas : pour chaque fonds, un score ESG sourcé, un indice de transparence des données, et un signal de risque de greenwashing toujours expliqué — gratuitement, en 10 secondes, sans compte.**

Version courte (bio, annuaires, une ligne) :

> **Le détecteur de greenwashing des fonds « durables ». Gratuit, sourcé, expliqué.**

Pourquoi ça tranche en 2026 :
- Le contexte réglementaire fait le travail d'éducation à notre place : vagues de déclassements SFDR Article 9 → Article 8, lignes directrices ESMA sur les noms de fonds utilisant des termes ESG/durables, revue de SFDR en cours au niveau européen, position AMF sur les allégations extra-financières. Le doute est déjà installé chez l'épargnant — Seedow est l'outil qui transforme ce doute en vérification.
- On ne se positionne PAS comme « une app ESG de plus » (marché saturé, promesse molle) mais comme **l'outil de contre-expertise de l'épargnant** : le fonds fait une promesse, Seedow vérifie la promesse.
- Chaque signal est **argumenté** (raisons en clair, lien « D'où vient ce chiffre ? ») : c'est notre défense juridique ET notre différenciateur de confiance. On ne dit jamais « ce fonds ment », on dit « voici ce que les données publiques montrent, et voici ce qu'elles ne montrent pas ».

### 3 accroches testables (A/B/C sur landing, posts, emails)

**A — Froide / factuelle**
> « Score ESG, transparence des données, cohérence entre les promesses et les chiffres : vérifiez n'importe quel fonds "durable" en 10 secondes. Gratuit, sans compte. »

**B — Choc / provocante**
> « Votre fonds "vert" a peut-être été déclassé sans que personne ne vous prévienne. Tapez son nom. Regardez. »

**C — Pédagogique**
> « "Article 9", "ISR", "impact"… ces labels ne disent pas ce que vous croyez. Seedow traduit le jargon des fonds durables en langage clair — et vous montre où les données manquent. »

**Protocole de test (coût zéro, 2 semaines)** : utiliser chaque accroche comme première ligne d'un post LinkedIn à une semaine d'intervalle (même heure, même jour de semaine), et comme objet de 3 variantes de l'email waitlist. Mesurer : taux de clic vers seedow.life, `search_performed` sur le quick check (déjà instrumenté dans `app_events`), inscriptions waitlist par `source`. Ajouter `?utm_content=accroche-a|b|c` sur chaque lien. L'accroche gagnante devient le hero de la landing.

⏱ Temps : 1 h pour brancher les UTM + 10 min par publication.

---

## 2. Les 3 actions à plus fort impact — semaine 1 de la beta ouverte

À faire dans cet ordre. Tout le reste du playbook s'y accroche.

### Action 1 — Publier le post LinkedIn « pivot » et lancer la cadence build in public (J1)
Le réseau finance existant (SKEMA, expériences bancaires, contacts marché) est l'actif n°1 et il est gratuit. Le post 1 de `LINKEDIN_30J.md` est prêt : histoire du pivot robo-advisor → détection de greenwashing. C'est le post qui a le plus de chances de sur-performer (histoire personnelle + sujet chaud) et il installe le rendez-vous pour les 29 jours suivants.
⏱ 30 min (le post est écrit) + 45 min de réponses aux commentaires dans les 3 premières heures (critique pour l'algorithme).

### Action 2 — Transformer la waitlist en armée (J1–J2)
Envoyer l'email « Vous êtes parmi les N premiers » (`PARRAINAGE_WAITLIST.md`) à tous les inscrits actuels : accès immédiat à la beta + demande explicite de 3 choses gratuites (tester le quick check, répondre au NPS in-app, transférer à 2 personnes). La waitlist existe déjà, la position réelle est déjà affichée dans le produit — on capitalise sur du construit.
⏱ 1 h 30 (personnaliser l'email, l'envoyer, préparer la séquence de relance J+3).

### Action 3 — Publier la première mini-analyse de fonds réel avec données Seedow (J3–J4)
Une analyse concrète d'un fonds grand public (voir prudence dans `NEWSJACKING.md` : jamais d'accusation, uniquement des données sourcées et des questions) publiée sur LinkedIn + postée en réponse dans une communauté pertinente. C'est le format qui prouve le produit, alimente le pitch presse (« nos données montrent que… ») et se recycle en vidéo courte.
⏱ 2 h (analyse via Seedow + rédaction + captures d'écran du produit).

**Métrique unique de la semaine 1 : nombre de comptes activés (portefeuille créé ou watchlist ≥ 1), pas le nombre d'impressions.** Les vues Supabase `beta_retention_cohorts` et `app_events` sont déjà en place pour le mesurer.

---

## 3. Playbook du jour de lancement (façon Product Hunt)

### J-7 à J-2 — Préparer l'effet de démarrage
- [ ] Constituer la liste des **20-30 premiers soutiens** : mélange réseau SKEMA, anciens collègues banque/marché, premiers inscrits waitlist les plus engagés (ceux qui ont répondu aux emails), 2-3 fondateurs fintech amis. Un tableur : nom, canal de contact, ce qu'on leur demande précisément.
- [ ] Message individuel (JAMAIS de message groupé) à chacun, à J-2 :

> « Salut [Prénom], je lance la beta ouverte de Seedow [jour] à 8 h. Zéro budget marketing, donc les premières heures comptent double. Est-ce que je peux compter sur toi pour [UNE action précise : commenter mon post LinkedIn avant 10 h / upvoter sur Product Hunt / tester le vérificateur de fonds et me dire ce qui cloche] ? 2 minutes max, et je te revaudrai ça. »

  Règle : **une seule demande par personne**, adaptée à sa plateforme. 10 commentaires LinkedIn dans la première heure valent mieux que 30 likes dilués.
- [ ] Vérifier que la landing tient la charge du quick check (le cache edge `s-maxage=3600` est déjà en place sur `/api/public/esg-preview` — tester une fois en conditions réelles).
- [ ] Préparer tous les assets : post LinkedIn du jour J écrit, visuels/captures exportés, page Product Hunt rédigée (voir `ECOSYSTEMES_COMMUNAUTES.md`), 3 messages communautés adaptés, email waitlist programmé.
- [ ] Brancher les UTM sur chaque lien (`?utm_source=producthunt|linkedin|reddit…`) pour savoir d'où viennent les activations.

### Jour J — heure par heure (heure de Paris)

| Heure | Action | Détail |
|---|---|---|
| 00 h 01 – 08 h | **Lancement Product Hunt** (si PH est retenu ce jour-là) | PH tourne sur la journée PST : lancer à 00 h 01 PST = 9 h 01 Paris. Sinon, garder PH pour un « second lancement » à J+30 avec plus de traction. |
| 08 h 00 | **Email waitlist** « La beta est ouverte — vous êtes les premiers » | Version J du template `PARRAINAGE_WAITLIST.md`. C'est le trafic le plus chaud, il part en premier. |
| 08 h 30 | **Post LinkedIn fondateur** de lancement | Accroche gagnante des tests + démo du quick check en capture/GIF + lien en premier commentaire. |
| 08 h 30 – 11 h 30 | **Répondre à TOUS les commentaires** LinkedIn dans l'heure | Les 90 premières minutes déterminent la portée. Les 20-30 soutiens ont pour consigne de commenter avant 10 h (avec une vraie question ou réaction, pas « Bravo 👏 »). |
| 11 h 00 | **Messages communautés** (2-3 max, pas plus le jour J) | Ceux préparés dans `ECOSYSTEMES_COMMUNAUTES.md`, adaptés au ton de chaque communauté. Jamais le même texte deux fois. |
| 12 h 30 | **Story/post format court** (Reels/TikTok/Shorts vidéo n°1) | Script 1 de `VIDEO_COURTE.md` — tourné à l'avance. |
| 14 h 00 | **Pitch presse** aux 5-6 journalistes ciblés | Template `FINFLUENCEURS_PRESSE.md`, avec le chiffre du jour (« ce matin, N fonds vérifiés en X heures »). L'après-midi du lancement est le bon moment : il y a déjà une micro-preuve de traction à raconter. |
| 16 h 00 | **Point traction publique** | Commentaire sous le post LinkedIn du matin : « 8 h après l'ouverture : X fonds vérifiés, Y inscrits. Le fonds le plus recherché : [nom]. » Relance l'algorithme et donne une raison de re-partager. |
| 18 h 00 | **Relances individuelles** | Soutiens qui n'ont pas encore agi : un message gentil, une seule relance, jamais deux. |
| 21 h 00 | **Bilan à chaud** (privé) | Noter dans un doc : chiffres par canal (UTM), ce qui a surpris, les 3 verbatims les plus intéressants. C'est la matière du post J+1. |

### J+1
- [ ] Post LinkedIn « les chiffres du premier jour, sans filtre » (post 5 du calendrier — les posts de transparence chiffrée sont systématiquement les plus repris).
- [ ] Répondre personnellement aux 20 premiers feedbacks NPS in-app.
- [ ] Remercier individuellement chaque soutien avec le chiffre auquel il a contribué.

⏱ Temps total jour J : une journée pleine. J-7 à J-2 : ~4 h étalées.

---

## 4. Budget temps hebdomadaire réaliste (régime de croisière, semaines 2-4)

| Bloc | Fréquence | Temps/semaine |
|---|---|---|
| Posts LinkedIn (calendrier 30 j) | 5/sem | 3 h (batch le dimanche + réponses quotidiennes 15 min) |
| Veille réglementaire + news-jacking | 15 min/jour + 1 réaction/sem | 2 h 30 |
| Vidéo courte | 2/sem | 2 h (batch de tournage voix-off) |
| Communautés (présence utile, pas promo) | 3-4 interventions/sem | 1 h 30 |
| Emails waitlist/parrainage + presse | ponctuel | 1 h |
| **Total** | | **~10 h/semaine** |

Si le temps manque : couper la vidéo d'abord, jamais LinkedIn ni le news-jacking — ce sont les deux canaux qui convertissent le réseau finance existant.
