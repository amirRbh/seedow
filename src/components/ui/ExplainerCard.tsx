interface Props {
  title?: string;
  children: React.ReactNode;
  tone?: "moss" | "bloom" | "peach" | "sky";
}

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  moss: "bg-moss-5 border-moss-4",
  bloom: "bg-[oklch(0.96_0.04_310)] border-[oklch(0.88_0.07_310)]",
  peach: "bg-[oklch(0.96_0.04_45)] border-[oklch(0.88_0.07_45)]",
  sky: "bg-[oklch(0.96_0.03_230)] border-[oklch(0.88_0.06_230)]",
};

const TONE_DOT: Record<NonNullable<Props["tone"]>, string> = {
  moss: "bg-moss-1",
  bloom: "bg-bloom",
  peach: "bg-rust",
  sky: "bg-sky",
};

/**
 * Petit encart pédagogique pour expliquer un concept en une phrase.
 * À utiliser en haut des sections "techniques" pour les débutants.
 */
export function ExplainerCard({ title, children, tone = "moss" }: Props) {
  return (
    <div className={`rounded-xl border p-3 ${TONE_BG[tone]}`}>
      <div className="flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${TONE_DOT[tone]}`} />
        <div className="text-[12px] text-ink-2 leading-relaxed">
          {title && <span className="font-semibold text-ink">{title} </span>}
          {children}
        </div>
      </div>
    </div>
  );
}
