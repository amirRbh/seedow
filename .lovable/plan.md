# Landing — adaptation + accès rapides

Garder l'ossature éditoriale de la nouvelle landing (hero centré, ticker, problem grid, dark how-it-works, feature Ethi, CTA email, footer) mais l'adapter pour exposer clairement deux portes d'entrée gratuites : **Connexion** et **Cours gratuits**.

## Changements

### 1. Nav (sticky top)

Aujourd'hui : juste un CTA "Rejoindre la beta". Nouveau :

```
[ SEEDOW ]              Cours · Méthodo · [Se connecter] [Rejoindre la beta ›]
```

- Liens texte mono uppercase tracking 0.15em : `Cours`, `Méthodo`
- `Se connecter` → `/auth?mode=login` — style outline ink pill discret
- `Rejoindre la beta` → scroll vers `#cta` — pill ink rempli (CTA primaire)
- Si l'utilisateur est déjà loggé : remplace les deux boutons par `Mon espace →` qui mène à `/dashboard`
- Mobile : nav condensée, liens texte cachés sauf les deux boutons

### 2. Hero — double porte d'entrée sous le formulaire email

Sous le champ email + ligne "GRATUIT · PLACES LIMITÉES", ajouter une ligne discrète mono :

```
Déjà inscrit·e ? Se connecter →   ·   Explorer les cours gratuits →
```

Petits liens texte mono 11px tracking large, soulignés au hover, accent mint sur la flèche. Ça donne immédiatement deux raccourcis sans casser la hiérarchie du hero.

### 3. Nouvelle section "Commence gratuitement" (entre Ethi et CTA beta)

Bande paper-2 avec deux cards côte à côte :

- **Card 1 — Les cours gratuits**
  - Eyebrow mono ice : `Cours · gratuit`
  - Titre Bebas : "Apprends avant d'investir."
  - Sous-titre : "12 cours pour décoder la finance responsable, sans jargon. Gratuit, sans inscription requise."
  - CTA pill outline ice : `Voir les cours →` (`/cours`)
- **Card 2 — Espace personnel**
  - Eyebrow mono mint : `Espace · gratuit`
  - Titre Bebas : "Ton tableau de bord ESG."
  - Sous-titre : "Crée un compte, simule ton portefeuille, discute avec Ethi. Aucune carte requise."
  - CTA pill mint filled : `Créer un compte →` (`/auth?mode=signup`) + dessous lien `Déjà inscrit·e ? Se connecter`

Règle d'accent respectée : la card cours utilise ice, la card compte utilise mint — accents séparés, pas mélangés.

### 4. Footer — étoffer les liens

Aujourd'hui : juste tagline. Ajout d'une rangée de liens mono uppercase :

```
SEEDOW    Cours · Méthodo · Se connecter · Rejoindre la beta · Contact
          VOTRE ARGENT FAÇONNE DÉJÀ LE MONDE.
```

### 5. État connecté global

Quand `isAuthed === true`, l'ensemble se simplifie :
- Hero email form remplacé par un gros CTA `Accéder à mon espace →` (mint filled)
- CTA beta final remplacé par même bouton
- Section "Commence gratuitement" garde la card cours, la card compte devient "Aller au dashboard"

## Hors scope

- Pas de refonte du design global (déjà fait)
- Pas de changement des routes existantes ou de la logique waitlist
- Pas de modification du système d'auth
