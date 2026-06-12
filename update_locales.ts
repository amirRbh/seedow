import { readFileSync, writeFileSync } from "fs";

const fr = JSON.parse(readFileSync("src/i18n/locales/fr.json", "utf-8"));
const en = JSON.parse(readFileSync("src/i18n/locales/en.json", "utf-8"));

const onboardingFr = {
    "steps": {
        "values": {
            "ethiMessage": "Salut, moi c'est Ethi ✨ Je vais t'aider à composer ton portefeuille aujourd'hui. Dis-moi d'abord : qu'est-ce qui compte vraiment pour toi ?",
            "question": "Choisis tes causes — tu peux en prendre plusieurs.",
            "climat": "Climat",
            "climat_desc": "Transition énergétique",
            "biodiversite": "Biodiversité",
            "biodiversite_desc": "Forêts, océans, espèces",
            "humain": "Droits humains",
            "humain_desc": "Travail digne, égalité",
            "egalite": "Égalité F/H",
            "egalite_desc": "Parité, équité salariale",
            "tech": "Tech éthique",
            "tech_desc": "IA responsable",
            "circulaire": "Économie circulaire",
            "circulaire_desc": "Zéro déchet"
        },
        "exclusions": {
            "ethiMessage": "Parfait 💚 Et à l'inverse, qu'est-ce que tu refuses absolument de financer ?",
            "question": "Ces secteurs seront totalement exclus.",
            "fossiles": "Énergies fossiles",
            "armes": "Armement",
            "tabac": "Tabac",
            "jeux": "Jeux d'argent",
            "animaux": "Tests animaux",
            "fast-fashion": "Fast fashion"
        },
        "objective": {
            "ethiMessage": "Bien noté. Maintenant : pour quel objectif veux-tu faire grandir ce capital ?",
            "question": "Ton objectif principal",
            "retraite": "Préparer ma retraite",
            "retraite_desc": "20+ ans",
            "maison": "Acheter une maison",
            "maison_desc": "5-10 ans",
            "court": "Un projet bientôt",
            "court_desc": "1-3 ans",
            "epargne": "Juste épargner",
            "epargne_desc": "Sans échéance"
        },
        "amount": {
            "ethiMessage": "Combien veux-tu investir pour commencer ? On peut commencer petit.",
            "question": "Ton premier dépôt",
            "10": "10 €",
            "10_desc": "Je teste tranquille",
            "50": "50 €",
            "50_desc": "Un engagement sérieux",
            "100": "100 €",
            "100_desc": "Un vrai démarrage",
            "500": "500 €",
            "500_desc": "Un démarrage ambitieux"
        }
    },
    "intro": {
        "eyebrow": "Conseiller en allocation",
        "title": "Composons votre portefeuille.",
        "description": "Quatre questions, deux minutes. Ethi structure une allocation alignée sur vos convictions et vos exclusions.",
        "step_01": "Tes valeurs",
        "step_02": "Ton portefeuille",
        "step_03": "Ton suivi",
        "start": "Commencer"
    },
    "naming": {
        "title": "Nomme ton portefeuille",
        "question": "Comment s'appelle ce portefeuille ?",
        "description": "Donne-lui un nom qui te parle — par exemple Climat, Retraite, Tech responsable…",
        "placeholder": "Mon portefeuille climat",
        "validate": "Valider ce portefeuille",
        "default_name": "Mon portefeuille"
    },
    "account": {
        "eyebrow": "Dernière étape",
        "ethi_message": "Top, j'ai tout ce qu'il faut ✨ Crée ton compte en 10 secondes pour que je sauvegarde ton portefeuille.",
        "title_signup": "Crée ton compte",
        "title_login": "Connecte-toi",
        "description": "Tes réponses sont prêtes. Plus qu'un pas pour démarrer.",
        "continue_google": "Continuer avec Google",
        "firstname_placeholder": "Prénom",
        "email_placeholder": "Adresse email",
        "password_placeholder": "Mot de passe (8 caractères min.)",
        "waiting": "Veuillez patienter…",
        "btn_signup": "Créer mon compte et investir",
        "btn_login": "Se connecter et investir",
        "already_account": "Déjà un compte ?",
        "no_account": "Pas encore de compte ?",
        "link_login": "Se connecter",
        "link_signup": "Créer un compte",
        "verify_email": "Compte créé. Vérifie ton email pour finaliser puis reviens.",
        "auth_error": "Erreur d'authentification"
    },
    "planting": {
        "loading_eyebrow": "Composition en cours",
        "loading_title": "Structuration du portefeuille",
        "loading_desc": "Optimisation Markowitz contrainte",
        "error_eyebrow": "Erreur",
        "error_title": "Impossible de générer le portefeuille",
        "error_fallback": "Erreur lors de la génération",
        "reveal_eyebrow": "Allocation cible",
        "reveal_title": "Votre portefeuille",
        "reveal_summary": "{{count}} positions · capital de référence {{amount}}",
        "dashboard_cta": "Accéder au tableau de bord"
    },
    "step": {
        "back": "Retour",
        "progress": "{{current}}/{{total}}",
        "continue": "Continuer"
    }
};

const onboardingEn = {
    "steps": {
        "values": {
            "ethiMessage": "Hi, I'm Ethi ✨ I'll help you build your portfolio today. First, tell me: what really matters to you?",
            "question": "Choose your causes — you can pick several.",
            "climat": "Climate",
            "climat_desc": "Energy transition",
            "biodiversite": "Biodiversity",
            "biodiversite_desc": "Forests, oceans, species",
            "humain": "Human rights",
            "humain_desc": "Dignified work, equality",
            "egalite": "G/W Equality",
            "egalite_desc": "Parity, pay equity",
            "tech": "Ethical Tech",
            "tech_desc": "Responsible AI",
            "circulaire": "Circular economy",
            "circulaire_desc": "Zero waste"
        },
        "exclusions": {
            "ethiMessage": "Perfect 💚 And on the flip side, what do you absolutely refuse to fund?",
            "question": "These sectors will be fully excluded.",
            "fossiles": "Fossil fuels",
            "armes": "Armament",
            "tabac": "Tobacco",
            "jeux": "Gambling",
            "animaux": "Animal testing",
            "fast-fashion": "Fast fashion"
        },
        "objective": {
            "ethiMessage": "Noted. Now: for what objective do you want to grow this capital?",
            "question": "Your main goal",
            "retraite": "Prepare for retirement",
            "retraite_desc": "20+ years",
            "maison": "Buy a house",
            "maison_desc": "5-10 years",
            "court": "A project soon",
            "court_desc": "1-3 years",
            "epargne": "Just saving",
            "epargne_desc": "No deadline"
        },
        "amount": {
            "ethiMessage": "How much do you want to invest to start? We can start small.",
            "question": "Your first deposit",
            "10": "€10",
            "10_desc": "Just testing",
            "50": "€50",
            "50_desc": "A serious commitment",
            "100": "€100",
            "100_desc": "A real start",
            "500": "€500",
            "500_desc": "An ambitious start"
        }
    },
    "intro": {
        "eyebrow": "Allocation Advisor",
        "title": "Let's build your portfolio.",
        "description": "Four questions, two minutes. Ethi structures an allocation aligned with your convictions and exclusions.",
        "step_01": "Your values",
        "step_02": "Your portfolio",
        "step_03": "Your tracking",
        "start": "Start"
    },
    "naming": {
        "title": "Name your portfolio",
        "question": "What is this portfolio called?",
        "description": "Give it a name that speaks to you — for example Climate, Retirement, Responsible Tech…",
        "placeholder": "My climate portfolio",
        "validate": "Validate this portfolio",
        "default_name": "My portfolio"
    },
    "account": {
        "eyebrow": "Last step",
        "ethi_message": "Great, I have everything I need ✨ Create your account in 10 seconds so I can save your portfolio.",
        "title_signup": "Create your account",
        "title_login": "Sign in",
        "description": "Your answers are ready. Just one more step to start.",
        "continue_google": "Continue with Google",
        "firstname_placeholder": "First name",
        "email_placeholder": "Email address",
        "password_placeholder": "Password (8 chars min.)",
        "waiting": "Please wait…",
        "btn_signup": "Create my account and invest",
        "btn_login": "Sign in and invest",
        "already_account": "Already have an account?",
        "no_account": "Don't have an account yet?",
        "link_login": "Sign in",
        "link_signup": "Create an account",
        "verify_email": "Account created. Check your email to finalize then come back.",
        "auth_error": "Authentication error"
    },
    "planting": {
        "loading_eyebrow": "Composition in progress",
        "loading_title": "Structuring portfolio",
        "loading_desc": "Constrained Markowitz optimization",
        "error_eyebrow": "Error",
        "error_title": "Could not generate portfolio",
        "error_fallback": "Error during generation",
        "reveal_eyebrow": "Target allocation",
        "reveal_title": "Your portfolio",
        "reveal_summary": "{{count}} positions · reference capital {{amount}}",
        "dashboard_cta": "Go to dashboard"
    },
    "step": {
        "back": "Back",
        "progress": "{{current}}/{{total}}",
        "continue": "Continue"
    }
};

fr.onboarding = onboardingFr;
en.onboarding = onboardingEn;

writeFileSync("src/i18n/locales/fr.json", JSON.stringify(fr, null, 2), "utf-8");
writeFileSync("src/i18n/locales/en.json", JSON.stringify(en, null, 2), "utf-8");
