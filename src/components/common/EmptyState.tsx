import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * État vide — DA V4.
 *
 * Un écran sans donnée est le premier que voit un nouveau compte : il doit dire
 * ce qui apparaîtra ici et proposer le geste suivant, pas afficher un cadre en
 * pointillés. Une icône qui flotte doucement, un titre, une phrase, une action.
 * Chaque page de l'app dessinait le sien ; il n'y en a plus qu'un.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "paper-card flex animate-fade-in-up flex-col items-center px-6 py-12 text-center sm:py-14",
        className,
      )}
    >
      <span className="icon-badge h-16 w-16 animate-float rounded-[22px] motion-reduce:animate-none [&_svg]:h-7 [&_svg]:w-7">
        <Icon aria-hidden />
      </span>
      <h2 className="mt-6 max-w-[22ch] text-[clamp(20px,2.4vw,26px)]">{title}</h2>
      {description && (
        <p className="mt-2.5 max-w-[46ch] text-body leading-relaxed text-ink-2">{description}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
