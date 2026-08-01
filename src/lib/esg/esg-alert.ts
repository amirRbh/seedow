/**
 * Détection d'une baisse significative de score ESG.
 *
 * Logique métier pure (hors composant) : compare le score courant d'un actif à
 * son score précédent et signale une baisse relative supérieure à un seuil
 * (20 % par défaut). Ne fabrique jamais de donnée — si le score précédent est
 * absent, aucune alerte n'est levée (cf. CLAUDE.md : chaque chiffre sourcé,
 * pas d'alarme gratuite).
 */

export interface EsgDropResult {
  /** `true` si la baisse relative atteint ou dépasse le seuil. */
  dropped: boolean;
  /** Baisse relative en points de pourcentage (ex. 25 pour −25 %). 0 sinon. */
  relativeDropPct: number;
}

export function detectEsgDrop(
  current: number,
  previous: number | null | undefined,
  thresholdPct = 20,
): EsgDropResult {
  if (
    previous == null ||
    !Number.isFinite(previous) ||
    previous <= 0 ||
    !Number.isFinite(current)
  ) {
    return { dropped: false, relativeDropPct: 0 };
  }
  const relativeDropPct = ((previous - current) / previous) * 100;
  if (relativeDropPct <= 0) {
    return { dropped: false, relativeDropPct: 0 };
  }
  return { dropped: relativeDropPct >= thresholdPct, relativeDropPct };
}

/**
 * Alerte greenwashing personnalisée (§14 audit) — priorise les signaux de
 * greenwashing qui portent sur des actifs RÉELLEMENT détenus, avec un libellé
 * factuel (poids réel de la ligne + date de la détection).
 *
 * Contrat de transparence : si le poids réel de la ligne dans le portefeuille
 * est inconnu (non fini / ≤ 0), on N'AFFICHE RIEN pour cet actif plutôt que
 * d'inventer ou d'approximer une exposition (CLAUDE.md §1.2/§1.3).
 */

export type GreenwashingRiskLevel = "low" | "medium" | "high";

/** Ligne détenue, telle qu'exposée par `useActivePortfolio` (poids réel). */
export interface OwnedHoldingExposure {
  id: string;
  name: string;
  /** Poids réel de la ligne dans le portefeuille actif, en % (0..100). */
  allocationPct: number | null | undefined;
}

/** Signal de greenwashing détecté sur un actif, indépendant de sa détention. */
export interface GreenwashingSignalInput {
  assetId: string;
  risk: GreenwashingRiskLevel;
  /** Première raison retenue (clé i18n `transparency.reasons.*`), si connue. */
  reasonKey: string | null;
}

export interface GreenwashingAlertCandidate {
  holdingId: string;
  holdingName: string;
  /** Poids réel de la ligne, en % — toujours connu ici (sinon exclu). */
  allocationPct: number;
  risk: "medium" | "high";
  reasonKey: string | null;
}

/**
 * Construit les candidats d'alerte greenwashing pour les lignes réellement
 * détenues. Exclut : risque "low", signal absent, et exposition inconnue.
 * Trié : risque élevé d'abord, puis poids réel décroissant (la ligne qui pèse
 * le plus dans le portefeuille est la plus urgente à signaler).
 */
export function buildGreenwashingAlertCandidates(
  holdings: readonly OwnedHoldingExposure[],
  signalsByAssetId: ReadonlyMap<string, GreenwashingSignalInput>,
): GreenwashingAlertCandidate[] {
  const out: GreenwashingAlertCandidate[] = [];
  for (const h of holdings) {
    const signal = signalsByAssetId.get(h.id);
    if (!signal || signal.risk === "low") continue;
    if (h.allocationPct == null || !Number.isFinite(h.allocationPct) || h.allocationPct <= 0) {
      // Exposition inconnue : on ne fabrique jamais un pourcentage, on n'affiche rien.
      continue;
    }
    out.push({
      holdingId: h.id,
      holdingName: h.name,
      allocationPct: h.allocationPct,
      risk: signal.risk,
      reasonKey: signal.reasonKey,
    });
  }
  return out.sort((a, b) => {
    const r = (b.risk === "high" ? 1 : 0) - (a.risk === "high" ? 1 : 0);
    if (r !== 0) return r;
    return b.allocationPct - a.allocationPct;
  });
}

/** Entrée générique triable par priorité d'alerte. */
export interface PrioritizableAlert {
  kind: string;
  severity: "info" | "warn" | "alert";
  createdAt: string; // ISO
}

const ALERT_SEVERITY_RANK: Record<PrioritizableAlert["severity"], number> = {
  alert: 3,
  warn: 2,
  info: 1,
};

/**
 * Tri de priorité des alertes affichées dans la cloche (§14) : les alertes
 * greenwashing sur des actifs détenus passent toujours en tête (le seul motif
 * d'ouverture "à haute valeur", cf. audit §8), puis on retombe sur la sévérité,
 * puis sur la fraîcheur. Fonction pure, ne mute jamais le tableau d'entrée.
 */
export function sortAlertsByPriority<T extends PrioritizableAlert>(alerts: readonly T[]): T[] {
  return [...alerts].sort((a, b) => {
    const kindBoost = (x: T) => (x.kind === "greenwashing" ? 1 : 0);
    const kb = kindBoost(b) - kindBoost(a);
    if (kb !== 0) return kb;
    const s = ALERT_SEVERITY_RANK[b.severity] - ALERT_SEVERITY_RANK[a.severity];
    if (s !== 0) return s;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
