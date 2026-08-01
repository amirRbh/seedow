import { readFileSync, writeFileSync } from "fs";

const fr = JSON.parse(readFileSync("src/i18n/locales/fr.json", "utf-8"));
const en = JSON.parse(readFileSync("src/i18n/locales/en.json", "utf-8"));

type Json = Record<string, unknown>;

/**
 * Fusion récursive non destructive : les blocs déclarés ici sont appliqués
 * PAR-DESSUS le JSON existant sans supprimer les clés que le JSON a gagnées
 * depuis (sinon ré-exécuter ce script effacerait toute chaîne ajoutée à la
 * main entre-temps). Le script reste ainsi idempotent.
 */
function deepMerge(base: unknown, override: Json): Json {
  const out: Json = base && typeof base === "object" ? { ...(base as Json) } : {};
  for (const [key, value] of Object.entries(override)) {
    const prev = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? deepMerge(prev, value as Json)
        : value;
  }
  return out;
}

const onboardingFr = {
  steps: {
    values: {
      ethiMessage:
        "Salut, moi c'est Ethi ✨ Je vais t'aider à composer ton portefeuille aujourd'hui. Dis-moi d'abord : qu'est-ce qui compte vraiment pour toi ?",
      question: "Choisis tes causes — tu peux en prendre plusieurs.",
      climat: "Climat",
      climat_desc: "Transition énergétique",
      biodiversite: "Biodiversité",
      biodiversite_desc: "Forêts, océans, espèces",
      humain: "Droits humains",
      humain_desc: "Travail digne, égalité",
      egalite: "Égalité F/H",
      egalite_desc: "Parité, équité salariale",
      tech: "Tech éthique",
      tech_desc: "IA responsable",
      circulaire: "Économie circulaire",
      circulaire_desc: "Zéro déchet",
    },
    exclusions: {
      ethiMessage: "Parfait 💚 Et à l'inverse, qu'est-ce que tu refuses absolument de financer ?",
      question: "Ces secteurs seront totalement exclus.",
      fossiles: "Énergies fossiles",
      armes: "Armement",
      tabac: "Tabac",
      jeux: "Jeux d'argent",
      animaux: "Tests animaux",
      "fast-fashion": "Fast fashion",
    },
    objective: {
      ethiMessage: "Bien noté. Maintenant : pour quel objectif veux-tu faire grandir ce capital ?",
      question: "Ton objectif principal",
      retraite: "Préparer ma retraite",
      retraite_desc: "20+ ans",
      maison: "Acheter une maison",
      maison_desc: "5-10 ans",
      court: "Un projet bientôt",
      court_desc: "1-3 ans",
      epargne: "Juste épargner",
      epargne_desc: "Sans échéance",
    },
    amount: {
      ethiMessage: "Combien veux-tu investir pour commencer ? On peut commencer petit.",
      question: "Ton premier dépôt",
      "10": "10 €",
      "10_desc": "Je teste tranquille",
      "50": "50 €",
      "50_desc": "Un engagement sérieux",
      "100": "100 €",
      "100_desc": "Un vrai démarrage",
      "500": "500 €",
      "500_desc": "Un démarrage ambitieux",
      custom_label: "Un autre montant",
      custom_placeholder: "ex. 2 000",
    },
  },
  intro: {
    eyebrow: "Conseiller en allocation",
    title: "Composons votre portefeuille.",
    description:
      "Quatre questions, deux minutes. Ethi structure une allocation alignée sur vos convictions et vos exclusions.",
    step_01: "Tes valeurs",
    step_02: "Ton portefeuille",
    step_03: "Ton suivi",
    start: "Commencer",
  },
  naming: {
    title: "Nomme ton portefeuille",
    question: "Comment s'appelle ce portefeuille ?",
    description: "Donne-lui un nom qui te parle — par exemple Climat, Retraite, Tech responsable…",
    placeholder: "Mon portefeuille climat",
    validate: "Valider ce portefeuille",
    default_name: "Mon portefeuille",
  },
  account: {
    eyebrow: "Dernière étape",
    ethi_message:
      "Top, j'ai tout ce qu'il faut ✨ Crée ton compte en 10 secondes pour que je sauvegarde ton portefeuille.",
    title_signup: "Crée ton compte",
    title_login: "Connecte-toi",
    description: "Tes réponses sont prêtes. Plus qu'un pas pour démarrer.",
    continue_google: "Continuer avec Google",
    firstname_placeholder: "Prénom",
    email_placeholder: "Adresse email",
    password_placeholder: "Mot de passe (8 caractères min.)",
    waiting: "Veuillez patienter…",
    btn_signup: "Créer mon compte et investir",
    btn_login: "Se connecter et investir",
    already_account: "Déjà un compte ?",
    no_account: "Pas encore de compte ?",
    link_login: "Se connecter",
    link_signup: "Créer un compte",
    verify_email: "Compte créé. Vérifie ton email pour finaliser puis reviens.",
    auth_error: "Erreur d'authentification",
  },
  planting: {
    loading_eyebrow: "Composition en cours",
    loading_title: "Structuration du portefeuille",
    loading_desc: "Optimisation Markowitz contrainte",
    error_eyebrow: "Erreur",
    error_title: "Impossible de générer le portefeuille",
    error_fallback: "Erreur lors de la génération",
    reveal_eyebrow: "Allocation cible",
    reveal_title: "Votre portefeuille",
    reveal_summary: "{{count}} positions · capital de référence {{amount}}",
    dashboard_cta: "Accéder au tableau de bord",
  },
  step: {
    back: "Retour",
    progress: "{{current}}/{{total}}",
    continue: "Continuer",
  },
};

const onboardingEn = {
  steps: {
    values: {
      ethiMessage:
        "Hi, I'm Ethi ✨ I'll help you build your portfolio today. First, tell me: what really matters to you?",
      question: "Choose your causes — you can pick several.",
      climat: "Climate",
      climat_desc: "Energy transition",
      biodiversite: "Biodiversity",
      biodiversite_desc: "Forests, oceans, species",
      humain: "Human rights",
      humain_desc: "Dignified work, equality",
      egalite: "G/W Equality",
      egalite_desc: "Parity, pay equity",
      tech: "Ethical Tech",
      tech_desc: "Responsible AI",
      circulaire: "Circular economy",
      circulaire_desc: "Zero waste",
    },
    exclusions: {
      ethiMessage: "Perfect 💚 And on the flip side, what do you absolutely refuse to fund?",
      question: "These sectors will be fully excluded.",
      fossiles: "Fossil fuels",
      armes: "Armament",
      tabac: "Tobacco",
      jeux: "Gambling",
      animaux: "Animal testing",
      "fast-fashion": "Fast fashion",
    },
    objective: {
      ethiMessage: "Noted. Now: for what objective do you want to grow this capital?",
      question: "Your main goal",
      retraite: "Prepare for retirement",
      retraite_desc: "20+ years",
      maison: "Buy a house",
      maison_desc: "5-10 years",
      court: "A project soon",
      court_desc: "1-3 years",
      epargne: "Just saving",
      epargne_desc: "No deadline",
    },
    amount: {
      ethiMessage: "How much do you want to invest to start? We can start small.",
      question: "Your first deposit",
      "10": "€10",
      "10_desc": "Just testing",
      "50": "€50",
      "50_desc": "A serious commitment",
      "100": "€100",
      "100_desc": "A real start",
      "500": "€500",
      "500_desc": "An ambitious start",
      custom_label: "A different amount",
      custom_placeholder: "e.g. 2,000",
    },
  },
  intro: {
    eyebrow: "Allocation Advisor",
    title: "Let's build your portfolio.",
    description:
      "Four questions, two minutes. Ethi structures an allocation aligned with your convictions and exclusions.",
    step_01: "Your values",
    step_02: "Your portfolio",
    step_03: "Your tracking",
    start: "Start",
  },
  naming: {
    title: "Name your portfolio",
    question: "What is this portfolio called?",
    description:
      "Give it a name that speaks to you — for example Climate, Retirement, Responsible Tech…",
    placeholder: "My climate portfolio",
    validate: "Validate this portfolio",
    default_name: "My portfolio",
  },
  account: {
    eyebrow: "Last step",
    ethi_message:
      "Great, I have everything I need ✨ Create your account in 10 seconds so I can save your portfolio.",
    title_signup: "Create your account",
    title_login: "Sign in",
    description: "Your answers are ready. Just one more step to start.",
    continue_google: "Continue with Google",
    firstname_placeholder: "First name",
    email_placeholder: "Email address",
    password_placeholder: "Password (8 chars min.)",
    waiting: "Please wait…",
    btn_signup: "Create my account and invest",
    btn_login: "Sign in and invest",
    already_account: "Already have an account?",
    no_account: "Don't have an account yet?",
    link_login: "Sign in",
    link_signup: "Create an account",
    verify_email: "Account created. Check your email to finalize then come back.",
    auth_error: "Authentication error",
  },
  planting: {
    loading_eyebrow: "Composition in progress",
    loading_title: "Structuring portfolio",
    loading_desc: "Constrained Markowitz optimization",
    error_eyebrow: "Error",
    error_title: "Could not generate portfolio",
    error_fallback: "Error during generation",
    reveal_eyebrow: "Target allocation",
    reveal_title: "Your portfolio",
    reveal_summary: "{{count}} positions · reference capital {{amount}}",
    dashboard_cta: "Go to dashboard",
  },
  step: {
    back: "Back",
    progress: "{{current}}/{{total}}",
    continue: "Continue",
  },
};

fr.onboarding = deepMerge(fr.onboarding, onboardingFr);
en.onboarding = deepMerge(en.onboarding, onboardingEn);

// ── Rayon X : reveal « Ce fonds est-il vraiment vert ? » sur la landing ──────
const rayonXFr = {
  another: "Analyser un autre fonds",
  cta_hint: "Clique sur un fonds pour l'analyse complète.",
  band: {
    tresaligne: "Très aligné",
    plutot: "Plutôt aligné",
    mitige: "Mitigé",
    peu: "Peu aligné",
    contra: "Contradictoire",
  },
  verdict: {
    tresaligne: "Ce fonds évite l'essentiel de ce que tu rejettes.",
    plutot: "Va dans le bon sens, avec quelques angles morts.",
    mitige: "Autant d'alignement que de contradictions.",
    peu: "Finance largement ce que tu voulais éviter.",
    contra: "À l'opposé des valeurs qu'il revendique.",
  },
  pillar: {
    env: "Environnement",
    social: "Social",
    gouv: "Gouvernance",
  },
  ter_label: "Frais annuels (TER) :",
  finances_pos: "Ce que ce fonds finance",
  finances_pos_empty: "Aucun thème d'impact déclaré sur cet actif.",
  not_excluded: "Ce que ce fonds n'exclut pas",
  not_excluded_empty:
    "Ce fonds exclut formellement tous les secteurs controversés que tu peux refuser.",
  flags: "À vérifier",
  themes_labels: {
    climat: "Climat",
    biodiversite: "Biodiversité",
    humain: "Droits humains",
    egalite: "Égalité F/H",
    tech: "Tech éthique",
    circulaire: "Économie circulaire",
  },
  sectors_labels: {
    fossiles: "Énergies fossiles",
    armes: "Armement",
    tabac: "Tabac",
    jeux: "Jeux d'argent",
    animaux: "Tests animaux",
    "fast-fashion": "Fast fashion",
  },
  sources: "Source {{source}} · {{coverage}}",
  source_unknown: "agrégée",
  asof: "au {{date}}",
  bridge_eyebrow: "Et tout ton portefeuille ?",
  bridge_title: "Un fonds n'est qu'une pièce.",
  bridge_sub: "Vois l'impact réel de l'ensemble de tes placements — et ce qui le tire vers le bas.",
  bridge_cta: "Analyser tout mon portefeuille",
  disclaimer: "Information & pédagogie. Seedow n'émet aucune recommandation d'achat ou de vente.",
};

const rayonXEn = {
  another: "Analyze another fund",
  cta_hint: "Tap a fund for the full breakdown.",
  band: {
    tresaligne: "Highly aligned",
    plutot: "Fairly aligned",
    mitige: "Mixed",
    peu: "Weakly aligned",
    contra: "Contradictory",
  },
  verdict: {
    tresaligne: "This fund avoids most of what you reject.",
    plutot: "Heading the right way, with some blind spots.",
    mitige: "As much alignment as contradiction.",
    peu: "Largely funds what you wanted to avoid.",
    contra: "At odds with the values it claims.",
  },
  pillar: {
    env: "Environment",
    social: "Social",
    gouv: "Governance",
  },
  ter_label: "Annual fee (TER):",
  finances_pos: "What this fund finances",
  finances_pos_empty: "No impact theme declared for this asset.",
  not_excluded: "What this fund does not exclude",
  not_excluded_empty: "This fund formally excludes every controversial sector you can refuse.",
  flags: "Worth checking",
  themes_labels: {
    climat: "Climate",
    biodiversite: "Biodiversity",
    humain: "Human rights",
    egalite: "G/W equality",
    tech: "Ethical tech",
    circulaire: "Circular economy",
  },
  sectors_labels: {
    fossiles: "Fossil fuels",
    armes: "Armament",
    tabac: "Tobacco",
    jeux: "Gambling",
    animaux: "Animal testing",
    "fast-fashion": "Fast fashion",
  },
  sources: "Source {{source}} · {{coverage}}",
  source_unknown: "aggregated",
  asof: "as of {{date}}",
  bridge_eyebrow: "And your whole portfolio?",
  bridge_title: "A fund is just one piece.",
  bridge_sub: "See the real impact of all your holdings — and what drags it down.",
  bridge_cta: "Analyze my whole portfolio",
  disclaimer: "Information & education. Seedow makes no buy or sell recommendation.",
};

// Clarté & accessibilité (débutants) — voir audit "clarity-accessibility".
// Ces blocs sont fusionnés de façon non destructive par-dessus le JSON existant.
const dashboardFr = {
  since_start: "depuis ton premier dépôt",
  why_cta: "Pourquoi ce chiffre ?",
  why_assets_one: "Tu détiens {{count}} actif.",
  why_assets_other: "Tu détiens {{count}} actifs.",
  why_moves: "Leur cours de bourse évolue chaque heure — c'est ce qui fait bouger ce total.",
  why_gain: "Aujourd'hui, ils valent {{amount}} de plus que ce que tu as déposé.",
  why_loss: "Aujourd'hui, ils valent {{amount}} de moins que ce que tu as déposé.",
  why_flat: "Aujourd'hui, ils valent autant que ce que tu as déposé.",
  why_virtual: "Capital virtuel — aucun argent réel n'est investi ici.",
};
const dashboardEn = {
  since_start: "since your first deposit",
  why_cta: "Why this number?",
  why_assets_one: "You hold {{count}} asset.",
  why_assets_other: "You hold {{count}} assets.",
  why_moves: "Their market price changes every hour — that's what moves this total.",
  why_gain: "Today they're worth {{amount}} more than what you deposited.",
  why_loss: "Today they're worth {{amount}} less than what you deposited.",
  why_flat: "Today they're worth the same as what you deposited.",
  why_virtual: "Virtual capital — no real money is invested here.",
};
const assetDetailFr = {
  risk_scale:
    "Sur une échelle de 1 (très stable) à 7 (très agité). Un ETF actions monde se situe autour de 4-5.",
};
const assetDetailEn = {
  risk_scale:
    "On a scale of 1 (very stable) to 7 (very turbulent). A world equity ETF sits around 4-5.",
};
const portfolioFr = {
  tab_refine_simple: "Ajuster",
  history_chart: {
    plain_reading_up:
      "En clair : tu as déposé {{invested}}. Aujourd'hui, ton portefeuille vaut {{value}} — soit {{gain}} de plus que tes dépôts.",
    plain_reading_down:
      "En clair : tu as déposé {{invested}}. Aujourd'hui, ton portefeuille vaut {{value}} — soit {{gain}} de moins que tes dépôts.",
    plain_reading_flat:
      "En clair : tu as déposé {{invested}}, et c'est exactement la valeur de ton portefeuille aujourd'hui.",
  },
};
const portfolioEn = {
  tab_refine_simple: "Adjust",
  history_chart: {
    plain_reading_up:
      "In short: you deposited {{invested}}. Today your portfolio is worth {{value}} — that's {{gain}} more than your deposits.",
    plain_reading_down:
      "In short: you deposited {{invested}}. Today your portfolio is worth {{value}} — that's {{gain}} less than your deposits.",
    plain_reading_flat:
      "In short: you deposited {{invested}}, which is exactly your portfolio's value today.",
  },
};
const growthComparisonFr = {
  legend_value: "ta valeur",
  legend_deposited: "ce que tu as déposé",
};
const growthComparisonEn = {
  legend_value: "your value",
  legend_deposited: "what you deposited",
};

// ── Ton Argent Vote (le Bloc) ────────────────────────────────────────────────
const voteFr = {
  eyebrow: "Ton argent vote",
  title: "Le Vote",
  section_eyebrow: "Le Bloc",
  section_title: "Ton argent n'est plus un chiffre. C'est une voix.",
  section_kicker:
    "Quand tu possèdes une entreprise, tu as un droit de vote à son assemblée générale. Seul, tu pèses peu. Ensemble, vous formez un bloc. Voici les votes ouverts.",
  loading: "Chargement…",
  empty_title: "Aucun vote pour l'instant.",
  empty_desc: "La saison des assemblées générales arrive. Reviens bientôt.",
  open_heading: "Ouverts au vote",
  closed_heading: "Résultats",
  disclaimer:
    "Seedow agrège des intentions de vote et porte une voix collective. Les données de résolution sont publiques et sourcées ; la transmission du vote réel aux assemblées se fait par étapes. Seedow ne te dit jamais comment voter.",
  back: "Tous les votes",
  not_found_title: "Vote introuvable",
  not_found_desc: "Cette résolution n'existe pas ou a été retirée.",
  voted_confirm: "Ton vote « {{choice}} » est enregistré.",
  change_vote: "Changer mon vote",
  casting: "Envoi…",
  source: "Source : {{name}}",
  share_text: "Mon argent a une voix. Je vote sur : {{title}} — sur seedow.",
  choice_for: "Pour",
  choice_against: "Contre",
  choice_abstain: "M'abstenir",
  status: {
    closed: "Clos",
    last_day: "Dernier jour",
    days_left: "Clôture · J−{{n}}",
  },
  list: {
    bloc_empty: "Personne n'a encore voté",
    bloc_count: "{{formatted}} dans le Bloc",
    voted: "Ton vote : {{choice}}",
    see_result: "Voir le résultat",
    give_voice: "Donner ma voix",
  },
  explainer: {
    who: "Ethi t'explique",
  },
  bloc: {
    aria: "Le Bloc, décompte des votes en direct",
    live: "Le Bloc · en direct",
    empty_title: "Sois la première voix.",
    empty_desc: "Personne n'a encore voté sur cette résolution. Ton vote ouvre le Bloc.",
    you_line: "Vous êtes {{n}} à voter « {{choice}} ».",
    total_line: "{{n}} personnes ont déjà voté.",
    split_aria: "Contre la direction : {{against}}. Pour la direction : {{forCount}}.",
    reinforce: "Renforcer le Bloc — partager",
  },
  result: {
    official: "Résultat officiel",
    pending: "Résultat à venir",
    bloc_title: "Comment le Bloc Seedow a voté",
    bloc_empty: "Aucun membre du Bloc n'avait voté sur cette résolution.",
    bloc_line: "Sur {{total}} votes Seedow, {{against}} ont voté contre la direction ({{pct}} %).",
  },
  teaser: {
    eyebrow: "Un vote arrive",
    be_first: "Sois la première voix",
    bloc_count: "{{formatted}} dans le Bloc",
    cta: "Donner ma voix",
    cta_voted: "Voir le Bloc",
  },
  share: {
    subline_choice: "personnes votent « {{choice}} ».",
    subline_total: "personnes ont déjà voté.",
    tagline: "Ce n'est pas une fatalité. C'est un choix. Le tien aussi.",
  },
};
const voteEn = {
  eyebrow: "Your money votes",
  title: "The Vote",
  section_eyebrow: "The Bloc",
  section_title: "Your money is no longer a number. It's a voice.",
  section_kicker:
    "When you own a company, you have the right to vote at its shareholder meeting. Alone, you barely count. Together, you form a bloc. Here are the open votes.",
  loading: "Loading…",
  empty_title: "No votes yet.",
  empty_desc: "Shareholder-meeting season is coming. Check back soon.",
  open_heading: "Open for voting",
  closed_heading: "Results",
  disclaimer:
    "Seedow aggregates voting intentions and carries a collective voice. Resolution data is public and sourced; transmitting the actual vote to meetings rolls out in stages. Seedow never tells you how to vote.",
  back: "All votes",
  not_found_title: "Vote not found",
  not_found_desc: "This resolution doesn't exist or was withdrawn.",
  voted_confirm: "Your “{{choice}}” vote is recorded.",
  change_vote: "Change my vote",
  casting: "Sending…",
  source: "Source: {{name}}",
  share_text: "My money has a voice. I'm voting on: {{title}} — on seedow.",
  choice_for: "For",
  choice_against: "Against",
  choice_abstain: "Abstain",
  status: {
    closed: "Closed",
    last_day: "Last day",
    days_left: "Closes · {{n}}d left",
  },
  list: {
    bloc_empty: "No one has voted yet",
    bloc_count: "{{formatted}} in the Bloc",
    voted: "Your vote: {{choice}}",
    see_result: "See the result",
    give_voice: "Give my voice",
  },
  explainer: {
    who: "Ethi explains",
  },
  bloc: {
    aria: "The Bloc, live vote count",
    live: "The Bloc · live",
    empty_title: "Be the first voice.",
    empty_desc: "No one has voted on this resolution yet. Your vote opens the Bloc.",
    you_line: "You're {{n}} voting “{{choice}}”.",
    total_line: "{{n}} people have already voted.",
    split_aria: "Against management: {{against}}. For management: {{forCount}}.",
    reinforce: "Reinforce the Bloc — share",
  },
  result: {
    official: "Official result",
    pending: "Result pending",
    bloc_title: "How the Seedow Bloc voted",
    bloc_empty: "No Bloc member had voted on this resolution.",
    bloc_line: "Of {{total}} Seedow votes, {{against}} voted against management ({{pct}}%).",
  },
  teaser: {
    eyebrow: "A vote is coming",
    be_first: "Be the first voice",
    bloc_count: "{{formatted}} in the Bloc",
    cta: "Give my voice",
    cta_voted: "See the Bloc",
  },
  share: {
    subline_choice: "people vote “{{choice}}”.",
    subline_total: "people have already voted.",
    tagline: "It's not inevitable. It's a choice. Yours too.",
  },
};

// ── Seedow Wrapped (le bilan) ────────────────────────────────────────────────
const wrappedFr = {
  link: "Voir mon bilan",
  card_eyebrow: "Mon bilan Seedow",
  loading: "Un instant…",
  close: "Fermer",
  tap_hint: "Touche pour continuer",
  intro_title: "Ton bilan Seedow",
  intro_sub: "Ce que ton argent a dit, cette année.",
  votes_label: "votes exprimés dans le Bloc",
  refusals_label: "fois où tu as dit non à la direction",
  refusals_label_short: "refus assumés",
  bloc_label: "personnes dans le plus grand Bloc que tu as rejoint — {{company}}",
  empty_title: "Ton bilan t'attend.",
  empty_desc: "Tu n'as pas encore voté. Rejoins un premier Bloc, et ton bilan prend vie.",
  empty_cta: "Voir les votes ouverts",
  final_title: "Voilà ton bilan.",
  final_sub: "Partage-le : ton argent a une voix, montre-la.",
  share_cta: "Partager mon bilan",
  final_vote_cta: "Rejoindre un vote",
  share: {
    bloc_line: "Mon plus grand Bloc : {{total}} personnes — {{company}}.",
    tagline: "Ce n'est pas une fatalité. C'est un choix. Le tien aussi.",
    text: "Mon bilan Seedow : mon argent a une voix. Et le tien ?",
  },
};
const wrappedEn = {
  link: "See my recap",
  card_eyebrow: "My Seedow recap",
  loading: "One moment…",
  close: "Close",
  tap_hint: "Tap to continue",
  intro_title: "Your Seedow recap",
  intro_sub: "What your money said this year.",
  votes_label: "votes cast in the Bloc",
  refusals_label: "times you said no to management",
  refusals_label_short: "clear refusals",
  bloc_label: "people in the biggest Bloc you joined — {{company}}",
  empty_title: "Your recap is waiting.",
  empty_desc: "You haven't voted yet. Join a first Bloc and your recap comes to life.",
  empty_cta: "See open votes",
  final_title: "Here's your recap.",
  final_sub: "Share it: your money has a voice — show it.",
  share_cta: "Share my recap",
  final_vote_cta: "Join a vote",
  share: {
    bloc_line: "My biggest Bloc: {{total}} people — {{company}}.",
    tagline: "It's not inevitable. It's a choice. Yours too.",
    text: "My Seedow recap: my money has a voice. What about yours?",
  },
};

const mergedFr = deepMerge(fr, {
  landing: { rayon_x: rayonXFr },
  dashboard: dashboardFr,
  asset_detail: assetDetailFr,
  portfolio: portfolioFr,
  growth_comparison: growthComparisonFr,
  rail_nav: { vote: "Le Vote", wrapped: "Bilan" },
  vote: voteFr,
  wrapped: wrappedFr,
});
const mergedEn = deepMerge(en, {
  landing: { rayon_x: rayonXEn },
  dashboard: dashboardEn,
  asset_detail: assetDetailEn,
  portfolio: portfolioEn,
  growth_comparison: growthComparisonEn,
  rail_nav: { vote: "The Vote", wrapped: "Recap" },
  vote: voteEn,
  wrapped: wrappedEn,
});

writeFileSync("src/i18n/locales/fr.json", JSON.stringify(mergedFr, null, 2) + "\n", "utf-8");
writeFileSync("src/i18n/locales/en.json", JSON.stringify(mergedEn, null, 2) + "\n", "utf-8");
