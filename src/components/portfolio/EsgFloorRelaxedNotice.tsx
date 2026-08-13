import { useTranslation } from "react-i18next";

/**
 * Notice honnête (CLAUDE.md §1.2 — non négociable « chaque chiffre est sourcé et
 * attribué à l'écran ») affichée quand l'optimiseur n'a pas pu satisfaire le
 * plancher ESG (70/100) sous les contraintes de l'utilisateur : on le DIT plutôt
 * que de laisser croire que le portefeuille atteint le seuil. Le score réel reste
 * affiché tel quel à côté. Ton d'avertissement doux (token `solar`), jamais alarmiste.
 */
export function EsgFloorRelaxedNotice({ relaxed }: { relaxed: boolean }) {
  const { t } = useTranslation();
  if (!relaxed) return null;
  return (
    <div
      role="note"
      className="rounded-[14px] border border-solar-tint-border bg-solar-tint p-4"
    >
      <div className="flex items-start gap-3">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 flex-none text-solar-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink">
            {t("portfolio.esg_floor_relaxed_title")}
          </p>
          <p className="mt-1 text-caption text-ink-2 leading-relaxed">
            {t("portfolio.esg_floor_relaxed_desc")}
          </p>
        </div>
      </div>
    </div>
  );
}
