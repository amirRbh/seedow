import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatPercent } from "@/lib/format";
import { alignmentBand, type AlignmentBand } from "@/lib/portfolio/plain-language";
import { WhyThis } from "@/components/common/WhyThis";
import type { PortfolioAnalysis } from "@/lib/portfolio/analysis/analyzePortfolio";

/**
 * « Est-ce aligné avec ce que j'ai dit vouloir financer ? »
 *
 * Le moteur calcule `alignment.byConviction` — l'alignement conviction par
 * conviction — depuis toujours. Personne ne l'affichait : l'écran montrait
 * « 76/100 » et s'arrêtait là. Un chiffre nu ne répond pas à la question que
 * l'utilisateur se pose vraiment, qui est « et alors ? ».
 *
 * ── La complexité arrive par paliers ──────────────────────────────────────
 *
 *   1. une CONCLUSION en français : « plutôt aligné avec tes convictions » ;
 *   2. le CHIFFRE, qui la précise ;
 *   3. le DÉTAIL par conviction, qui dit d'où il vient ;
 *   4. la MÉTHODE et ses limites, repliées.
 *
 * Un débutant s'arrête au premier palier et a compris. Quelqu'un qui veut
 * vérifier descend jusqu'au quatrième. Personne n'est obligé de traverser la
 * finance pour lire la première ligne.
 *
 * ── Ce que cette carte n'est pas ──────────────────────────────────────────
 *
 * Ce n'est pas une mesure d'impact. Elle dit à quel point les fonds choisis
 * correspondent aux critères déclarés — pas ce que l'argent produit dans le
 * monde. La distinction est écrite à l'écran, pas seulement ici (§9).
 *
 * Une conviction sans donnée d'exposition ressort « pas mesurable » et jamais
 * zéro : un zéro accuserait le fonds d'un manque qui est le nôtre.
 */

/** Le ton accompagne le mot, il ne le remplace jamais (§4). */
const BAND_TONE: Record<AlignmentBand, string> = {
  strong: "text-mint-ink",
  partial: "text-ink",
  weak: "text-solar-ink",
  unknown: "text-ink-3",
};

interface Props {
  analysis: PortfolioAnalysis;
  className?: string;
}

export function AlignmentCard({ analysis, className = "" }: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const { overall, byConviction, exclusionsRespected, breaches } = analysis.alignment;
  const band = alignmentBand(overall);
  const convictions = Object.entries(byConviction) as Array<[string, number | null]>;

  return (
    <div className={className}>
      {/* Rappeler ce que l'utilisateur a DÉCLARÉ avant de juger son portefeuille.
          Sans ça, « aligné » flotte : aligné avec quoi ? Ses préférences ne
          doivent pas rester enfermées dans un formulaire de réglages. */}
      {convictions.length > 0 && (
        <p className="text-caption text-ink-3 leading-relaxed">
          {t("alignment_card.you_said", {
            causes: convictions
              .map(([c]) => t(`onboarding.steps.values.${c}`, { defaultValue: c }))
              .join(", "),
            count: convictions.length,
          })}
        </p>
      )}

      {/* PALIER 1 — la conclusion. C'est la seule ligne qu'un débutant doit lire. */}
      <p className={`mt-1 text-body-lg font-semibold leading-snug ${BAND_TONE[band]}`}>
        {t(`alignment_card.band.${band}`)}
      </p>

      {/* PALIER 2 — le chiffre, qui précise la conclusion sans la porter. */}
      {overall != null && (
        <p className="mt-1 font-value text-body-sm text-ink-2 tabular-nums">
          {t("alignment_card.score", { score: overall })}
        </p>
      )}

      {/* Ce que la note EST. Sans cette phrase, « aligné » se lit comme
          « vertueux », et une correspondance de critères devient une promesse
          d'effet sur le monde. */}
      <p className="mt-2 text-caption text-ink-3 leading-relaxed">
        {t("alignment_card.not_impact")}
      </p>

      {/* PALIER 3 — d'où vient le chiffre, conviction par conviction.
          Libellé et valeur sur une ligne, barre sur toute la largeur en
          dessous. La première version mettait les trois côte à côte : sur un
          téléphone il reste 284 px à ce bloc, la barre tombait à 68 px et
          « Droits humains » se tronquait. Empiler tient sur tous les écrans. */}
      {convictions.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {convictions.map(([cause, score]) => (
            <li key={cause}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-ink min-w-0 truncate">
                  {t(`onboarding.steps.values.${cause}`, { defaultValue: cause })}
                </span>
                {/* Le chiffre est écrit : la barre ne porte jamais seule
                    l'information. « Pas mesurable » n'est pas un zéro. */}
                <span className="text-tag font-mono tabular-nums text-ink-2 shrink-0">
                  {score != null
                    ? formatPercent(score / 100, lang, 0)
                    : t("alignment_card.unmeasured")}
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-paper-inset overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-mint" style={{ width: `${score ?? 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Les exclusions sont un filtre dur : leur respect est binaire, il ne se
          moyenne pas dans un score. On le dit à part. */}
      <p
        className={`mt-4 text-body-sm leading-snug ${
          exclusionsRespected ? "text-ink-2" : "text-alert-ink"
        }`}
      >
        {exclusionsRespected
          ? t("alignment_card.exclusions_ok")
          : t("alignment_card.exclusions_breached", { count: breaches.length })}
      </p>

      {/* PALIER 4 — la méthode, repliée. */}
      <WhyThis className="mt-3" label={t("alignment_card.how")}>
        {t("alignment_card.how_body")}
      </WhyThis>
    </div>
  );
}
