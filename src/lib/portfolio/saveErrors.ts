/**
 * Traduire un échec d'écriture en quelque chose sur quoi l'utilisateur peut agir.
 *
 * Toutes les sauvegardes de portefeuille se terminaient sur la même phrase :
 * « Impossible d'enregistrer ton portefeuille. Réessaie dans un instant. » La
 * cause réelle partait dans `console.error`, côté serveur, où personne ne la
 * lit. L'utilisateur réessayait — et échouait à l'identique, parce que
 * « réessaie » n'est le bon conseil que pour une panne passagère, et qu'aucune
 * des causes fréquentes n'en est une :
 *
 *   · la limite de 3 portefeuilles actifs est atteinte → il faut en archiver un ;
 *   · la session a expiré → il faut se reconnecter ;
 *   · une donnée est refusée par le schéma → il faut le signaler, pas insister.
 *
 * Ce module ne masque rien et n'invente rien. Il reconnaît les erreurs que
 * Seedow a lui-même écrites (les `RAISE EXCEPTION` de nos triggers sont rédigés
 * pour être lus par un humain, en français) et les laisse passer telles quelles.
 * Pour tout le reste, il donne une phrase honnête PLUS le code Postgres, pour
 * qu'un rapport d'utilisateur soit exploitable au lieu d'être un cul-de-sac.
 *
 * Ce qu'il ne fait jamais : recopier le détail technique d'une erreur inconnue
 * dans l'interface. Le code suffit à diagnostiquer ; le message brut peut
 * décrire le schéma.
 */

/** Forme d'une erreur PostgREST/Postgres remontée par supabase-js. */
export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * Violation de RLS, ou jeton expiré : dans les deux cas l'écriture est refusée
 * pour une raison d'identité, jamais pour une raison de contenu.
 */
const RLS_DENIED = new Set(["42501", "PGRST301"]);

/** `RAISE EXCEPTION` en PL/pgSQL — nos propres messages, écrits pour l'écran. */
const APP_RAISED = "P0001";

/** Le schéma a refusé la donnée : réessayer à l'identique ne changera rien. */
const SCHEMA_REJECTED = new Set([
  "22P02", // valeur invalide pour un enum
  "23502", // NOT NULL violé
  "23503", // clé étrangère
  "23514", // CHECK violé
  "23505", // unicité
]);

export interface SaveFailure {
  /** Message destiné à l'utilisateur. */
  message: string;
  /** `true` quand réessayer a une chance d'aboutir (panne réseau, timeout). */
  retryable: boolean;
}

/**
 * Traduit une erreur d'écriture. `action` décrit ce que l'utilisateur tentait,
 * au singulier et sans majuscule : « enregistrer ton portefeuille ».
 */
export function describeSaveError(err: PostgrestLikeError, action: string): SaveFailure {
  const code = err.code ?? "";

  // Nos propres garde-fous parlent déjà à l'utilisateur : on ne les reformule
  // pas, on les montre. C'est le cas de la limite de portefeuilles actifs.
  if (code === APP_RAISED && err.message && err.message.trim() !== "") {
    return { message: err.message.trim(), retryable: false };
  }

  if (RLS_DENIED.has(code)) {
    return {
      message: `Ta session a expiré : impossible d'${action}. Reconnecte-toi, ta composition reste à l'écran.`,
      retryable: false,
    };
  }

  if (SCHEMA_REJECTED.has(code)) {
    return {
      message: `Impossible d'${action} : une donnée a été refusée (code ${code}). Réessayer à l'identique ne changera rien — signale-le-nous avec ce code.`,
      retryable: false,
    };
  }

  // Cause inconnue : on le dit, et on donne le code s'il existe. Promettre que
  // « ça va marcher dans un instant » sans le savoir serait une invention.
  return {
    message: code
      ? `Impossible d'${action} (code ${code}). Si ça se reproduit, signale-le-nous avec ce code.`
      : `Impossible d'${action}. Vérifie ta connexion, puis réessaie.`,
    retryable: !code,
  };
}
