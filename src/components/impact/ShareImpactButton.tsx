import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { impactShareData } from "@/lib/impact/share";
import type { PortfolioImpactMetrics } from "@/lib/impact/portfolioImpact";
import { cn } from "@/lib/utils";

/** Cible publique du partage — la landing, accessible sans compte (acquisition). */
const SHARE_URL = "https://seedow.life";

/**
 * Bouton « Partager mon impact » — la boucle d'acquisition honnête de Seedow.
 * Le message est composé UNIQUEMENT de chiffres réels (score d'impact ESG, et
 * l'écart carbone seulement s'il est mesuré de façon représentative, cf.
 * `impactShareData`). Partage natif (Web Share API) avec repli presse-papier.
 */
export function ShareImpactButton({
  metrics,
  variant = "solid",
  className,
}: {
  metrics: PortfolioImpactMetrics | null;
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { score, cleanerDeltaPct } = impactShareData(metrics);

  // Sans score réel, il n'y a rien d'honnête à partager : on n'affiche rien.
  if (score == null) return null;

  const message =
    cleanerDeltaPct != null
      ? t("share_impact.message_carbon", {
          score,
          pct: Math.round(cleanerDeltaPct * 100),
          url: SHARE_URL,
        })
      : t("share_impact.message", { score, url: SHARE_URL });

  const copyFallback = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t("share_impact.copied"));
    } catch {
      toast.error(t("share_impact.error"));
    }
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ title: t("share_impact.title"), text: message, url: SHARE_URL });
      } else {
        await copyFallback();
      }
    } catch (e) {
      // AbortError = partage natif annulé par l'utilisateur : ce n'est pas une erreur.
      if (e instanceof Error && e.name === "AbortError") return;
      await copyFallback();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono text-xs font-semibold transition-transform hover:scale-[1.03] disabled:opacity-50",
        variant === "solid"
          ? "bg-mint px-4 py-2 text-white"
          : "border border-paper-3 px-3 py-2 text-ink-2 hover:text-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5 15.4 17.5" />
        <path d="M15.4 6.5 8.6 10.5" />
      </svg>
      {t("share_impact.cta")}
    </button>
  );
}
