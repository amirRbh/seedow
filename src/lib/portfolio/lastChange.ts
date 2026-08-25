/**
 * « Ce qui a changé » — la mémoire du dernier geste de composition.
 *
 * Le Fil raconte un ÉTAT : voilà ton argent, voilà tes lignes. Il ne dit jamais
 * ce que l'utilisateur a fait pour en arriver là, ni ce que ce geste a changé.
 * La boucle « je choisis → je comprends » s'arrêtait donc à la sauvegarde.
 *
 * Ce module la prolonge, avec la contrainte qui compte : **ne rien inventer**.
 * Il n'enregistre que ce que l'utilisateur a réellement enregistré — les lignes
 * et les montants qu'il a lui-même saisis — et garde la composition précédente
 * pour pouvoir dire ce qui a bougé entre les deux.
 *
 * ── Pourquoi le navigateur, et pas la base ────────────────────────────────
 *
 * Écrire un historique en base demanderait une table et une migration pour un
 * confort d'affichage. Le stockage local suffit : la comparaison n'a de sens
 * que pour la personne qui vient de composer, sur l'appareil où elle l'a fait.
 *
 * La contrepartie est assumée et VISIBLE : sur un autre appareil, ou après un
 * nettoyage du navigateur, il n'y a pas d'historique — Le Fil n'affiche alors
 * simplement pas le nœud. Une absence de mémoire ne se comble jamais par une
 * comparaison reconstituée après coup.
 *
 * Aucune exception n'est levée (mode privé strict, quota) : l'absence dégrade
 * proprement, comme pour `poolHandoff`.
 */

const KEY = "seedow_last_change";
/** Au-delà, la comparaison n'apprend plus rien d'utile à l'utilisateur. */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 j

/** Une ligne telle que l'utilisateur l'a enregistrée. */
export interface ComposedLine {
  id: string;
  name: string;
  /** Montant placé, en euros — ce qu'il a saisi, jamais une part recalculée. */
  amount: number;
  /** Note de durabilité 0..100 de la ligne (pas un impact mesuré). */
  esgScore: number;
}

export interface Composition {
  /** Portefeuille concerné : une comparaison n'a de sens qu'à l'intérieur d'un même. */
  portfolioId: string;
  /** Horodatage ISO de l'enregistrement. */
  at: string;
  /** Montant total à répartir au moment de l'enregistrement. */
  total: number;
  lines: ComposedLine[];
}

interface Stored {
  current: Composition;
  /** Composition enregistrée juste avant, sur le même portefeuille. */
  previous?: Composition;
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.current?.portfolioId || !parsed.current.at) return null;
    if (Date.now() - new Date(parsed.current.at).getTime() > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Enregistre la composition que l'utilisateur vient de sauvegarder. L'ancienne
 * `current` devient `previous` — mais UNIQUEMENT si elle portait sur le même
 * portefeuille : comparer deux portefeuilles différents produirait un « tu as
 * retiré 4 lignes » qui n'a jamais eu lieu.
 */
export function recordComposition(next: Composition): void {
  try {
    const prev = read();
    const previous =
      prev && prev.current.portfolioId === next.portfolioId ? prev.current : undefined;
    localStorage.setItem(KEY, JSON.stringify({ current: next, previous } satisfies Stored));
  } catch {
    // Stockage indisponible : on perd la mémoire du geste, pas la composition.
  }
}

/** La dernière composition enregistrée pour ce portefeuille, ou `null`. */
export function readComposition(portfolioId: string): Stored | null {
  const stored = read();
  if (!stored || stored.current.portfolioId !== portfolioId) return null;
  return stored;
}

// ── Ce qui a bougé ────────────────────────────────────────────────────────

export type LineChangeKind = "added" | "removed" | "increased" | "decreased";

export interface LineChange {
  kind: LineChangeKind;
  name: string;
  /** Montant avant, en euros. 0 pour une ligne ajoutée. */
  from: number;
  /** Montant après, en euros. 0 pour une ligne retirée. */
  to: number;
}

/**
 * Compare deux compositions et renvoie les mouvements de lignes, du plus gros
 * au plus petit. Purement descriptif : aucun jugement, aucune recommandation.
 *
 * Les montants sont ceux que l'utilisateur a saisis. On ne remet rien à
 * l'échelle : si le montant total a changé, c'est un fait de la composition,
 * pas une raison de réécrire les lignes.
 */
export function diffCompositions(before: Composition, after: Composition): LineChange[] {
  const beforeById = new Map(before.lines.map((l) => [l.id, l]));
  const afterById = new Map(after.lines.map((l) => [l.id, l]));
  const changes: LineChange[] = [];

  for (const line of after.lines) {
    const was = beforeById.get(line.id);
    if (!was) {
      if (line.amount > 0)
        changes.push({ kind: "added", name: line.name, from: 0, to: line.amount });
    } else if (line.amount > was.amount) {
      changes.push({ kind: "increased", name: line.name, from: was.amount, to: line.amount });
    } else if (line.amount < was.amount) {
      changes.push({ kind: "decreased", name: line.name, from: was.amount, to: line.amount });
    }
  }
  for (const line of before.lines) {
    if (!afterById.has(line.id) && line.amount > 0) {
      changes.push({ kind: "removed", name: line.name, from: line.amount, to: 0 });
    }
  }

  return changes.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
}
