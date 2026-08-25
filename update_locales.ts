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
  status_verified: "vérifié",
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
  status_verified: "verified",
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
  // Nœud « Mon argent » : la variation doit dire par rapport à QUOI et à QUAND,
  // sinon un néophyte lit « -0,79 € » comme une baisse du jour.
  money_today: "Ce que ça vaut aujourd'hui",
  money_trend_up: "En hausse",
  money_trend_down: "En baisse",
  money_trend_flat: "Stable",
  money_since:
    "Écart avec les {{invested}} que tu as investis au départ — ce n'est pas la variation de la journée.",
  money_updated: "Derniers cours connus : {{date}}",
  money_updated_pending: "En attente des premiers cours de marché",
  money_empty: "Indique un montant investi pour suivre l'écart au fil du temps.",
  finance: "Ce que je finance",
  finance_hint:
    "Les familles d'actifs que ton argent finance, de la plus grosse part à la plus petite.",
  finance_share: "{{pct}} de ton argent",
  classes: {
    equity_dev: {
      label: "Grandes entreprises cotées",
      hint: "De grandes sociétés déjà installées (Europe, États-Unis, Japon). Tu en détiens une petite part.",
    },
    equity_em: {
      label: "Entreprises des pays émergents",
      hint: "Des sociétés d'économies en forte croissance : plus de potentiel, plus de secousses.",
    },
    thematic: {
      label: "Fonds à thème",
      hint: "Un panier centré sur un sujet précis : énergies propres, eau, santé…",
    },
    green_bond: {
      label: "Prêts à des projets écologiques",
      hint: "Tu prêtes de l'argent pour financer des projets environnementaux, remboursé avec des intérêts.",
    },
    social_bond: {
      label: "Prêts à des projets sociaux",
      hint: "Même principe, pour du logement, de l'éducation ou de la santé.",
    },
    sov_bond: {
      label: "Prêts à des États",
      hint: "Tu prêtes à des pays. C'est en général la partie la plus calme d'un portefeuille.",
    },
    corporate_bond: {
      label: "Prêts à des entreprises",
      hint: "Tu prêtes à des entreprises au lieu d'en détenir une part : des versements plus réguliers.",
    },
    reit: {
      label: "Immobilier coté",
      hint: "Des sociétés qui possèdent et louent des bâtiments : bureaux, logements, entrepôts.",
    },
    commodity: {
      label: "Matières premières",
      hint: "Métaux, énergie, agriculture — surtout utilisé pour diversifier.",
    },
    cash: {
      label: "Argent disponible",
      hint: "La part laissée en liquidités, mobilisable à tout moment.",
    },
    other: { label: "Autres", hint: "Le reste de ton portefeuille." },
  },
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
  money_today: "What it's worth today",
  money_trend_up: "Up",
  money_trend_down: "Down",
  money_trend_flat: "Flat",
  money_since: "Gap with the {{invested}} you invested at the start — this is not today's move.",
  money_updated: "Latest known prices: {{date}}",
  money_updated_pending: "Waiting for the first market prices",
  money_empty: "Set an invested amount to track the gap over time.",
  finance: "What I fund",
  finance_hint: "The asset families your money funds, largest share first.",
  finance_share: "{{pct}} of your money",
  classes: {
    equity_dev: {
      label: "Large listed companies",
      hint: "Big established companies (Europe, US, Japan). You own a small share of them.",
    },
    equity_em: {
      label: "Emerging-market companies",
      hint: "Companies in fast-growing economies: more potential, more turbulence.",
    },
    thematic: {
      label: "Theme funds",
      hint: "A basket focused on one topic: clean energy, water, health…",
    },
    green_bond: {
      label: "Loans to green projects",
      hint: "You lend money to fund environmental projects, repaid with interest.",
    },
    social_bond: {
      label: "Loans to social projects",
      hint: "Same idea, for housing, education or healthcare.",
    },
    sov_bond: {
      label: "Loans to governments",
      hint: "You lend to countries. Usually the calmest part of a portfolio.",
    },
    corporate_bond: {
      label: "Loans to companies",
      hint: "You lend to companies instead of owning a share: more regular payments.",
    },
    reit: {
      label: "Listed real estate",
      hint: "Companies that own and rent out buildings: offices, homes, warehouses.",
    },
    commodity: {
      label: "Commodities",
      hint: "Metals, energy, agriculture — mostly used to diversify.",
    },
    cash: { label: "Cash", hint: "The share kept liquid, available at any time." },
    other: { label: "Other", hint: "The rest of your portfolio." },
  },
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

// ── Lot 1 accessibilité + honnêteté de la maquette de versement ──────────
// A3 : lien d'évitement. A5 : nom accessible des curseurs d'intensité.
// P2 : la démo ne demande plus de moyen de paiement et n'affirme plus un
// chiffrement qui n'existe pas.
const a11yFr = {
  skip_to_content: "Aller au contenu",
  intensity_for: "Intensité — {{cause}}",
};
const a11yEn = {
  skip_to_content: "Skip to content",
  intensity_for: "Intensity — {{cause}}",
};

const investDialogFr = {
  description:
    "Simulation : aucun paiement n'est demandé et aucun débit n'est réalisé. Seul le capital déclaré de ton portefeuille est mis à jour.",
  simulation_notice:
    "Seedow ne traite pas de versement réel. On te demande un montant pour faire évoluer la simulation — jamais de carte, jamais d'IBAN.",
  presets: "Montants prédéfinis",
  footer_note: "Simulation · aucun moyen de paiement demandé",
  toast_success: "Simulation mise à jour : {{amount}}",
  toast_success_desc: "Le capital déclaré du portefeuille a changé. Aucun débit réel.",
};
const investDialogEn = {
  description:
    "Simulation: no payment is requested and nothing is charged. Only your portfolio's declared capital is updated.",
  simulation_notice:
    "Seedow does not process real payments. We ask for an amount to move the simulation forward — never a card, never an IBAN.",
  presets: "Preset amounts",
  footer_note: "Simulation · no payment method requested",
  toast_success: "Simulation updated: {{amount}}",
  toast_success_desc: "The portfolio's declared capital changed. Nothing was charged.",
};

// ── Lot 3 — rayon « Labo » assumé dans le hub du profil ──────────────────
// Vote et Réveil avaient quitté le rail comme « paris non prouvés » sans que
// ce statut soit visible : ils n'étaient plus atteignables que par ⌘K.
const profileLabFr = {
  lab_eyebrow: "Labo",
  lab_title: "Encore en exploration",
  lab_desc:
    "Ces surfaces existent, mais ne sont pas encore stabilisées : elles peuvent changer ou disparaître. On préfère te le dire que les laisser passer pour des fonctions arrêtées.",
  lab_observatory: "Observatoire",
};
const profileLabEn = {
  lab_eyebrow: "Lab",
  lab_title: "Still exploratory",
  lab_desc:
    "These surfaces exist but are not settled yet: they may change or go away. We would rather say so than let them pass for finished features.",
  lab_observatory: "Observatory",
};
const navCommunityFr = { community: "Communauté" };
const navCommunityEn = { community: "Community" };

/* Landing — lisibilité de la bande claire : qui parle dans l'exemple de
   conversation Ethi, et le libellé du champ de test ESG (le champ n'avait
   qu'un `aria-label`, donc rien d'écrit à l'écran au-dessus de lui). */
const landingReadabilityFr = {
  ethi: { speaker_you: "Toi" },
  quick_check: { field_label: "Teste un fonds ou un ETF" },
};
const landingReadabilityEn = {
  ethi: { speaker_you: "You" },
  quick_check: { field_label: "Test a fund or an ETF" },
};

/**
 * Bascule produit « pool plutôt qu'allocation » — Seedow ne compose plus à la
 * place de l'utilisateur. Les chaînes ci-dessous étaient restées sur l'ancienne
 * promesse (« Seedow construit l'allocation correspondante ») : elles décrivent
 * désormais ce que le produit fait réellement — filtrer, classer, expliquer,
 * pendant que l'utilisateur compose.
 */
/**
 * Refonte du simulateur /methodologie — la page publiait un pipeline qui ne
 * tourne plus (best-in-class, plancher ESG, optimisation Markowitz, tilts).
 * Ce que le moteur fait réellement : filtrer sur les exclusions, classer par
 * pertinence, puis MESURER le portefeuille que l'utilisateur compose.
 */
const methodologiePoolFr = {
  simulator_eyebrow: "Simulateur interactif",
  simulator_title: "Le classement, en direct",
  simulator_desc:
    "Bougez vos convictions et vos exclusions : le pool se refiltre et se reclasse sous vos yeux. Seedow s'arrête ici — il ne propose aucun poids, c'est vous qui composez.",
  reading_p1:
    "Vous choisissez ce qui compte pour vous (causes) et ce que vous refusez (exclusions). Vos exclusions retirent des fonds du pool ; vos causes pèsent sur son classement.",
  reading_p2:
    "À droite : combien de fonds l'univers contient, combien vos exclusions en écartent, et ceux qui restent — classés par pertinence, avec leur note ESG et leurs frais. Survolez les « ? » pour une explication simple de chaque terme.",
  causes_note:
    "Une cause activée pèse sur le classement via l'alignement réel de chaque fonds avec elle : sa présence compte, pas un dosage. Il n'existe donc pas de curseur d'intensité — nulle part dans l'app — plutôt qu'un réglage qui n'agirait sur rien.",
  no_weights_title: "Ce que ce simulateur ne fait pas",
  no_weights_body:
    "Il ne vous propose pas de répartition. Rendement attendu, volatilité, frais et empreinte carbone sont des mesures de PORTEFEUILLE : elles se calculent sur les lignes que vous avez composées, pas sur un pool. Vous les retrouvez sur votre portefeuille, une fois composé.",
  no_weights_cta: "Composer un portefeuille",
  funnel_universe: "Univers",
  funnel_excluded: "Écartés",
  funnel_kept: "Retenus",
  pool_title: "Pool classé",
  pool_shown: "{{shown}} affichés sur {{total}}",
  pool_relevance: "{{score}}/100",
  pool_pending: "données en cours",
  pool_esg: "ESG {{score}}/100",
  pool_ter: "frais {{ter}}",
  breakdown_title: "Le pool par classe d'actif",
  breakdown_count_one: "{{count}} fonds",
  breakdown_count_other: "{{count}} fonds",
  no_positions: "Aucun fonds ne passe ces exclusions.",
  loading: "Reclassement…",
  screening_version: "Méthode de classement v{{version}} — publiée et versionnée.",
  glossary: {
    pool: "Pool : la liste des fonds qui passent vos filtres, classés par pertinence. Seedow s'arrête là — vous composez.",
    relevance:
      "Pertinence : note 0–100 combinant performance réelle, score ESG et alignement avec vos causes. Un pilier absent est retiré du calcul, jamais remplacé par une valeur inventée.",
  },
  stages: {
    "1_name": "Profilage",
    "1_desc": "Vos causes et vos exclusions — les deux seules entrées du classement.",
    "2_name": "Univers",
    "2_desc":
      "Les actifs investissables, tous notés : un fonds sans score ESG sourcé n'y entre pas. Le compteur du simulateur affiche sa taille réelle.",
    "3_name": "Exclusions",
    "3_desc":
      "Filtre binaire et dur : un fonds touché par une de vos exclusions sort du pool, sans compromis ni pondération.",
    "4_name": "Classement",
    "4_desc":
      "Pertinence 0–100 : performance réelle (Sharpe, uniquement si l'historique le permet), score ESG composite, alignement avec vos causes. Sans historique, le fonds reste « en cours » plutôt que noté au jugé.",
    "5_name": "Composition, puis mesure",
    "5_desc":
      "Vous composez vos lignes. Le moteur mesure ensuite ce que VOUS avez composé — risque, frais, ESG pondéré E/S/G selon vos causes, empreinte carbone.",
  },
  tips: {
    pool: "Les fonds qui passent vos filtres, du plus pertinent au moins pertinent. Aucun poids : la répartition, c'est vous qui la faites.",
    breakdown:
      "Combien de fonds retenus dans chaque grande famille (actions, obligations, immobilier…). C'est la composition du pool, pas d'un portefeuille.",
    stage_5:
      "Seedow mesure le portefeuille que vous avez composé : il ne le compose pas à votre place.",
  },
};

const methodologiePoolEn = {
  simulator_eyebrow: "Interactive simulator",
  simulator_title: "The ranking, live",
  simulator_desc:
    "Move your convictions and exclusions: the pool re-filters and re-ranks in front of you. Seedow stops here — it proposes no weights, you do the composing.",
  reading_p1:
    "You choose what matters to you (causes) and what you refuse (exclusions). Your exclusions remove funds from the pool; your causes weigh on its ranking.",
  reading_p2:
    "On the right: how many funds the universe holds, how many your exclusions filter out, and what remains — ranked by relevance, with ESG score and fees. Hover the « ? » for a plain explanation of each term.",
  causes_note:
    "An active cause weighs on the ranking through each fund's real alignment with it: its presence counts, not a dosage. So there is no intensity slider — nowhere in the app — rather than a control that would act on nothing.",
  no_weights_title: "What this simulator does not do",
  no_weights_body:
    "It does not propose an allocation. Expected return, volatility, fees and carbon footprint are PORTFOLIO measures: they are computed on the lines you composed, not on a pool. You find them on your portfolio, once composed.",
  no_weights_cta: "Compose a portfolio",
  funnel_universe: "Universe",
  funnel_excluded: "Filtered out",
  funnel_kept: "Kept",
  pool_title: "Ranked pool",
  pool_shown: "{{shown}} shown of {{total}}",
  pool_relevance: "{{score}}/100",
  pool_pending: "data pending",
  pool_esg: "ESG {{score}}/100",
  pool_ter: "fees {{ter}}",
  breakdown_title: "The pool by asset class",
  breakdown_count_one: "{{count}} fund",
  breakdown_count_other: "{{count}} funds",
  no_positions: "No fund passes these exclusions.",
  loading: "Re-ranking…",
  screening_version: "Ranking method v{{version}} — published and versioned.",
  glossary: {
    pool: "Pool: the funds that pass your filters, ranked by relevance. Seedow stops there — you compose.",
    relevance:
      "Relevance: a 0–100 score combining real performance, ESG score and alignment with your causes. A missing pillar is dropped from the calculation, never replaced by an invented value.",
  },
  stages: {
    "1_name": "Profiling",
    "1_desc": "Your causes and your exclusions — the only two inputs to the ranking.",
    "2_name": "Universe",
    "2_desc":
      "The investable assets, all rated: a fund without a sourced ESG score never enters. The simulator's counter shows its real size.",
    "3_name": "Exclusions",
    "3_desc":
      "A hard, binary filter: a fund hit by one of your exclusions leaves the pool, with no compromise and no weighting.",
    "4_name": "Ranking",
    "4_desc":
      "Relevance 0–100: real performance (Sharpe, only where history allows), composite ESG score, alignment with your causes. Without history, a fund stays « pending » rather than being rated on a guess.",
    "5_name": "Composition, then measurement",
    "5_desc":
      "You compose your lines. The engine then measures what YOU composed — risk, fees, ESG weighted E/S/G by your causes, carbon footprint.",
  },
  tips: {
    pool: "The funds that pass your filters, most relevant first. No weights: the split is yours to make.",
    breakdown:
      "How many kept funds sit in each broad family (equities, bonds, real estate…). This is the pool's make-up, not a portfolio's.",
    stage_5: "Seedow measures the portfolio you composed: it does not compose it for you.",
  },
};

/**
 * Libellés de l'analyse explicable. `analyzePortfolio` rend des CODES stables
 * (`risk.low`, `tradeoff.concentration`…) ; le texte vit ici, pour que le moteur
 * reste testable sans dépendre d'une langue.
 */
const analysisFr = {
  unknown: "Inconnu",
  score_100: "{{score}}/100",
  volatility: "volatilité {{pct}}",
  horizon_years_one: "{{count}} an",
  horizon_years_other: "{{count}} ans",
  largest_position: "plus grosse ligne {{pct}}",
  esg_sourced: "{{pct}} de scores sourcés",
  exclusions_ok: "Respectées",
  exclusions_breached_one: "{{count}} non respectée",
  exclusions_breached_other: "{{count}} non respectées",
  tradeoffs_title: "Ce que ça implique",
  row: {
    alignment: "Alignement avec tes convictions",
    exclusions: "Tes exclusions",
    risk: "Niveau de risque",
    horizon: "Cohérence avec ton horizon",
    diversification: "Concentration",
    data: "Qualité des données",
  },
  severity: { critical: "à corriger", warning: "attention", info: "info" },
  risk: {
    low: "Prudent",
    moderate: "Modéré",
    high: "Dynamique",
    unknown: "Pas encore mesurable",
  },
  horizon: {
    good: "Cohérent",
    acceptable: "Acceptable",
    weak: "Tendu",
    unknown: "Horizon non renseigné",
  },
  concentration: {
    low: "Bien répartie",
    moderate: "Modérée",
    high: "Forte",
    unknown: "Pas de position",
  },
  data: {
    high: "Solide",
    medium: "Partielle",
    low: "Limitée",
    unknown: "Pas de donnée",
  },
  alignment: {
    measured: "mesuré sur l'exposition réelle de tes lignes",
    no_causes: "aucune conviction déclarée",
    no_exposure_data: "aucune donnée d'exposition sur tes lignes",
    exclusions_ok: "aucune de tes exclusions n'est touchée",
    exclusions_breached: "au moins une ligne touche un secteur que tu refuses",
    no_exclusions: "aucune exclusion déclarée",
  },
  tradeoff: {
    exclusion_breached_one:
      "Une de tes lignes touche un secteur que tu as exclu. C'est le seul point qui contredit un choix que tu as posé.",
    exclusion_breached_other:
      "{{count}} de tes exclusions sont touchées par tes lignes. Ce sont les seuls points qui contredisent des choix que tu as posés.",
    concentration:
      "Une ligne pèse {{pct}} de ce que tu as placé. Ton résultat dépendra beaucoup d'elle.",
    horizon_weak:
      "Ce niveau de risque demande plus de temps que l'horizon que tu as indiqué. Ni bon ni mauvais — à savoir.",
    data_low:
      "Une grande partie de tes lignes n'a pas encore d'historique de marché suffisant : risque et frais sont des estimations de classe, pas des mesures.",
    unallocated: "{{pct}} de ton montant ne sont placés sur aucune ligne.",
  },
};

const analysisEn = {
  unknown: "Unknown",
  score_100: "{{score}}/100",
  volatility: "volatility {{pct}}",
  horizon_years_one: "{{count}} year",
  horizon_years_other: "{{count}} years",
  largest_position: "largest holding {{pct}}",
  esg_sourced: "{{pct}} sourced scores",
  exclusions_ok: "Respected",
  exclusions_breached_one: "{{count}} breached",
  exclusions_breached_other: "{{count}} breached",
  tradeoffs_title: "What this implies",
  row: {
    alignment: "Alignment with your convictions",
    exclusions: "Your exclusions",
    risk: "Risk level",
    horizon: "Fit with your horizon",
    diversification: "Concentration",
    data: "Data quality",
  },
  severity: { critical: "to fix", warning: "heads-up", info: "info" },
  risk: { low: "Cautious", moderate: "Moderate", high: "Dynamic", unknown: "Not measurable yet" },
  horizon: {
    good: "Consistent",
    acceptable: "Acceptable",
    weak: "Tight",
    unknown: "No horizon set",
  },
  concentration: {
    low: "Well spread",
    moderate: "Moderate",
    high: "Strong",
    unknown: "No position",
  },
  data: { high: "Solid", medium: "Partial", low: "Limited", unknown: "No data" },
  alignment: {
    measured: "measured on your holdings' real exposure",
    no_causes: "no conviction declared",
    no_exposure_data: "no exposure data on your holdings",
    exclusions_ok: "none of your exclusions is touched",
    exclusions_breached: "at least one holding touches a sector you refuse",
    no_exclusions: "no exclusion declared",
  },
  tradeoff: {
    exclusion_breached_one:
      "One of your holdings touches a sector you excluded. It is the only point contradicting a choice you made.",
    exclusion_breached_other:
      "{{count}} of your exclusions are touched by your holdings. These are the only points contradicting choices you made.",
    concentration:
      "One holding weighs {{pct}} of what you allocated. Your outcome will depend heavily on it.",
    horizon_weak:
      "This risk level asks for more time than the horizon you set. Neither good nor bad — worth knowing.",
    data_low:
      "A large share of your holdings has no sufficient market history yet: risk and fees are class estimates, not measurements.",
    unallocated: "{{pct}} of your amount sits on no holding.",
  },
};

/** « Ce qu'on sait de ce fonds » — les couches et leurs manques, sur la fiche actif. */
const assetLayersFr = {
  title: "Ce qu'on sait de ce fonds",
  hint: "L'état de nos données, pas un jugement sur le fonds. Un fonds mal documenté n'est pas un mauvais fonds — c'est un fonds sur lequel nous savons moins de choses.",
  gaps: "Manque : {{fields}}",
  sources_one: "1 chiffre attribué · source : {{sources}}",
  sources_other: "{{count}} chiffres attribués · sources : {{sources}}",
  no_source:
    "Aucun chiffre de ce fonds n'est encore attribuable à une source — nous ne les présentons donc pas comme mesurés.",
  layer: {
    identity: "Identité",
    structure: "Structure",
    values: "Valeurs",
    market: "Marché",
  },
  status: {
    complete: "complète",
    partial: "partielle",
    missing: "absente",
    unknown: "non consultée",
  },
  field: {
    isin: "ISIN",
    name: "nom",
    issuer: "émetteur",
    domicile: "domicile",
    currency: "devise",
    ter: "frais",
    asset_class: "classe d'actif",
    region: "région",
    cause_exposure: "expositions",
    excluded_sectors: "secteurs exclus",
    holdings: "composition",
    esg_score: "score ESG sourcé",
    esg_pillars: "piliers E/S/G",
    sfdr_article: "article SFDR",
    carbon_intensity: "intensité carbone",
    waci: "WACI",
    expected_return: "rendement attendu",
    volatility: "volatilité",
    price_history: "historique de cours",
  },
};

const assetLayersEn = {
  title: "What we know about this fund",
  hint: "The state of our data, not a judgement on the fund. A poorly documented fund is not a bad fund — it is a fund we know less about.",
  gaps: "Missing: {{fields}}",
  sources_one: "1 attributed figure · source: {{sources}}",
  sources_other: "{{count}} attributed figures · sources: {{sources}}",
  no_source:
    "None of this fund's figures is attributable to a source yet — so we do not present them as measured.",
  layer: { identity: "Identity", structure: "Structure", values: "Values", market: "Market" },
  status: { complete: "complete", partial: "partial", missing: "absent", unknown: "not fetched" },
  field: {
    isin: "ISIN",
    name: "name",
    issuer: "issuer",
    domicile: "domicile",
    currency: "currency",
    ter: "fees",
    asset_class: "asset class",
    region: "region",
    cause_exposure: "exposures",
    excluded_sectors: "excluded sectors",
    holdings: "holdings",
    esg_score: "sourced ESG score",
    esg_pillars: "E/S/G pillars",
    sfdr_article: "SFDR article",
    carbon_intensity: "carbon intensity",
    waci: "WACI",
    expected_return: "expected return",
    volatility: "volatility",
    price_history: "price history",
  },
};

/**
 * Onboarding relu POUR UN DÉBUTANT.
 *
 * Trois défauts corrigés ici, tous relevés en lisant l'écran comme quelqu'un qui
 * n'a jamais investi :
 *
 *  1. Deux étapes sur quatre ne posaient pas de question. « Ces secteurs seront
 *     totalement exclus » et « Ton objectif principal » sont des étiquettes de
 *     formulaire ; on ne sait pas ce qu'on doit faire.
 *  2. La dernière étape parlait de « ton premier dépôt » et demandait « combien
 *     veux-tu investir » — alors que rien n'est réel et qu'aucun argent ne bouge.
 *     C'était à la fois faux et intimidant.
 *  3. Les montants étaient qualifiés d'« engagement sérieux » ou de « démarrage
 *     ambitieux » : une pression à la hausse déguisée en description, sur une
 *     simulation. Les libellés redeviennent neutres (§5, aucun dark pattern).
 */
const onboardingClarityFr = {
  steps: {
    values: {
      ethiMessage:
        "Salut, moi c'est Ethi ✨ On va composer un portefeuille ensemble. Première question, la plus simple : qu'est-ce qui compte pour toi ?",
      question: "Qu'est-ce que tu veux financer ?",
    },
    exclusions: {
      ethiMessage: "Bien noté 💚 Et à l'inverse ?",
      question: "Qu'est-ce que tu refuses de financer ?",
    },
    objective: {
      ethiMessage: "Compris. Maintenant, parlons de toi plutôt que des fonds.",
      question: "Pour quoi mets-tu cet argent de côté ?",
    },
    amount: {
      ethiMessage:
        "Dernière question. Aucun argent ne bouge ici : c'est une simulation, tu choisis un montant juste pour voir ce que ça donne.",
      question: "Avec quel montant veux-tu essayer ?",
      "10_desc": "Pour voir",
      "50_desc": "Un petit montant",
      "100_desc": "Un montant rond",
      "500_desc": "Un montant plus large",
      sim_hint:
        "Tu pourras le changer à tout moment. Rien n'est prélevé, rien n'est engagé — ce montant sert seulement à rendre les chiffres concrets.",
    },
  },
  explainer: {
    values:
      "Tes convictions servent à CLASSER les fonds : ceux qui y correspondent remontent en tête. Elles ne promettent aucun rendement, et elles n'écartent personne — seules tes exclusions le font.",
    exclusions:
      "Exclure un secteur, c'est refuser de le financer. C'est un filtre net : un fonds concerné disparaît de la liste, il n'est pas juste mal noté.",
    objective:
      "Ton objectif ne change pas les fonds proposés. Il sert ensuite à dire si ta composition tient la route sur la durée que tu vises.",
  },
  pool: {
    title: "Les fonds qui collent à tes critères",
    compose_cta: "Composer mon portefeuille",
    blank_cta: "Choisir moi-même depuis zéro",
  },
};

const onboardingClarityEn = {
  steps: {
    values: {
      ethiMessage:
        "Hi, I'm Ethi ✨ We're going to build a portfolio together. First question, the simplest one: what matters to you?",
      question: "What do you want to fund?",
    },
    exclusions: {
      ethiMessage: "Noted 💚 And the other way round?",
      question: "What do you refuse to fund?",
    },
    objective: {
      ethiMessage: "Got it. Now let's talk about you rather than the funds.",
      question: "What are you setting this money aside for?",
    },
    amount: {
      ethiMessage:
        "Last question. No money moves here: this is a simulation, you pick an amount just to see what it looks like.",
      question: "What amount do you want to try with?",
      "10_desc": "Just to see",
      "50_desc": "A small amount",
      "100_desc": "A round amount",
      "500_desc": "A larger amount",
      sim_hint:
        "You can change it any time. Nothing is charged, nothing is committed — this amount only makes the figures concrete.",
    },
  },
  explainer: {
    values:
      "Your convictions RANK the funds: the matching ones rise to the top. They promise no return, and they exclude no one — only your exclusions do that.",
    exclusions:
      "Excluding a sector means refusing to fund it. It is a clean filter: an affected fund disappears from the list, it is not merely marked down.",
    objective:
      "Your goal does not change which funds appear. It is used afterwards to say whether your composition holds up over the horizon you have in mind.",
  },
  pool: {
    title: "The funds that match your criteria",
    compose_cta: "Compose my portfolio",
    blank_cta: "Pick everything myself",
  },
};

const composeSwitchFr = {
  reglages: {
    pool_eyebrow: "Ton pool, reclassé",
    pool_summary: "{{count}} fonds retenus · {{excluded}} écartés",
    pool_untouched:
      "Ta composition reste telle que tu l'as faite : ces réglages ne touchent jamais tes lignes. Seules tes convictions et tes exclusions changent ce classement — le budget de risque et l'horizon décrivent ton objectif, ils n'entrent pas dans la formule.",
    pool_relevance: "{{score}}/100",
    pool_pending: "en cours",
    pool_recompose: "Recomposer mon portefeuille",
    pool_compose_first: "Composer mon portefeuille",
    no_portfolio_notice:
      "Tu n'as pas encore composé de portefeuille : il n'y a rien à mettre à jour ici. Ces réglages classent déjà le pool ci-dessous — ils s'appliqueront à ton portefeuille dès que tu l'auras composé.",
    auto_save_note:
      "Tes préférences sont enregistrées automatiquement. Elles servent à classer le pool et à mesurer ton portefeuille — elles ne repondèrent jamais tes lignes à ta place.",
    save_error: "Enregistrement impossible",
    pipeline_desc:
      "Étapes traçables : profilage, univers investissable, exclusions sectorielles, filtres ESG best-in-class, puis classement du pool par pertinence. Seedow s'arrête là — aucune allocation n'est imposée : tu composes tes lignes, et le moteur mesure ce que tu as composé. Le simulateur interactif et la documentation détaillée sont sur la page dédiée.",
    methodology: {
      pipeline: {
        desc: "Étapes traçables : profilage, univers investissable, exclusions sectorielles, filtres best-in-class ESG, puis classement du pool par pertinence. Seedow s'arrête là — aucune allocation n'est imposée : vous composez vos lignes, et le moteur mesure ce que vous avez composé. Le simulateur interactif et la documentation détaillée sont sur la page dédiée.",
      },
    },
  },
  methodologie: {
    ...methodologiePoolFr,
    meta_desc:
      "Méthode Seedow : univers noté, exclusions dures, classement du pool par pertinence, puis mesure du portefeuille que vous composez.",
    intro:
      "Cinq étapes, transparentes et reproductibles. Ajustez vos convictions et vos exclusions en bas de page pour voir le pool se reclasser en direct.",
  },
  empty_portfolio: {
    beginner_desc:
      "Quatre questions, deux minutes, zéro argent réel. Tu vois les fonds qui collent à tes critères, et tu composes ton portefeuille toi-même.",
    desc: "Quatre questions pour poser tes convictions. Seedow classe ensuite les fonds qui y répondent — c'est toi qui composes.",
  },
  onboarding: {
    explainer: {
      amount:
        "Le montant simulé n'engage rien. Il sert à visualiser ce que représenteraient tes parts et l'effet des intérêts composés dans le temps.",
    },
  },
  landing: {
    hero2: {
      subtitle:
        "Choisissez ce que vous voulez financer — et ce que vous refusez. Seedow classe les fonds qui y répondent, chiffres ESG et performance à l'appui. Vous composez.",
    },
    how: {
      step2_title: "Vois les fonds qui te correspondent",
      step2_desc:
        "Pool classé, score d'impact, comparaison à un ETF Monde classique — tout est visible immédiatement.",
    },
    tour: { see: { title: "Tu vois les fonds retenus et leur empreinte réelle." } },
    rv: {
      cards: {
        simulate: {
          desc: "Tu choisis ce que tu veux financer et ce que tu refuses. Seedow classe les fonds correspondants et les explique ligne par ligne.",
        },
      },
    },
  },
  real_invest_interest: { title: "Tu veux investir ce portefeuille pour de vrai ?" },
  analysis: analysisFr,
  onboarding: onboardingClarityFr,
  asset_layers: assetLayersFr,
  blank_builder: {
    total_label: "Montant à répartir",
    remaining: "Il te reste {{amount}} à placer.",
    all_placed: "Tout est placé.",
    over_by: "Tu as placé {{amount}} de plus que ton montant.",
    over_hint: "Retire ce surplus, ou augmente ton montant à répartir.",
    over_allocated: "Retire {{amount}} : tu ne peux pas placer plus que ton montant.",
    amount_of: "Montant placé sur {{name}}",
    share_of_total: "soit {{pct}} de ton montant",
    the_rest: "le reste ({{amount}})",
    copilot_moved: "{{name}} : {{from}} → {{to}}",
    analysis_title: "Ce que dit cette composition",
    analysis_loading: "Analyse en cours…",
    copilot_title: "Ce que ce choix change",
    copilot_moved: "{{name}} : {{from}} → {{to}}",
    glance_allocated: "attribués",
    glance_unallocated: "{{pct}} non attribués",
    glance_over:
      "Tu as attribué {{pct}} % de plus que ton montant. Retire ce surplus avant d'enregistrer.",
    over_allocated: "Retire {{pct}} % : tu ne peux pas placer plus que ton montant.",
  },
  le_fil: {
    impact_carbon_lead: "Ce que ton portefeuille émet, comparé à un ETF Monde classique",
    impact_carbon_desc:
      "d'intensité carbone en moins. C'est une mesure, pas une note : elle vient des émissions déclarées par les entreprises que tu détiens.",
    impact_carbon_pending:
      "L'empreinte carbone de tes lignes n'est pas encore mesurable : trop peu d'émetteurs publient la leur. On ne met pas un score à la place — il arrivera quand la donnée sera là.",
    esg_average_desc:
      "Note ESG moyenne de tes lignes, pondérée par leur poids. C'est une note de fournisseur, pas un effet sur le monde.",
    understand: "Comprendre",
    understand_hint: "Ce que ta composition implique — Seedow explique, il ne corrige pas.",
    understand_loading: "Analyse en cours…",
    money_unallocated:
      "Dont {{amount}} non attribués — cette part n'est placée sur aucune ligne, elle ne bouge pas avec les cours.",
    money_declared:
      "Montant que tu as déclaré : aucune ligne cotée ne le soutient pour l'instant. Compose ton portefeuille pour qu'il soit valorisé aux cours du jour.",
  },
};

const composeSwitchEn = {
  reglages: {
    pool_eyebrow: "Your pool, re-ranked",
    pool_summary: "{{count}} funds kept · {{excluded}} filtered out",
    pool_untouched:
      "Your composition stays exactly as you built it: these settings never touch your lines. Only your convictions and exclusions change this ranking — risk budget and horizon describe your goal, they do not enter the formula.",
    pool_relevance: "{{score}}/100",
    pool_pending: "pending",
    pool_recompose: "Recompose my portfolio",
    pool_compose_first: "Compose my portfolio",
    no_portfolio_notice:
      "You haven't composed a portfolio yet, so there is nothing to update here. These settings already rank the pool below — they will apply to your portfolio as soon as you compose it.",
    auto_save_note:
      "Your preferences are saved automatically. They rank the pool and measure your portfolio — they never re-weight your lines for you.",
    save_error: "Could not save",
    pipeline_desc:
      "Traceable stages: profiling, investable universe, sector exclusions, best-in-class ESG filters, then pool ranking by relevance. Seedow stops there — no allocation is imposed: you compose your lines, and the engine measures what you composed. The interactive simulator and detailed documentation are on the dedicated page.",
    methodology: {
      pipeline: {
        desc: "Traceable stages: profiling, investable universe, sector exclusions, best-in-class ESG filters, then pool ranking by relevance. Seedow stops there — no allocation is imposed: you compose your lines, and the engine measures what you composed. The interactive simulator and detailed documentation are on the dedicated page.",
      },
    },
  },
  methodologie: {
    ...methodologiePoolEn,
    meta_desc:
      "Seedow's method: a rated universe, hard exclusions, pool ranking by relevance, then measurement of the portfolio you compose.",
    intro:
      "Five transparent, reproducible stages. Adjust your convictions and exclusions below to watch the pool re-rank live.",
  },
  empty_portfolio: {
    beginner_desc:
      "Four questions, two minutes, no real money. You see the funds that match your criteria, and you compose your portfolio yourself.",
    desc: "Four questions to set your convictions. Seedow then ranks the funds that match — you do the composing.",
  },
  onboarding: {
    explainer: {
      amount:
        "The simulated amount commits you to nothing. It shows what your holdings would represent and how compounding plays out over time.",
    },
  },
  landing: {
    hero2: {
      subtitle:
        "Choose what you want to fund — and what you refuse. Seedow ranks the funds that match, with ESG and performance figures to back it. You compose.",
    },
    how: {
      step2_title: "See the funds that match you",
      step2_desc:
        "Ranked pool, impact score, comparison with a standard World ETF — all visible immediately.",
    },
    tour: { see: { title: "You see the funds kept and their real footprint." } },
    rv: {
      cards: {
        simulate: {
          desc: "You choose what to fund and what to refuse. Seedow ranks the matching funds and explains them line by line.",
        },
      },
    },
  },
  real_invest_interest: { title: "Want to invest this portfolio for real?" },
  analysis: analysisEn,
  onboarding: onboardingClarityEn,
  asset_layers: assetLayersEn,
  blank_builder: {
    total_label: "Amount to allocate",
    remaining: "You have {{amount}} left to place.",
    all_placed: "Everything is placed.",
    over_by: "You placed {{amount}} more than your amount.",
    over_hint: "Remove the surplus, or raise the amount you are allocating.",
    over_allocated: "Remove {{amount}}: you cannot place more than your amount.",
    amount_of: "Amount placed on {{name}}",
    share_of_total: "i.e. {{pct}} of your amount",
    the_rest: "the rest ({{amount}})",
    copilot_moved: "{{name}}: {{from}} → {{to}}",
    analysis_title: "What this composition says",
    analysis_loading: "Analysing…",
    copilot_title: "What this choice changes",
    copilot_moved: "{{name}}: {{from}} → {{to}}",
    glance_allocated: "allocated",
    glance_unallocated: "{{pct}} unallocated",
    glance_over: "You allocated {{pct}}% more than your amount. Remove the surplus before saving.",
    over_allocated: "Remove {{pct}}%: you cannot allocate more than your amount.",
  },
  le_fil: {
    impact_carbon_lead: "What your portfolio emits, compared with a standard World ETF",
    impact_carbon_desc:
      "less carbon intensity. This is a measurement, not a rating: it comes from the emissions disclosed by the companies you hold.",
    impact_carbon_pending:
      "Your holdings' carbon footprint is not measurable yet: too few issuers disclose theirs. We do not put a score in its place — it will come when the data does.",
    esg_average_desc:
      "Weighted average ESG rating of your holdings. That is a provider's rating, not an effect on the world.",
    understand: "Understand",
    understand_hint: "What your composition implies — Seedow explains, it does not correct.",
    understand_loading: "Analysing…",
    money_unallocated:
      "Including {{amount}} unallocated — this share sits on no holding, it does not move with prices.",
    money_declared:
      "The amount you declared: no priced holding backs it yet. Compose your portfolio so it gets valued at today's prices.",
  },
};

const mergedFr = deepMerge(fr, {
  reglages: reglagesFr,
  le_fil: leFilFr,
  allocation_refiner: refinerPlainFr,
  landing: deepMerge({ rayon_x: rayonXFr, ...landingPathsFr }, landingReadabilityFr),
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
  portfolio_glance: portfolioGlanceFr,
  portfolio_customizer: deepMerge(portfolioCustomizerFr, customizerV2Fr),
  // N1 — traçabilité ESG : part des scores réellement mesurés (vs estimés maison).
  portfolio_metrics: { esg_measured: "{{pct}} % mesuré", esg_estimated: "estimé" },
  a11y: a11yFr,
  invest_dialog: investDialogFr,
  profile: profileLabFr,
  nav: navCommunityFr,
});
const mergedEn = deepMerge(en, {
  le_fil: leFilEn,
  landing: deepMerge({ rayon_x: rayonXEn, ...landingPathsEn }, landingReadabilityEn),
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
  portfolio_glance: portfolioGlanceEn,
  portfolio_customizer: deepMerge(portfolioCustomizerEn, customizerV2En),
  allocation_refiner: refinerPlainEn,
  // N1 — ESG traceability: share of scores that are actually measured (vs estimated).
  portfolio_metrics: { esg_measured: "{{pct}}% measured", esg_estimated: "estimated" },
  a11y: a11yEn,
  invest_dialog: investDialogEn,
  profile: profileLabEn,
  nav: navCommunityEn,
});

// ═══════════════════════════════════════════════════════════════════════
// UX pédagogique — « pourquoi ce fonds ? » et fin du mot « impact » posé sur
// une note ESG.
//
// Deux corrections tiennent tout ce bloc :
//
//  1. Le pool cesse d'afficher une pertinence nue. Un « 87/100 » trié par
//     ordre décroissant se lit comme un palmarès, donc comme une
//     recommandation. On rend à la place les raisons que le moteur avait déjà
//     séparées (`lib/portfolio/poolReasons`).
//  2. Une moyenne de notes ESG n'est pas un impact. Elle décrit des pratiques
//     notées par un fournisseur, pas un effet mesuré sur le monde. Le mot
//     « durabilité » dit ce que la donnée porte ; « impact » affirmait plus.
// ═══════════════════════════════════════════════════════════════════════

const poolReasonsFr = {
  group: {
    carries_convictions: "Porte tes convictions",
    partial_match: "En partie aligné",
    other_strengths: "D'autres qualités",
    to_examine: "À examiner",
  },
  reason: {
    carries_causes: "Porte {{count}} de tes {{total}} convictions",
    sustainability: "Note de durabilité {{score}}/100, attribuée par un fournisseur",
    low_fees: "Frais bas — {{euros}} € par an pour 1 000 € placés",
  },
  caveat: {
    no_cause_match: "Ne porte aucune des convictions que tu as déclarées",
    esg_estimated: "Note de durabilité estimée par Seedow, pas par un fournisseur",
    high_fees: "Frais élevés — {{euros}} € par an pour 1 000 € placés",
    no_history: "Historique de cours insuffisant pour mesurer son risque",
  },
};

const poolReasonsEn = {
  group: {
    carries_convictions: "Matches your convictions",
    partial_match: "Partly aligned",
    other_strengths: "Other strengths",
    to_examine: "Worth a look",
  },
  reason: {
    carries_causes: "Carries {{count}} of your {{total}} convictions",
    sustainability: "Sustainability rating {{score}}/100, from a data provider",
    low_fees: "Low fees — €{{euros}} a year per €1,000 invested",
  },
  caveat: {
    no_cause_match: "Carries none of the convictions you declared",
    esg_estimated: "Sustainability rating estimated by Seedow, not by a provider",
    high_fees: "High fees — €{{euros}} a year per €1,000 invested",
    no_history: "Not enough price history to measure its risk",
  },
};

const pedagogyFr = {
  why_this: { trigger: "Pourquoi ?" },
  le_fil: {
    changed: "Ce qui a changé",
    changed_when: "Depuis ta composition précédente, enregistrée le {{date}}.",
    changed_effect: "Ce que ça déplace",
    changed_local:
      "Comparaison faite sur cet appareil, à partir de tes deux dernières compositions. Sur un autre navigateur, il n'y a pas d'historique à comparer.",
    change: {
      added: "Tu as ajouté {{name}} — {{to}}.",
      removed: "Tu as retiré {{name}}, qui portait {{from}}.",
      increased: "Tu as renforcé {{name}} : {{from}} → {{to}}.",
      decreased: "Tu as allégé {{name}} : {{from}} → {{to}}.",
    },
  },
  analysis: {
    why_aria: "Pourquoi ce niveau — {{row}}",
    why: {
      risk: {
        low: "Tes lignes ont peu varié historiquement. En pratique : moins de secousses, mais aussi moins de progression attendue sur longue durée.",
        moderate:
          "Tes lignes varient comme un portefeuille d'actions ordinaire : des baisses de plusieurs pourcents sur quelques mois sont normales, et ne veulent pas dire que quelque chose s'est cassé.",
        high: "Tes lignes bougent beaucoup. Sur une mauvaise année, la valeur peut baisser fortement — c'est le prix d'une progression potentiellement plus forte sur longue durée.",
        unknown:
          "Tes lignes n'ont pas assez d'historique de cours pour qu'on mesure leurs variations. On préfère te le dire plutôt que d'afficher un niveau qu'on n'a pas calculé.",
      },
      concentration: {
        low: "Ton argent est réparti entre plusieurs lignes de poids comparable : aucune ne décide à elle seule de ce qui t'arrive.",
        moderate:
          "Une de tes lignes pèse nettement plus que les autres. Ce qui lui arrive se voit sur l'ensemble.",
        high: "Une seule ligne porte l'essentiel de ton argent. Sa trajectoire devient à peu près la tienne — c'est un choix possible, mais il faut le faire en connaissance de cause.",
        unknown: "Rien n'est encore placé : il n'y a pas de répartition à décrire.",
      },
      data: {
        high: "L'essentiel de ce que tu vois ici vient de données sourcées et datées, pas d'estimations.",
        medium:
          "Une partie de tes lignes est décrite par des données sourcées, l'autre par des estimations Seedow. Les chiffres restent des ordres de grandeur.",
        low: "Peu de tes lignes portent des données sourcées. Ce qui est affiché reste indicatif — on te le signale plutôt que de le présenter comme mesuré.",
        unknown: "Aucune donnée de qualité mesurable sur cette composition pour l'instant.",
      },
    },
  },

  pool_reasons: poolReasonsFr,
  discover: {
    // « Impact » nommait une note ESG. Elle décrit des pratiques notées, pas un
    // effet sur le monde : le badge dit désormais ce qu'il mesure.
    row: { impact: "Durabilité" },
  },
  asset_picker: {
    impact_short: "Durabilité {{score}}/100",
    desc: "Cherche un fonds. Pour chacun, Seedow dit pourquoi il apparaît et ce qu'il ignore encore.",
  },
  asset_detail: {
    why_for_you: "Pourquoi ce fonds t'est montré",
    impact_overview: "Durabilité de ce fonds",
    sustainability_note:
      "Une note attribuée par des fournisseurs de données sur les pratiques du fonds. Ce n'est pas une mesure de son effet réel sur le monde.",
    why_score_label: "Pourquoi cette note ?",
    why_score_q:
      "Pourquoi Seedow attribue-t-il cette note de durabilité à {{name}} ? Explique-moi simplement ce qui la compose.",
  },
  blank_builder: {
    glance_impact: "Note de durabilité {{score}}/100",
  },
  portfolio_customizer: {
    consequence: {
      impact_up: "Ta note de durabilité moyenne monte d'environ {{pts}} points sur 100.",
      impact_down: "Ta note de durabilité moyenne baisse d'environ {{pts}} points sur 100.",
    },
  },
  onboarding: {
    pool: {
      why_these: "Pourquoi ces fonds ?",
      explainer:
        "{{count}} fonds passent tes filtres ({{excluded}} écartés sur {{universe}}). Pour chacun, on te dit ce qu'il a à voir avec ce que tu as déclaré — et ce qu'on ignore encore de lui.",
      method_note:
        "Ces fonds ne sont pas classés du meilleur au pire : Seedow ne désigne pas de gagnant. L'ordre suit la pertinence (performance ajustée au risque, durabilité, alignement à tes causes) ; ce que tu lis à droite, ce sont les raisons derrière cet ordre.",
    },
  },
};

const pedagogyEn = {
  why_this: { trigger: "Why?" },
  le_fil: {
    changed: "What changed",
    changed_when: "Since your previous composition, saved on {{date}}.",
    changed_effect: "What it shifts",
    changed_local:
      "Comparison made on this device, from your last two compositions. On another browser there's no history to compare.",
    change: {
      added: "You added {{name}} — {{to}}.",
      removed: "You removed {{name}}, which held {{from}}.",
      increased: "You increased {{name}}: {{from}} → {{to}}.",
      decreased: "You reduced {{name}}: {{from}} → {{to}}.",
    },
  },
  analysis: {
    why_aria: "Why this level — {{row}}",
    why: {
      risk: {
        low: "Your lines have moved little historically. In practice: fewer swings, but also less expected growth over the long run.",
        moderate:
          "Your lines move like an ordinary stock portfolio: drops of several percent over a few months are normal, and don't mean something broke.",
        high: "Your lines move a lot. In a bad year the value can fall sharply — that's the price of potentially stronger growth over the long run.",
        unknown:
          "Your lines don't have enough price history for us to measure how they move. We'd rather say so than show a level we haven't calculated.",
      },
      concentration: {
        low: "Your money is spread across several lines of comparable weight: none of them alone decides what happens to you.",
        moderate:
          "One of your lines weighs noticeably more than the others. What happens to it shows on the whole.",
        high: "A single line carries most of your money. Its path becomes roughly yours — a valid choice, but one to make knowingly.",
        unknown: "Nothing is allocated yet: there's no split to describe.",
      },
      data: {
        high: "Most of what you see here comes from sourced, dated data — not estimates.",
        medium:
          "Some of your lines are described by sourced data, the rest by Seedow estimates. The figures remain orders of magnitude.",
        low: "Few of your lines carry sourced data. What's shown is indicative — we flag it rather than present it as measured.",
        unknown: "No measurable data quality on this composition yet.",
      },
    },
  },

  pool_reasons: poolReasonsEn,
  discover: {
    row: { impact: "Sustainability" },
  },
  asset_picker: {
    impact_short: "Sustainability {{score}}/100",
    desc: "Search for a fund. For each one, Seedow says why it shows up — and what it still doesn't know.",
  },
  asset_detail: {
    why_for_you: "Why you're seeing this fund",
    impact_overview: "How sustainable this fund is",
    sustainability_note:
      "A rating given by data providers on the fund's practices. It is not a measure of its real effect on the world.",
    why_score_label: "Why this rating?",
    why_score_q:
      "Why does Seedow give {{name}} this sustainability rating? Explain simply what goes into it.",
  },
  blank_builder: {
    glance_impact: "Sustainability rating {{score}}/100",
  },
  portfolio_customizer: {
    consequence: {
      impact_up: "Your average sustainability rating rises by about {{pts}} points out of 100.",
      impact_down: "Your average sustainability rating falls by about {{pts}} points out of 100.",
    },
  },
  onboarding: {
    pool: {
      why_these: "Why these funds?",
      explainer:
        "{{count}} funds pass your filters ({{excluded}} ruled out of {{universe}}). For each one, we say what it has to do with what you declared — and what we still don't know about it.",
      method_note:
        "These funds are not ranked best to worst: Seedow does not pick a winner. The order follows relevance (risk-adjusted performance, sustainability, alignment with your causes); what you read on the right are the reasons behind that order.",
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Une seule voix, et deux affirmations qui ne tenaient plus.
//
// L'app se tutoie — c'est la convention écrite dans `ui/Glossary.tsx`
// (« tutoiement systématique »). 102 chaînes vouvoyaient encore, héritées
// d'écrans plus anciens. Passer de « votre portefeuille » à « ton
// portefeuille » au milieu d'un même parcours donne l'impression de changer
// d'interlocuteur ; ce n'est pas cosmétique, c'est de la confiance.
//
// Le balayage a fait remonter deux erreurs de fond, corrigées ici :
//
//  · /reglages décrivait encore « Optimisation Markowitz contrainte » comme
//    l'étape en vigueur. Le moteur ne construit plus d'allocation depuis
//    #183 : la page annonçait au lecteur une méthode qui n'était plus la
//    sienne (CLAUDE.md §1.2).
//  · `portfolio_glance` appelait encore « Impact » la moyenne de notes ESG,
//    résidu de la correction précédente.
// ═══════════════════════════════════════════════════════════════════════

const oneVoiceFr = {
  impact_xp: { tangible: { footprint_label_estimated: "Ton empreinte estimée" } },
  landing: {
    hero: {
      title_line1: "Ton argent",
      subtitle:
        "Seedow te montre lequel. Investissement ESG, visualisé clairement, expliqué par une IA qui ne te vend rien.",
    },
    hero2: {
      title_line1: "Tes convictions,",
      subtitle:
        "Choisis ce que tu veux financer — et ce que tu refuses. Seedow classe les fonds qui y répondent, chiffres ESG et performance à l'appui. Tu composes.",
    },
    footer: { copyright: "© 2026 · Ton argent façonne déjà le monde." },
  },
  auth: { desc_login: "Accède à ton espace." },
  portfolio: { badges_disclosure: "Tes jalons" },
  data_provenance: {
    coverage_tooltip:
      "La part de ton portefeuille pour laquelle nous disposons d'une donnée réelle mesurée. Le reste n'est pas encore mesuré — il n'est pas estimé pour autant.",
  },
  vote: {
    section_kicker:
      "Quand tu possèdes une entreprise, tu as un droit de vote à son assemblée générale. Seul, tu pèses peu. Ensemble, vous formez un bloc. Voici les votes ouverts.",
    bloc: { you_line: "Vous êtes {{n}} à voter « {{choice}} »." },
  },
  reglages: {
    loading_prefs: "Chargement de tes préférences…",
    display_name_placeholder: "Ton nom",
    meta_desc: "Gère ton profil, tes préférences d'investissement et tes notifications.",
    privacy_desc:
      "Tes données restent strictement confidentielles. Tu peux exporter ou supprimer l'ensemble de tes informations à tout moment.",
    methodology: {
      // La page annonçait une optimisation que le moteur ne fait plus.
      optimization: {
        title: "Classement du pool, puis mesure",
        desc: "Seedow ne construit aucune allocation. Il classe les fonds retenus par pertinence — performance réelle ajustée au risque, note de durabilité composite, alignement avec tes causes — et s'arrête là. C'est toi qui répartis tes montants ; le moteur mesure ensuite ce que tu as composé (risque, frais, durabilité pondérée selon tes causes, empreinte carbone).",
      },
      esg_composite: {
        title: "Score ESG composite, pondéré par tes causes",
        desc_2:
          "Au lieu d'une moyenne fixe 40/40/20, les piliers E, S et G sont repondérés en fonction des causes que tu actives dans tes préférences. Le score reflète ainsi ce qui compte vraiment pour toi.",
        mapping_note:
          "Sans cause active, on revient à la pondération neutre 40/40/20. Plus tu actives de causes liées à un pilier, plus son poids dans le score composite augmente.",
      },
      carbon: {
        coverage_low:
          "< 30 % — fie-toi à l'heuristique CO₂ évité, l'intensité réelle n'est pas représentative.",
      },
      pipeline: {
        desc: "Étapes traçables : profilage, univers investissable, exclusions sectorielles, filtres best-in-class ESG, puis classement du pool par pertinence. Seedow s'arrête là — aucune allocation n'est imposée : tu composes tes lignes, et le moteur mesure ce que tu as composé. Le simulateur interactif et la documentation détaillée sont sur la page dédiée.",
      },
    },
  },
  methodologie: {
    meta_desc:
      "Méthode Seedow : univers noté, exclusions dures, classement du pool par pertinence, puis mesure du portefeuille que tu composes.",
    intro:
      "Cinq étapes, transparentes et reproductibles. Ajuste tes convictions et tes exclusions en bas de page pour voir le pool se reclasser en direct.",
    simulator_desc:
      "Bouge tes convictions et tes exclusions : le pool se refiltre et se reclasse sous tes yeux. Seedow s'arrête ici — il ne propose aucun poids, c'est toi qui composes.",
    stages: {
      "1_desc": "Tes causes et tes exclusions — les deux seules entrées du classement.",
      "3_desc":
        "Filtre binaire et dur : un fonds touché par une de tes exclusions sort du pool, sans compromis ni pondération.",
      "4_desc":
        "Pertinence 0–100 : performance réelle (Sharpe, uniquement si l'historique le permet), score ESG composite, alignement avec tes causes. Sans historique, le fonds reste « en cours » plutôt que noté au jugé.",
      "5_desc":
        "Tu composes tes lignes. Le moteur mesure ensuite ce que TU as composé — risque, frais, ESG pondéré E/S/G selon tes causes, empreinte carbone.",
    },
    reading_p1:
      "Tu choisis ce qui compte pour toi (causes) et ce que tu refuses (exclusions). Tes exclusions retirent des fonds du pool ; tes causes pèsent sur son classement.",
    reading_p2:
      "À droite : combien de fonds l'univers contient, combien tes exclusions en écartent, et ceux qui restent — classés par pertinence, avec leur note ESG et leurs frais. Survole les « ? » pour une explication simple de chaque terme.",
    glossary: {
      pool: "Pool : la liste des fonds qui passent tes filtres, classés par pertinence. Seedow s'arrête là — tu composes.",
      relevance:
        "Pertinence : note 0–100 combinant performance réelle, score ESG et alignement avec tes causes. Un pilier absent est retiré du calcul, jamais remplacé par une valeur inventée.",
    },
    tips: {
      stage_1: "Tes préférences personnelles. C'est la matière première de tout le reste.",
      stage_3:
        "On retire d'abord ce que tu refuses (ex. armement), puis on ne garde que les meilleurs élèves de chaque catégorie sur les critères ESG.",
      stage_4:
        "On augmente légèrement la part attendue des actifs qui collent à tes causes prioritaires. Petit coup de pouce, pas un coup de barre.",
      stage_5: "Seedow mesure le portefeuille que tu as composé : il ne le compose pas à ta place.",
      causes:
        "Les sujets que ton argent doit pousser en priorité (climat, biodiversité…). Plus l'intensité est haute, plus le portefeuille s'oriente vers ces sujets.",
      exclusions:
        "Les secteurs que tu refuses de financer. Cochés = strictement écartés du portefeuille.",
      horizon:
        "Pendant combien de temps tu comptes laisser cet argent investi. Plus c'est long, plus on peut accepter de variations.",
      allocation:
        "La liste précise des produits retenus et le poids de chacun dans ton portefeuille.",
      pool: "Les fonds qui passent tes filtres, du plus pertinent au moins pertinent. Aucun poids : la répartition, c'est toi qui la fais.",
    },
    no_weights_body:
      "Il ne te propose pas de répartition. Rendement attendu, volatilité, frais et empreinte carbone sont des mesures de PORTEFEUILLE : elles se calculent sur les lignes que tu as composées, pas sur un pool. Tu les retrouves sur ton portefeuille, une fois composé.",
  },
  portfolio_glance: {
    title: "Ton portefeuille",
    money_title: "Où va ton argent ?",
    help: {
      // Résidu de la correction précédente : ce chiffre est une moyenne de
      // notes ESG, il ne mesure aucun effet sur le monde.
      impact:
        "Note de durabilité : la moyenne, pondérée par tes montants, des notes ESG de tes lignes — sur 100. Elle décrit des pratiques notées par un fournisseur, pas l'effet réel de ton argent.",
      fees: "Frais : ce que tes investissements coûtent chaque année.",
      diversification:
        "Diversification : répartir ton argent pour ne pas dépendre d'un seul investissement.",
    },
    why: {
      horizon_long: "Tu prévois d'investir sur le long terme (environ {{years}} ans).",
      horizon_medium: "Tu prévois d'investir sur plusieurs années (environ {{years}} ans).",
      horizon_short: "Tu prévois d'investir sur une courte durée (environ {{years}} ans).",
      risk_prudent:
        "Tu préfères limiter les fluctuations, quitte à viser une croissance plus douce.",
      risk_modere: "Tu acceptes des fluctuations modérées pour viser une croissance régulière.",
      risk_dynamique:
        "Tu acceptes des fluctuations plus fortes pour viser une croissance plus élevée.",
      causes:
        "La sélection privilégie des investissements cohérents avec les valeurs que tu as choisies.",
      exclusions: "Les secteurs que tu refuses de financer ont été entièrement exclus.",
    },
    role: {
      equity_em: "Ouvre ton portefeuille à des économies en croissance.",
      thematic: "Cible directement les causes qui te tiennent à cœur.",
      reit: "Diversifie ton portefeuille via l'immobilier.",
      cash: "Met une part de ton argent de côté, en sécurité.",
      generic: "Contribue à équilibrer ton portefeuille.",
    },
    simulation_note:
      "Simulation à but pédagogique — Seedow t'informe, tu gardes le contrôle. Aucune transaction réelle.",
  },
  portfolio_customizer: {
    title: "Ajuste ton portefeuille",
    desc: "Règle chaque ligne librement. Seedow te montre ta note de durabilité et le potentiel que tu vises — tu gardes la main, il ne réoptimise rien à ta place.",
    desc_v2:
      "Renforce ou réduis chaque ligne par petits pas. Seedow rééquilibre le reste et te dit, en français, ce que ça change.",
    saved_desc: "Tes ajustements ont été enregistrés.",
    simulation_note:
      "Simulation à but pédagogique — Seedow t'explique, tu décides. Aucune transaction réelle.",
    benefit_concentrated:
      "En misant plus sur quelques lignes, tu vises un potentiel de gain plus élevé — le risque monte aussi.",
    benefit_balanced:
      "En répartissant sur plusieurs lignes, tu vises un parcours plus régulier — un potentiel plus posé, un risque plus doux.",
    consequence: {
      more_concentrated:
        "Ton portefeuille est plus concentré — une plus grande partie de ton argent dépend de moins d'investissements.",
      less_concentrated:
        "Ton portefeuille est mieux réparti — ton argent dépend de davantage d'investissements.",
      diversification_up: "Ta diversification s'améliore.",
      diversification_down: "Ta diversification diminue.",
      risk_up: "Ton portefeuille devient un peu plus sensible aux variations de marché.",
      risk_down: "Ton portefeuille devient un peu moins sensible aux variations de marché.",
    },
  },
  blank_builder: {
    details_title: "Ce que ça donne",
    edit: "Modifier",
    edit_total: "Modifier le montant à répartir",
    remove_named: "Retirer {{name}}",
    empty_title: "Construisons ton premier portefeuille",
    empty_desc: "Tu peux commencer simplement : ajoute un premier investissement, on t'accompagne.",
    discover: "Tu ne sais pas quoi choisir ? Découvrir",
    saved_desc: "Ton portefeuille est prêt. Tu gardes la main à tout moment.",
    glance_positions: "Tu as ajouté {{count}} investissement(s).",
    glance_div_limitee: "Ton argent dépend encore de peu de lignes.",
    glance_div_bonne: "Bonne répartition entre tes investissements.",
    glance_concentrated: "Attention : une ligne pèse une grande partie de ton argent.",
    simulation_note: "Simulation à but pédagogique — aucune transaction réelle. Tu décides.",
  },
};

// L'anglais ne distingue pas tutoiement et vouvoiement : seules les deux
// corrections de fond s'y appliquent.
const oneVoiceEn = {
  blank_builder: {
    details_title: "What it comes to",
    edit: "Edit",
    edit_total: "Edit the amount to allocate",
    remove_named: "Remove {{name}}",
  },
  reglages: {
    methodology: {
      optimization: {
        title: "Pool ranking, then measurement",
        desc: "Seedow builds no allocation. It ranks the funds that passed your filters by relevance — real risk-adjusted performance, composite sustainability rating, alignment with your causes — and stops there. You allocate the amounts; the engine then measures what you composed (risk, fees, sustainability weighted by your causes, carbon footprint).",
      },
    },
  },
  portfolio_glance: {
    help: {
      impact:
        "Sustainability rating: the average, weighted by your amounts, of your lines' ESG ratings — out of 100. It describes practices rated by a provider, not the real effect of your money.",
    },
  },
};

writeFileSync(
  "src/i18n/locales/fr.json",
  JSON.stringify(
    deepMerge(deepMerge(deepMerge(mergedFr, composeSwitchFr), pedagogyFr), oneVoiceFr),
    null,
    2,
  ) + "\n",
  "utf-8",
);
writeFileSync(
  "src/i18n/locales/en.json",
  JSON.stringify(
    deepMerge(deepMerge(deepMerge(mergedEn, composeSwitchEn), pedagogyEn), oneVoiceEn),
    null,
    2,
  ) + "\n",
  "utf-8",
);
