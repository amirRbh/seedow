import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";

export function ImpactCertificate() {
  const [copying, setCopying] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setCopying(true);
    try {
      const url = `${window.location.origin}/certificat`;
      await navigator.clipboard.writeText(url);
      const rect = e.currentTarget.getBoundingClientRect();
      fireConfetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      toast.success("Lien du certificat copié");
    } catch {
      toast.error("Impossible de copier le lien");
    } finally {
      setTimeout(() => setCopying(false), 600);
    }
  };

  return (
    <div className="paper-card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="hidden sm:flex w-10 h-10 rounded-full bg-gold/10 border border-gold/30 items-center justify-center text-gold flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">Certificat d'impact</p>
          <h3 className="font-display text-lg text-ink mt-2 leading-tight">
            Édite ton certificat personnel
          </h3>
          <p className="text-body-sm text-ink-2 mt-2 leading-relaxed">
            Une page sobre, imprimable A4, qui résume l'impact projeté de ton portefeuille
            simulé : CO₂ évité (estimation), énergie verte financée, score ESG composite et
            méthodologie.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/certificat"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-ink text-paper text-label font-semibold uppercase tracking-[0.14em] hover:bg-ink-2 transition-colors"
            >
              Ouvrir le certificat
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-paper-3 bg-paper text-ink text-label font-semibold uppercase tracking-[0.14em] hover:bg-paper-2 transition-colors disabled:opacity-60"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="5" y="3" width="8" height="10" rx="1" />
                <path d="M3 5v8h6" />
              </svg>
              Copier le lien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
