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
  // Moment « Ta voix » — après le questionnaire, avant l'aperçu d'allocation.
  agency: {
    eyebrow: "Ta voix",
    loading: "Lecture des votes ouverts…",
    title: "Ton argent ne sera plus un chiffre. Ce sera une voix.",
    subtitle: "Un vote t'attend déjà — sur une entreprise que tu pourrais détenir.",
    subtitle_matched:
      "Sur {{cause}}, un vote t'attend déjà — sur une entreprise que tu pourrais détenir.",
    source: "Source {{source}} · assemblée du {{date}}",
    without_seedow: "Avec un ETF classique ou ta banque, ce vote se joue sans toi.",
    signature: "Ce n'est pas une fatalité. C'est un choix. Le tien aussi.",
    cta: "Voir mon portefeuille",
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
  // "Your voice" moment — after the questionnaire, before the allocation preview.
  agency: {
    eyebrow: "Your voice",
    loading: "Reading open votes…",
    title: "Your money won't just be a number. It'll be a voice.",
    subtitle: "A vote is already waiting — on a company you could own.",
    subtitle_matched: "On {{cause}}, a vote is already waiting — on a company you could own.",
    source: "Source {{source}} · meeting on {{date}}",
    without_seedow: "With a classic ETF or your bank, this vote happens without you.",
    signature: "It's not inevitable. It's a choice. Yours too.",
    cta: "See my portfolio",
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
  badges_disclosure: "Vos jalons",
  comparatif_disclosure: "Comparer à un ETF classique",
  refiner_disclosure: "Arbitrages avancés",
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
  badges_disclosure: "Your milestones",
  comparatif_disclosure: "Compare to a classic ETF",
  refiner_disclosure: "Advanced trade-offs",
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

// ── Le Réveil (fil de conscience quotidien) ──────────────────────────────────
const reveilFr = {
  eyebrow: "Le Réveil",
  title: "Le Réveil",
  loading: "Lecture de tes lignes…",
  subtitle: "{{n}} choses à savoir sur les entreprises que tu détiens et suis, aujourd'hui.",
  subtitle_empty: "Rien à signaler aujourd'hui sur tes lignes. Reviens demain.",
  empty_title: "Ton réveil est calme.",
  empty_desc:
    "Ajoute des entreprises à ton portefeuille ou à ta liste de suivi, et Le Réveil te dira ce que la donnée en pense.",
  empty_cta: "Découvrir des entreprises",
  source_today: "Aujourd'hui",
  cta_vote: "Voter",
  cta_why: "Voir pourquoi",
  tone: { action: "À faire", caution: "Attention", bright: "Bonne nouvelle" },
  vote: {
    headline: "Un vote arrive sur {{company}}.",
    body: "Tu peux peser dessus. Clôture dans {{n}} jour(s).",
  },
  greenwashing: {
    headline_owned: "{{company}} : le discours ne colle pas à la donnée.",
    headline_watched: "{{company}} (suivie) : le discours ne colle pas à la donnée.",
    generic: "Notre détection signale un écart entre ses revendications et les données observées.",
  },
  bright: {
    headline_owned: "{{company}} tient ses engagements.",
    headline_watched: "{{company}} (suivie) tient ses engagements.",
    body: "Score ESG solide ({{score}}/10) et aucune incohérence détectée.",
  },
  reason: {
    art9_low_esg: "Se dit « durable » (SFDR 9) mais son score ESG est faible.",
    art9_borderline_esg: "Label « durable » (SFDR 9), score ESG tout juste à la limite.",
    art9_no_exclusions: "Se dit « durable » sans exclure aucun secteur controversé.",
    sfdr_low_esg: "Revendique un objectif ESG (SFDR 8) avec un score faible.",
    sfdr_borderline_esg: "Objectif ESG affiché (SFDR 8), score à la limite.",
    sfdr_missing_carbon: "Revendique un objectif ESG sans donnée carbone mesurée.",
    sfdr_no_exclusions: "Objectif ESG affiché, mais aucun secteur exclu.",
    green_theme_low_climate: "Thème « vert » revendiqué, score climat faible.",
    green_theme_borderline_climate: "Thème « vert », score climat tout juste à la limite.",
    claims_on_estimated_data: "Revendications basées sur des données estimées, pas mesurées.",
  },
  teaser: { count: "{{n}} à voir", cta: "Ouvrir Le Réveil" },
};
const reveilEn = {
  eyebrow: "Morning read",
  title: "Morning read",
  loading: "Reading your holdings…",
  subtitle: "{{n}} things to know about the companies you hold and follow, today.",
  subtitle_empty: "Nothing to flag on your holdings today. Check back tomorrow.",
  empty_title: "Your morning is quiet.",
  empty_desc:
    "Add companies to your portfolio or watchlist, and the Morning Read will tell you what the data thinks.",
  empty_cta: "Discover companies",
  source_today: "Today",
  cta_vote: "Vote",
  cta_why: "See why",
  tone: { action: "To do", caution: "Heads up", bright: "Good news" },
  vote: {
    headline: "A vote is coming on {{company}}.",
    body: "You can weigh in. Closes in {{n}} day(s).",
  },
  greenwashing: {
    headline_owned: "{{company}}: the claims don't match the data.",
    headline_watched: "{{company}} (watched): the claims don't match the data.",
    generic: "Our detection flags a gap between its claims and the observed data.",
  },
  bright: {
    headline_owned: "{{company}} walks the talk.",
    headline_watched: "{{company}} (watched) walks the talk.",
    body: "Solid ESG score ({{score}}/10) and no inconsistency detected.",
  },
  reason: {
    art9_low_esg: 'Calls itself "sustainable" (SFDR 9) but its ESG score is low.',
    art9_borderline_esg: '"Sustainable" label (SFDR 9), ESG score barely at the line.',
    art9_no_exclusions: 'Calls itself "sustainable" while excluding no controversial sector.',
    sfdr_low_esg: "Claims an ESG objective (SFDR 8) with a low score.",
    sfdr_borderline_esg: "ESG objective stated (SFDR 8), borderline score.",
    sfdr_missing_carbon: "Claims an ESG objective with no measured carbon data.",
    sfdr_no_exclusions: "ESG objective stated, yet no sector excluded.",
    green_theme_low_climate: '"Green" theme claimed, low climate score.',
    green_theme_borderline_climate: '"Green" theme, climate score barely at the line.',
    claims_on_estimated_data: "Claims based on estimated data, not measured.",
  },
  teaser: { count: "{{n}} to see", cta: "Open the Morning Read" },
};

const comparatifFr = {
  reward_risk: "Rendement / risque",
  reward_risk_note: "Rendement attendu ÷ volatilité. Plus haut = mieux payé pour le risque pris.",
  risk_adjusted_title: "À risque comparable",
  risk_adjusted_body:
    "Comparer un portefeuille multi-actifs à un indice 100 % actions sans corriger le risque ne veut rien dire : on perd toujours en marché haussier, on gagne toujours en marché baissier. Ci-dessous, {{bench}} est ramené à ta volatilité ({{vol}} %) — le reste du capital n'est pas rémunéré.",
  risk_adjusted_bench: "{{bench}} ramené à ton risque",
  risk_adjusted_you: "Ton portefeuille",
  price_title: "Le prix de l'alignement",
  price_cost:
    "À risque comparable, ton portefeuille projette {{delta}} € de MOINS que {{bench}} sur 10 ans, pour {{capital}} € investis. C'est le coût de tes contraintes d'exclusion et d'impact — on ne le cache pas.",
  price_gain:
    "À risque comparable, ton portefeuille projette {{delta}} € de PLUS que {{bench}} sur 10 ans, pour {{capital}} € investis.",
  downside_title: "Si l'année tourne mal",
  downside_body:
    "Une baisse de 30 % sur {{bench}} correspondrait, à volatilité proportionnelle, à environ {{drop}} % sur ton portefeuille. Ce qu'il resterait de {{capital}} € :",
  downside_you: "Ton portefeuille",
  downside_bench: "{{bench}}",
  downside_note:
    "Estimation proportionnelle aux volatilités, pas une prévision. Un portefeuille moins volatil baisse en général moins fort — il ne baisse pas jamais.",
  window_note:
    "Rendements attendus estimés sur l'historique de cours réel disponible (fenêtre glissante de 2 ans), avec shrinkage de James-Stein plafonné et ancrage par classe d'actifs. Une fenêtre courte surestime les classes récemment porteuses.",
};

const comparatifEn = {
  reward_risk: "Return / risk",
  reward_risk_note: "Expected return ÷ volatility. Higher = better paid for the risk taken.",
  risk_adjusted_title: "At comparable risk",
  risk_adjusted_body:
    "Comparing a multi-asset portfolio to a 100% equity index without adjusting for risk is meaningless: you always lose in a bull market and always win in a bear one. Below, {{bench}} is scaled down to your volatility ({{vol}}%) — the remaining capital earns nothing.",
  risk_adjusted_bench: "{{bench}} scaled to your risk",
  risk_adjusted_you: "Your portfolio",
  price_title: "The price of alignment",
  price_cost:
    "At comparable risk, your portfolio projects {{delta}} € LESS than {{bench}} over 10 years, on {{capital}} € invested. That is the cost of your exclusions and impact constraints — we do not hide it.",
  price_gain:
    "At comparable risk, your portfolio projects {{delta}} € MORE than {{bench}} over 10 years, on {{capital}} € invested.",
  downside_title: "If the year goes badly",
  downside_body:
    "A 30% drop on {{bench}} would translate, proportionally to volatility, into roughly {{drop}}% on your portfolio. What would be left of {{capital}} €:",
  downside_you: "Your portfolio",
  downside_bench: "{{bench}}",
  downside_note:
    "Proportional estimate based on volatilities, not a forecast. A less volatile portfolio usually falls less — it does not never fall.",
  window_note:
    "Expected returns estimated on the real price history available (rolling 2-year window), with capped James-Stein shrinkage anchored per asset class. A short window overstates recently strong asset classes.",
};

// ─────────────────────────────────────────────────────────
// Copilote d'investissement — écran des 3 choix + coup d'œil lisible
// ─────────────────────────────────────────────────────────
const postSimForkFr = {
  title: "Votre portefeuille est prêt 🎉",
  subtitle:
    "Seedow vous propose une première version basée sur vos réponses. À vous de choisir la suite.",
  recommended: "Recommandé",
  guided_title: "Laissez Seedow vous guider",
  guided_desc: "Nous gardons la proposition construite pour vous.",
  customize_title: "Personnaliser",
  customize_desc: "Partez de notre proposition et ajustez-la à votre main.",
  blank_title: "Commencer de zéro",
  blank_desc: "Composez votre portefeuille vous-même, pas à pas.",
  simulation_note: "Une proposition, pas une recommandation d'achat. Vous décidez.",
};

const postSimForkEn = {
  title: "Your portfolio is ready 🎉",
  subtitle:
    "Seedow suggests a first version based on your answers. It's up to you what comes next.",
  recommended: "Recommended",
  guided_title: "Let Seedow guide you",
  guided_desc: "We keep the proposal built for you.",
  customize_title: "Customize",
  customize_desc: "Start from our proposal and adjust it your way.",
  blank_title: "Start from scratch",
  blank_desc: "Build your portfolio yourself, step by step.",
  simulation_note: "A proposal, not a buy recommendation. You decide.",
};

const portfolioGlanceFr = {
  eyebrow: "En un coup d'œil",
  title: "Votre portefeuille",
  chip: {
    impact: "Impact",
    risk: "Risque",
    fees: "Frais",
    diversification: "Diversification",
  },
  risk: { prudent: "Prudent", modere: "Modéré", dynamique: "Dynamique" },
  div: { limitee: "Limitée", correcte: "Correcte", bonne: "Bonne" },
  fees_suffix: "/ an",
  impact_sublabel: "Responsabilité E·S·G",
  impact_basis: "Calculé à partir des notes ESG de chaque investissement.",
  impact_sources_link: "Voir le détail et les sources",
  help_cta: "Que veulent dire ces mots ?",
  help: {
    impact:
      "Impact : la responsabilité environnementale, sociale et de gouvernance de vos investissements, notée sur 100. C'est une moyenne de notes ESG — un repère, pas une garantie d'impact positif.",
    risk: "Risque : à quel point la valeur peut monter ou descendre au fil du temps.",
    fees: "Frais : ce que vos investissements coûtent chaque année.",
    diversification:
      "Diversification : répartir votre argent pour ne pas dépendre d'un seul investissement.",
  },
  money_title: "Où va votre argent ?",
  bucket: { actions: "Actions", obligations: "Obligations", autres: "Autres" },
  why_title: "Pourquoi cette proposition ?",
  why: {
    horizon_long: "Vous prévoyez d'investir sur le long terme (environ {{years}} ans).",
    horizon_medium: "Vous prévoyez d'investir sur plusieurs années (environ {{years}} ans).",
    horizon_short: "Vous prévoyez d'investir sur une courte durée (environ {{years}} ans).",
    risk_prudent:
      "Vous préférez limiter les fluctuations, quitte à viser une croissance plus douce.",
    risk_modere: "Vous acceptez des fluctuations modérées pour viser une croissance régulière.",
    risk_dynamique:
      "Vous acceptez des fluctuations plus fortes pour viser une croissance plus élevée.",
    causes:
      "La sélection privilégie des investissements cohérents avec les valeurs que vous avez choisies.",
    exclusions: "Les secteurs que vous refusez de financer ont été entièrement exclus.",
  },
  role: {
    equity_dev:
      "Réunit de grandes entreprises de plusieurs pays — le socle de nombreux portefeuilles.",
    equity_em: "Ouvre votre portefeuille à des économies en croissance.",
    thematic: "Cible directement les causes qui vous tiennent à cœur.",
    green_bond: "Prête de l'argent à des projets écologiques — plus stable que les actions.",
    social_bond: "Finance des projets à utilité sociale — plutôt stable.",
    sov_bond: "Prête à des États — amortit les fluctuations du portefeuille.",
    corporate_bond: "Prête à des entreprises — apporte un revenu plus régulier.",
    reit: "Diversifie votre portefeuille via l'immobilier.",
    commodity: "Diversifie en dehors des actions et des obligations.",
    cash: "Met une part de votre argent de côté, en sécurité.",
    generic: "Contribue à équilibrer votre portefeuille.",
  },
  see_details: "Voir les détails",
  simulation_note:
    "Simulation à but pédagogique — Seedow vous informe, vous gardez le contrôle. Aucune transaction réelle.",
};

const portfolioGlanceEn = {
  eyebrow: "At a glance",
  title: "Your portfolio",
  chip: {
    impact: "Impact",
    risk: "Risk",
    fees: "Fees",
    diversification: "Diversification",
  },
  risk: { prudent: "Cautious", modere: "Moderate", dynamique: "Dynamic" },
  div: { limitee: "Limited", correcte: "Fair", bonne: "Good" },
  fees_suffix: "/ year",
  impact_sublabel: "E·S·G responsibility",
  impact_basis: "Computed from the ESG ratings of each investment.",
  impact_sources_link: "See details and sources",
  help_cta: "What do these words mean?",
  help: {
    impact:
      "Impact: the environmental, social and governance responsibility of your investments, scored out of 100. It's an average of ESG ratings — a guide, not a guarantee of positive impact.",
    risk: "Risk: how much the value can go up or down over time.",
    fees: "Fees: what your investments cost each year.",
    diversification:
      "Diversification: spreading your money so you don't depend on a single investment.",
  },
  money_title: "Where does your money go?",
  bucket: { actions: "Stocks", obligations: "Bonds", autres: "Other" },
  why_title: "Why this proposal?",
  why: {
    horizon_long: "You plan to invest for the long term (around {{years}} years).",
    horizon_medium: "You plan to invest over several years (around {{years}} years).",
    horizon_short: "You plan to invest for a short time (around {{years}} years).",
    risk_prudent: "You'd rather limit ups and downs, even if growth is gentler.",
    risk_modere: "You accept moderate ups and downs to aim for steady growth.",
    risk_dynamique: "You accept larger ups and downs to aim for higher growth.",
    causes: "The selection favours investments aligned with the values you chose.",
    exclusions: "The sectors you refuse to fund have been fully excluded.",
  },
  role: {
    equity_dev: "Bundles large companies from many countries — the backbone of many portfolios.",
    equity_em: "Opens your portfolio to fast-growing economies.",
    thematic: "Directly targets the causes you care about.",
    green_bond: "Lends money to green projects — steadier than stocks.",
    social_bond: "Funds projects with social value — fairly steady.",
    sov_bond: "Lends to governments — cushions the portfolio's swings.",
    corporate_bond: "Lends to companies — brings a more regular income.",
    reit: "Diversifies your portfolio through real estate.",
    commodity: "Diversifies outside stocks and bonds.",
    cash: "Keeps part of your money aside, safely.",
    generic: "Helps balance your portfolio.",
  },
  see_details: "See details",
  simulation_note:
    "Educational simulation — Seedow informs you, you stay in control. No real transaction.",
};

const portfolioCustomizerFr = {
  eyebrow: "Personnaliser",
  title: "Ajustez votre portefeuille",
  desc: "Réglez chaque ligne librement. Seedow vous montre votre impact et le potentiel que vous visez — vous gardez la main, il ne réoptimise rien à votre place.",
  potential_label: "Potentiel visé",
  potential_concentrated: "Plus offensif",
  potential_balanced: "Plus régulier",
  benefit_concentrated:
    "En misant plus sur quelques lignes, vous visez un potentiel de gain plus élevé — le risque monte aussi.",
  benefit_balanced:
    "En répartissant sur plusieurs lignes, vous visez un parcours plus régulier — un potentiel plus posé, un risque plus doux.",
  need_one: "Gardez au moins un investissement pour enregistrer.",
  consequence: {
    more_concentrated:
      "Votre portefeuille est plus concentré — une plus grande partie de votre argent dépend de moins d'investissements.",
    less_concentrated:
      "Votre portefeuille est mieux réparti — votre argent dépend de davantage d'investissements.",
    diversification_up: "Votre diversification s'améliore.",
    diversification_down: "Votre diversification diminue.",
    impact_up: "Votre impact augmente (environ +{{pts}} points sur 100).",
    impact_down: "Votre impact baisse (environ −{{pts}} points sur 100).",
  },
  remove: "Retirer cette ligne",
  weight_of: "Poids de {{name}}",
  total: "Total réparti",
  normalize_note:
    "Pas besoin d'arriver pile à 100 % : Seedow répartit automatiquement à l'enregistrement.",
  add: "Ajouter un investissement",
  reset: "Annuler",
  save: "Enregistrer mes choix",
  saving: "Enregistrement…",
  saved: "Portefeuille mis à jour",
  saved_desc: "Vos ajustements ont été enregistrés.",
  save_error: "Impossible d'enregistrer",
  simulation_note:
    "Simulation à but pédagogique — Seedow vous explique, vous décidez. Aucune transaction réelle.",
};

const portfolioCustomizerEn = {
  eyebrow: "Customize",
  title: "Adjust your portfolio",
  desc: "Set each line freely. Seedow shows your impact and the potential you're aiming for — you stay in control, it re-optimizes nothing on your behalf.",
  potential_label: "Potential aimed for",
  potential_concentrated: "More aggressive",
  potential_balanced: "Steadier",
  benefit_concentrated: "Betting more on a few lines aims for higher upside — risk goes up too.",
  benefit_balanced:
    "Spreading across several lines aims for a steadier ride — calmer upside, gentler risk.",
  need_one: "Keep at least one investment to save.",
  consequence: {
    more_concentrated:
      "Your portfolio is more concentrated — more of your money depends on fewer investments.",
    less_concentrated:
      "Your portfolio is better spread out — your money depends on more investments.",
    diversification_up: "Your diversification improves.",
    diversification_down: "Your diversification decreases.",
    impact_up: "Your impact goes up (about +{{pts}} points out of 100).",
    impact_down: "Your impact goes down (about −{{pts}} points out of 100).",
  },
  remove: "Remove this line",
  weight_of: "Weight of {{name}}",
  total: "Total allocated",
  normalize_note: "No need to land exactly on 100% — Seedow rebalances automatically on save.",
  add: "Add an investment",
  reset: "Undo",
  save: "Save my choices",
  saving: "Saving…",
  saved: "Portfolio updated",
  saved_desc: "Your adjustments have been saved.",
  save_error: "Couldn't save",
  simulation_note: "Educational simulation — Seedow explains, you decide. No real transaction.",
};

// ─────────────────────────────────────────────────────────
// Parcours « Page blanche » — sélecteur d'actifs + builder vide
// ─────────────────────────────────────────────────────────
const assetPickerFr = {
  title: "Ajouter un investissement",
  desc: "Cherchez et ajoutez ce qui vous parle. Vous pourrez ajuster ensuite.",
  search_placeholder: "Rechercher un investissement…",
  loading: "Chargement…",
  empty: "Aucun résultat. Essayez un autre mot.",
  impact_short: "Impact {{score}}/100",
};

const assetPickerEn = {
  title: "Add an investment",
  desc: "Search and add what speaks to you. You can adjust afterwards.",
  search_placeholder: "Search an investment…",
  loading: "Loading…",
  empty: "No result. Try another word.",
  impact_short: "Impact {{score}}/100",
};

const blankBuilderFr = {
  eyebrow: "Page blanche",
  title: "Construire mon portefeuille",
  empty_title: "Construisons votre premier portefeuille",
  empty_desc:
    "Vous pouvez commencer simplement : ajoutez un premier investissement, on vous accompagne.",
  add: "Ajouter un investissement",
  discover: "Vous ne savez pas quoi choisir ? Découvrir",
  remove: "Retirer",
  weight_of: "Poids de {{name}}",
  total: "Total",
  normalize_note:
    "Pas besoin d'arriver pile à 100 % : Seedow répartit automatiquement à l'enregistrement.",
  save: "Enregistrer mon portefeuille",
  saving: "Enregistrement…",
  saved: "Portefeuille enregistré",
  saved_desc: "Votre portefeuille est prêt. Vous gardez la main à tout moment.",
  save_error: "Impossible d'enregistrer",
  need_one: "Ajoutez au moins un investissement pour enregistrer.",
  glance_positions: "Vous avez ajouté {{count}} investissement(s).",
  glance_div_limitee: "Votre argent dépend encore de peu de lignes.",
  glance_div_correcte: "La répartition commence à être correcte.",
  glance_div_bonne: "Bonne répartition entre vos investissements.",
  glance_concentrated: "Attention : une ligne pèse une grande partie de votre argent.",
  glance_impact: "Impact {{score}}/100",
  glance_riskfees_note: "Risque et frais précis calculés à l'enregistrement.",
  simulation_note: "Simulation à but pédagogique — aucune transaction réelle. Vous décidez.",
};

const blankBuilderEn = {
  eyebrow: "Blank page",
  title: "Build my portfolio",
  empty_title: "Let's build your first portfolio",
  empty_desc: "You can start simply: add a first investment, we'll guide you.",
  add: "Add an investment",
  discover: "Not sure what to pick? Explore",
  remove: "Remove",
  weight_of: "Weight of {{name}}",
  total: "Total",
  normalize_note:
    "No need to land exactly on 100% — Seedow rebalances automatically when you save.",
  save: "Save my portfolio",
  saving: "Saving…",
  saved: "Portfolio saved",
  saved_desc: "Your portfolio is ready. You stay in control at any time.",
  save_error: "Couldn't save",
  need_one: "Add at least one investment to save.",
  glance_positions: "You've added {{count}} investment(s).",
  glance_div_limitee: "Your money still depends on very few holdings.",
  glance_div_correcte: "The spread is starting to look fair.",
  glance_div_bonne: "Good spread across your investments.",
  glance_concentrated: "Careful: one holding carries a large share of your money.",
  glance_impact: "Impact {{score}}/100",
  glance_riskfees_note: "Exact risk and fees are computed when you save.",
  simulation_note: "Educational simulation — no real transaction. You decide.",
};

const dataProvenanceFr = {
  coverage_label: "Que signifie la couverture ?",
  coverage_tooltip:
    "La part de votre portefeuille pour laquelle nous disposons d'une donnée réelle mesurée. Le reste n'est pas encore mesuré — il n'est pas estimé pour autant.",
  // DA V2 « Preuve » — libellés du crochet de provenance (components/ui/Provenance).
  // Le statut n'est jamais porté par la seule couleur : il s'écrit.
  coverage: "couverture {{pct}} %",
  no_source: "source non renseignée",
  status_modelled: "estimation Seedow",
  status_disputed: "contesté par la source",
  status_unknown: "non vérifié",
  live: "données en direct",
};
const dataProvenanceEn = {
  coverage_label: "What does coverage mean?",
  coverage_tooltip:
    "The share of your portfolio for which we have a real, measured data point. The rest isn't measured yet — and it isn't estimated either.",
  coverage: "{{pct}}% coverage",
  no_source: "source not recorded",
  status_modelled: "Seedow estimate",
  status_disputed: "disputed by the source",
  status_unknown: "unverified",
  live: "live data",
};

/** Onglet « Affiner » v2 — langage clair, paliers, zéro pourcentage à viser. */
const customizerV2Fr = {
  desc_v2:
    "Renforcez ou réduisez chaque ligne par petits pas. Seedow rééquilibre le reste et vous dit, en français, ce que ça change.",
  spread_label: "Répartition",
  risk_label: "Risque ressenti",
  risk_hint: "Estimé sur la répartition",
  positions_one: "{{count}} ligne",
  positions_other: "{{count}} lignes",
  what_changes: "Ce que ça change",
  increase: "Renforcer",
  decrease: "Réduire",
  increase_of: "Renforcer {{name}}",
  decrease_of: "Réduire {{name}}",
  one_in: "environ 1 € sur {{n}}",
  share: {
    petite: "Petite part",
    moyenne: "Part moyenne",
    importante: "Part importante",
    dominante: "Part dominante",
  },
  impact_level: { modere: "Modéré", solide: "Solide", fort: "Fort" },
  consequence: {
    risk_up: "Votre portefeuille devient un peu plus sensible aux variations de marché.",
    risk_down: "Votre portefeuille devient un peu moins sensible aux variations de marché.",
  },
};
const customizerV2En = {
  desc_v2:
    "Boost or trim each holding in small steps. Seedow rebalances the rest and tells you, in plain words, what changes.",
  spread_label: "Spread",
  risk_label: "Perceived risk",
  risk_hint: "Estimated from spread",
  positions_one: "{{count}} holding",
  positions_other: "{{count}} holdings",
  what_changes: "What this changes",
  increase: "Boost",
  decrease: "Trim",
  increase_of: "Boost {{name}}",
  decrease_of: "Trim {{name}}",
  one_in: "about 1 € in {{n}}",
  share: {
    petite: "Small share",
    moyenne: "Medium share",
    importante: "Large share",
    dominante: "Dominant share",
  },
  impact_level: { modere: "Moderate", solide: "Solid", fort: "Strong" },
  consequence: {
    risk_up: "Your portfolio becomes a bit more sensitive to market swings.",
    risk_down: "Your portfolio becomes a bit less sensitive to market swings.",
  },
};

const refinerPlainFr = {
  cost_euros: "≈ {{euros}} €",
  cost_neutral: "≈ 0 €",
  cost_lost_per_1000: "de moins par an pour 1 000 € investis",
  cost_gained_per_1000: "de plus par an pour 1 000 € investis",
  // Libellés neutres : on décrit une simulation, on ne conseille aucune action.
  desc: "Voici ce que chaque contrainte coûte ou rapporte dans la simulation. À toi de décider ce qui compte pour toi.",
  keep: "Conserver cette contrainte",
  lift: "Simuler sans cette contrainte",
  accepted: "Contrainte conservée dans la simulation.",
  to_lift: "Contrainte levée dans la simulation.",
  after_label: "Sans la contrainte — {{label}}",
  optimizer_note:
    "Résultat mécanique de l'optimiseur sous les contraintes posées — ni une recommandation, ni une incitation à investir.",
};
const refinerPlainEn = {
  cost_euros: "≈ €{{euros}}",
  cost_neutral: "≈ €0",
  cost_lost_per_1000: "less per year per €1,000 invested",
  cost_gained_per_1000: "more per year per €1,000 invested",
  desc: "Here is what each constraint costs or adds in the simulation. You decide what matters to you.",
  keep: "Keep this constraint",
  lift: "Simulate without this constraint",
  accepted: "Constraint kept in the simulation.",
  to_lift: "Constraint lifted in the simulation.",
  after_label: "Without the constraint — {{label}}",
  optimizer_note:
    "Mechanical output of the optimiser under the constraints you set — not a recommendation, nor an invitation to invest.",
};

const simulationAckFr = {
  title: "Avant d'enregistrer",
  body: "Seedow est un outil de simulation pédagogique. Le portefeuille est virtuel, aucune transaction n'est exécutée, et Seedow n'est ni prestataire de services d'investissement ni conseiller en investissements financiers.",
  checkbox:
    "Je comprends qu'il s'agit d'une simulation et que Seedow ne me recommande aucun investissement.",
  cancel: "Annuler",
  confirm: "Je comprends, enregistrer",
};
const simulationAckEn = {
  title: "Before you save",
  body: "Seedow is an educational simulation tool. The portfolio is virtual, no transaction is executed, and Seedow is neither an investment services provider nor a financial investment adviser.",
  checkbox: "I understand this is a simulation and that Seedow recommends no investment to me.",
  cancel: "Cancel",
  confirm: "I understand, save",
};

const portfolioDisclaimerFr = {
  affiner_disclaimer:
    "Simulation pédagogique sur un portefeuille virtuel. Les écarts affichés sont la conséquence chiffrée de tes propres choix : Seedow ne formule aucune recommandation personnalisée, n'exécute aucune transaction et n'est ni PSI ni CIF.",
};
const portfolioDisclaimerEn = {
  affiner_disclaimer:
    "Educational simulation on a virtual portfolio. The figures shown are the measured consequence of your own choices: Seedow makes no personalised recommendation, executes no transaction, and is neither an investment services provider nor a financial investment adviser.",
};

// ── Landing : sélecteur de parcours « Que veux-tu faire ? » (mobile-first) ──
const landingPathsFr = {
  paths: {
    heading: "Que veux-tu faire ?",
    beginner_eyebrow: "Je débute",
    beginner_title: "Je n'ai jamais investi",
    beginner_desc: "On part de zéro, sans jargon. En 2 minutes tu vois par où commencer.",
    beginner_cta: "Commencer",
    learn_eyebrow: "Je veux comprendre",
    learn_title: "ETF, fonds, actions… c'est quoi ?",
    learn_desc: "Comprends ce qu'il y a derrière ces mots, sans jargon, à ton rythme.",
    learn_cta: "Comprendre",
    investor_eyebrow: "J'investis déjà",
    investor_title: "Comprendre mon portefeuille",
    investor_desc: "Ajoute tes investissements et vois vraiment ce que ton argent finance.",
    investor_cta: "Voir mon portefeuille",
  },
};
const landingPathsEn = {
  paths: {
    heading: "What would you like to do?",
    beginner_eyebrow: "I'm starting out",
    beginner_title: "I've never invested",
    beginner_desc: "Start from scratch, no jargon. In 2 minutes you'll see where to begin.",
    beginner_cta: "Get started",
    learn_eyebrow: "I want to understand",
    learn_title: "ETFs, funds, stocks… what are they?",
    learn_desc: "Understand what's behind these words, no jargon, at your own pace.",
    learn_cta: "Understand",
    investor_eyebrow: "I already invest",
    investor_title: "Understand my portfolio",
    investor_desc: "Add your investments and truly see what your money funds.",
    investor_cta: "See my portfolio",
  },
};

// « Le Fil » — accueil nouvelle génération (Seedow 2.0).
const leFilFr = {
  eyebrow: "Le Fil",
  money: "Mon argent",
  finance: "Ce que je finance",
  explore_aligned: "Explorer d'autres actifs alignés",
  define_convictions: "Définis tes convictions pour composer ton portefeuille.",
  investments: "Mes investissements",
  see_all: "Tout voir",
  empty_holdings: "Ton portefeuille est vide. Compose-le depuis tes convictions.",
  why: "Pourquoi ?",
  why_asset: "Pourquoi {{name}} ?",
  asset_detail: "Détail de {{name}}",
  compare_title: "Mon Fil vs indice Monde",
  expected_return: "Rendement attendu / an",
  risk_vol: "Risque (volatilité)",
  compare_detail: "Comparatif détaillé",
  returns_disclaimer: "Rendements attendus, pas garantis. Performance passée ≠ future.",
  compare_empty: "La comparaison s'affiche dès que ton portefeuille a des métriques.",
  mine: "Mon Fil",
  impact: "Mon impact",
  impact_weighted: "Score d'impact pondéré.",
  carbon_prefix: "Intensité carbone",
  carbon_suffix: "vs indice Monde.",
  carbon_source: "Source : WACI émetteurs (MSCI) vs indice ACWI · part couverte du portefeuille.",
  equivalences_title: "Concrètement, chaque année",
  equivalences_source: "Source",
  impact_link: "Voir ce que ton argent finance",
  impact_empty: "Ajoute des actifs pour mesurer ton impact.",
  more: "Aller plus loin",
  real_world: "Le monde réel",
  real_world_desc: "Les faits, les sources et le droit de réponse derrière chaque chiffre.",
  methodology: "Méthodologie & sources",
  ask_ethi: "Demander à Ethi",
  ethi_why: "Pourquoi ces actifs ?",
  ethi_compare: "Compare au MSCI World",
  ethi_challenge: "Challenge mon portefeuille",
  ethi_simulate: "Et si je privilégiais le climat ?",
};
const leFilEn = {
  eyebrow: "The Thread",
  money: "My money",
  finance: "What I fund",
  explore_aligned: "Explore more aligned assets",
  define_convictions: "Set your convictions to build your portfolio.",
  investments: "My investments",
  see_all: "See all",
  empty_holdings: "Your portfolio is empty. Build it from your convictions.",
  why: "Why?",
  why_asset: "Why {{name}}?",
  asset_detail: "{{name}} details",
  compare_title: "My Thread vs World index",
  expected_return: "Expected return / yr",
  risk_vol: "Risk (volatility)",
  compare_detail: "Detailed comparison",
  returns_disclaimer: "Expected returns, not guaranteed. Past performance ≠ future.",
  compare_empty: "The comparison appears once your portfolio has metrics.",
  mine: "My Thread",
  impact: "My impact",
  impact_weighted: "Weighted impact score.",
  carbon_prefix: "Carbon intensity",
  carbon_suffix: "vs World index.",
  carbon_source: "Source: issuer WACI (MSCI) vs ACWI index · covered share of the portfolio.",
  equivalences_title: "In real terms, every year",
  equivalences_source: "Source",
  impact_link: "See what your money funds",
  impact_empty: "Add assets to measure your impact.",
  more: "Go further",
  real_world: "The real world",
  real_world_desc: "The facts, sources and right of reply behind every figure.",
  methodology: "Methodology & sources",
  ask_ethi: "Ask Ethi",
  ethi_why: "Why these assets?",
  ethi_compare: "Compare to MSCI World",
  ethi_challenge: "Challenge my portfolio",
  ethi_simulate: "What if I prioritised climate?",
};

// Traductions FR manquantes du bloc « Réglages » (données de marché, santé des
// données, pipeline, version du moteur) — présentes en EN, absentes en FR.
const reglagesFr = {
  block_market_data: "Données de marché",
  market_data_desc:
    "Les cours sont rafraîchis automatiquement chaque jour de bourse à la clôture. Tu peux forcer une mise à jour immédiate ici.",
  refresh_prices: "Rafraîchir les cours maintenant",
  refreshing: "Rafraîchissement…",
  refresh_ok: "{{ok}} actif(s) mis à jour{{failedSuffix}}.",
  refresh_failed_suffix: ", {{n}} en échec",
  refresh_error: "Erreur de rafraîchissement",
  block_data_health: "Santé des données",
  history_loading: "Chargement de l'historique…",
  no_runs:
    "Aucune exécution enregistrée pour l'instant. Force un rafraîchissement ci-dessus pour lancer le suivi.",
  last_success: "Dernier succès :",
  ago_hours: "il y a {{h}} h",
  never: "jamais",
  block_pipeline: "Pipeline de construction",
  pipeline_desc:
    "Six étapes traçables : profilage, univers investissable, exclusions sectorielles, filtres ESG best-in-class, optimisation de Markowitz sous contraintes (plancher ESG, budget de risque, bornes de poids), puis inclinaison pré-optimisation des rendements attendus selon tes causes. Le simulateur interactif et la documentation détaillée sont sur la page dédiée.",
  see_methodology: "Lire la méthodologie complète",
  block_engine_version: "Version du moteur",
  engine_version_desc:
    "Méthodologie v1.1 · piliers E/S/G pondérés par les causes, intensité carbone réelle, traçabilité des sources. Revue chaque trimestre.",
};

const mergedFr = deepMerge(fr, {
  reglages: reglagesFr,
  le_fil: leFilFr,
  allocation_refiner: refinerPlainFr,
  landing: { rayon_x: rayonXFr, ...landingPathsFr },
  empty_portfolio: { build_own: "Construire mon portefeuille moi-même" },
  data_provenance: dataProvenanceFr,
  asset_picker: assetPickerFr,
  blank_builder: blankBuilderFr,
  dashboard: dashboardFr,
  asset_detail: assetDetailFr,
  portfolio: deepMerge(portfolioFr, portfolioDisclaimerFr),
  simulation_ack: simulationAckFr,

  growth_comparison: growthComparisonFr,
  rail_nav: { vote: "Le Vote", wrapped: "Bilan", reveil: "Le Réveil" },
  bottom_nav: { reveil: "Réveil", vote: "Le Vote", profile: "Profil" },
  vote: voteFr,
  wrapped: wrappedFr,
  reveil: reveilFr,
  comparatif_panel: comparatifFr,
  post_sim_fork: postSimForkFr,
  portfolio_glance: portfolioGlanceFr,
  portfolio_customizer: deepMerge(portfolioCustomizerFr, customizerV2Fr),
  // N1 — traçabilité ESG : part des scores réellement mesurés (vs estimés maison).
  portfolio_metrics: { esg_measured: "{{pct}} % mesuré", esg_estimated: "estimé" },
});
const mergedEn = deepMerge(en, {
  le_fil: leFilEn,
  landing: { rayon_x: rayonXEn, ...landingPathsEn },
  empty_portfolio: { build_own: "Build my portfolio myself" },
  data_provenance: dataProvenanceEn,
  asset_picker: assetPickerEn,
  blank_builder: blankBuilderEn,
  dashboard: dashboardEn,
  asset_detail: assetDetailEn,
  portfolio: deepMerge(portfolioEn, portfolioDisclaimerEn),
  simulation_ack: simulationAckEn,

  growth_comparison: growthComparisonEn,
  rail_nav: { vote: "The Vote", wrapped: "Recap", reveil: "Morning" },
  bottom_nav: { reveil: "Morning", vote: "The Vote", profile: "Profile" },
  vote: voteEn,
  wrapped: wrappedEn,
  reveil: reveilEn,
  comparatif_panel: comparatifEn,
  post_sim_fork: postSimForkEn,
  portfolio_glance: portfolioGlanceEn,
  portfolio_customizer: deepMerge(portfolioCustomizerEn, customizerV2En),
  allocation_refiner: refinerPlainEn,
  // N1 — ESG traceability: share of scores that are actually measured (vs estimated).
  portfolio_metrics: { esg_measured: "{{pct}}% measured", esg_estimated: "estimated" },
});

writeFileSync("src/i18n/locales/fr.json", JSON.stringify(mergedFr, null, 2) + "\n", "utf-8");
writeFileSync("src/i18n/locales/en.json", JSON.stringify(mergedEn, null, 2) + "\n", "utf-8");
