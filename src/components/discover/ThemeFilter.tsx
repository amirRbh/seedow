import { lexicon } from "@/lib/lexicon";
import { useTranslation } from "react-i18next";

interface ThemeFilterProps {
  active: string;
  onChange: (theme: string) => void;
}

export function ThemeFilter({ active, onChange }: ThemeFilterProps) {
  const { t } = useTranslation();
  const themes = [
    { id: "all", label: t("theme_filter.all"), icon: "✧" },
    ...Object.entries(lexicon.themes).map(([id, t]) => ({ id, label: t.label, icon: t.icon })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
      {themes.map((theme) => {
        const isActive = active === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              isActive
                ? "bg-moss-1 text-paper"
                : "bg-card text-ink-2 border border-paper-3 hover:border-moss-3 hover:bg-moss-5 hover:text-moss-1"
            }`}
          >
            <span className="mr-1">{theme.icon}</span>
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
