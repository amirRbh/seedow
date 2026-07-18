import type { ActivePortfolio } from "@/hooks/useActivePortfolio";

export type BadgeId =
  | "first_position"
  | "patient_investor"
  | "biodiversity"
  | "regular_contributor"
  | "carbon_neutral"
  | "forest"
  | "first_withdrawal"
  | "aligned";

export interface BadgeDef {
  id: BadgeId;
  icon: string;
  tier: "bronze" | "silver" | "gold";
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: "first_position", icon: "🌱", tier: "bronze" },
  { id: "patient_investor", icon: "🧘", tier: "bronze" },
  { id: "biodiversity", icon: "🌿", tier: "silver" },
  { id: "regular_contributor", icon: "💧", tier: "silver" },
  { id: "carbon_neutral", icon: "🌍", tier: "silver" },
  { id: "forest", icon: "🌳", tier: "gold" },
  { id: "first_withdrawal", icon: "🍎", tier: "gold" },
  { id: "aligned", icon: "✨", tier: "gold" },
];

const PATIENT_INVESTOR_DAYS = 90;
const BIODIVERSITY_MIN_HOLDINGS = 5;
const ALIGNED_MIN_ESG = 8.5;

/**
 * Détermine les badges réellement débloqués à partir du portefeuille actif.
 * `regular_contributor`, `carbon_neutral`, `forest`, `first_withdrawal` nécessitent un
 * historique de versements/retraits que l'app ne suit pas encore : ils restent
 * verrouillés (aspirationnels) tant que cette donnée n'existe pas.
 */
export function computeUnlockedBadgeIds(
  portfolio: ActivePortfolio,
  esgScore: number,
): Set<BadgeId> {
  const unlocked = new Set<BadgeId>();
  unlocked.add("first_position");

  const days = (Date.now() - new Date(portfolio.generated_at).getTime()) / 86_400_000;
  if (days >= PATIENT_INVESTOR_DAYS) unlocked.add("patient_investor");

  if (portfolio.holdings.length >= BIODIVERSITY_MIN_HOLDINGS) unlocked.add("biodiversity");

  if (esgScore >= ALIGNED_MIN_ESG) unlocked.add("aligned");

  return unlocked;
}
