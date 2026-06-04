import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Dictionnaire des termes financiers / ESG utilisés dans l'app.
 * Tutoiement systématique, registre éditorial sobre.
 */
export const GLOSSARY = {
  SFDR: {
    title: "SFDR",
    long: "Sustainable Finance Disclosure Regulation",
    body:
      "Règlement européen qui classe les fonds selon leur ambition durable. Article 6 = sans démarche ESG, Article 8 = promeut des caractéristiques ESG, Article 9 = objectif d'investissement durable.",
  },
  TER: {
    title: "TER",
    long: "Total Expense Ratio",
    body:
      "Frais annuels totaux d'un ETF, en % du capital. 0,20 % = 2 € par an pour 1 000 € investis. Plus c'est bas, plus la performance nette est élevée.",
  },
  Sharpe: {
    title: "Ratio de Sharpe",
    body:
      "Mesure de la rentabilité ajustée du risque. > 1 = bon, > 2 = excellent. Plus le ratio est élevé, plus chaque unité de risque rapporte.",
  },
  ESG: {
    title: "Score ESG",
    long: "Environnement · Social · Gouvernance",
    body:
      "Note synthétique (0–100) qui évalue les pratiques durables d'une entreprise sur trois piliers : impact environnemental, traitement humain, transparence de gouvernance.",
  },
  Volatilite: {
    title: "Volatilité",
    body:
      "Amplitude des variations d'un actif sur un an. 12 % signifie que sur un an, la valeur fluctue typiquement de ±12 %. Faible volatilité = parcours plus stable.",
  },
  MSCIWorld: {
    title: "MSCI World",
    body:
      "Indice de référence regroupant ~1 500 grandes entreprises des pays développés. Sert de mètre étalon pour comparer la performance d'un portefeuille actions monde.",
  },
  CO2: {
    title: "CO₂ évité",
    body:
      "Estimation des émissions évitées par ton portefeuille par rapport à un indice monde classique, à capital égal. Basée sur l'intensité carbone des actifs (gCO₂e par euro investi).",
  },
  Allocation: {
    title: "Allocation",
    body:
      "Répartition du capital entre tes différentes lignes. L'allocation cible est celle que la méthodologie recommande ; la réelle dérive avec les mouvements de marché.",
  },
  Reequilibrage: {
    title: "Rééquilibrage",
    body:
      "Action de ramener la répartition réelle vers l'allocation cible. Recommandé quand un actif s'écarte de plus de 5 points de sa cible.",
  },
  Horizon: {
    title: "Horizon",
    body:
      "Durée pendant laquelle tu prévois de laisser ton capital investi. Plus l'horizon est long, plus tu peux supporter de volatilité — et plus les intérêts composés jouent en ta faveur.",
  },
  Drawdown: {
    title: "Drawdown",
    body:
      "Baisse maximale observée entre un point haut et le point bas qui suit. Indique le pire scénario historique, pas la perte habituelle.",
  },
  DCA: {
    title: "DCA",
    long: "Dollar-Cost Averaging",
    body:
      "Méthode consistant à verser un montant fixe régulièrement (ex. 100 € / mois) plutôt qu'en une fois. Lisse le prix d'entrée et réduit l'impact du timing.",
  },
  PEA: {
    title: "PEA",
    long: "Plan d'Épargne en Actions",
    body:
      "Enveloppe française d'épargne en actions européennes. Au bout de 5 ans, les plus-values sont exonérées d'impôt sur le revenu — seuls les prélèvements sociaux de 17,2 % restent dus.",
  },
  AV: {
    title: "Assurance-Vie",
    body:
      "Enveloppe d'épargne polyvalente (actions, obligations, fonds euros). Après 8 ans : abattement annuel de 4 600 € (célibataire) puis 7,5 % d'IR + 17,2 % de prélèvements sociaux.",
  },
  CTO: {
    title: "CTO",
    long: "Compte-Titres Ordinaire",
    body:
      "Compte sans avantage fiscal, mais sans restriction (tous marchés, tous instruments). Plus-values et dividendes taxés au PFU 30 % (12,8 % IR + 17,2 % PS).",
  },
  Inflation: {
    title: "Inflation",
    body:
      "Hausse générale des prix qui érode le pouvoir d'achat. 2 % d'inflation par an signifie que 100 € aujourd'hui équivalent à ~82 € de pouvoir d'achat dans 10 ans.",
  },
  Beta: {
    title: "Bêta",
    body:
      "Sensibilité d'un actif aux mouvements du marché. Bêta = 1 : suit le marché ; > 1 : amplifie ; < 1 : amortit. Un bêta négatif évolue à l'inverse du marché.",
  },
  HHI: {
    title: "Indice HHI",
    long: "Herfindahl-Hirschman Index",
    body:
      "Mesure de la concentration d'un portefeuille. Plus le HHI est bas, mieux le capital est réparti. La diversification = 1 − HHI.",
  },
  TrackingError: {
    title: "Tracking Error",
    body:
      "Écart-type de la différence de performance entre un fonds et son indice de référence. Une TE faible (< 0,5 %) indique un suivi fidèle de l'indice.",
  },
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;

interface Props {
  term: GlossaryTerm;
  children?: ReactNode;
  /** Style du déclencheur. `inline` souligne discrètement, `icon` rend juste un ⓘ. */
  variant?: "inline" | "icon";
  className?: string;
}

/**
 * Tooltip de glossaire — wrapping autour d'un terme financier.
 * Usage : `<Glossary term="SFDR">SFDR</Glossary>` ou `<Glossary term="TER" variant="icon" />`.
 */
export function Glossary({ term, children, variant = "inline", className }: Props) {
  const entry = GLOSSARY[term];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Définition : ${entry.title}`}
          className={cn(
            "inline-flex items-baseline gap-1 align-baseline outline-none rounded-sm",
            "focus-visible:ring-2 focus-visible:ring-moss-1",
            variant === "inline" &&
              "border-b border-dotted border-ink-3 text-inherit hover:text-ink",
            variant === "icon" &&
              "w-4 h-4 items-center justify-center rounded-full border border-paper-3 text-ink-3 text-[10px] font-semibold hover:text-ink hover:border-ink-3",
            className,
          )}
        >
          {variant === "icon" ? (
            <span aria-hidden="true">i</span>
          ) : (
            <>
              <span>{children ?? entry.title}</span>
              <span aria-hidden="true" className="text-[9px] text-ink-3 leading-none">
                ⓘ
              </span>
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[280px] bg-ink text-paper border-ink"
      >
        <p className="text-[11px] font-semibold tracking-wide uppercase text-gold-soft mb-1">
          {entry.title}
          {"long" in entry && entry.long && (
            <span className="ml-1.5 text-paper/70 font-normal normal-case tracking-normal">
              · {entry.long}
            </span>
          )}
        </p>
        <p className="text-[12px] leading-relaxed">{entry.body}</p>
      </TooltipContent>
    </Tooltip>
  );
}
