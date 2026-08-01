import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GlossaryTermId } from "@/lib/lexicon";

interface Props {
  /** Identifiant stable défini dans src/lib/lexicon.ts (GLOSSARY_TERMS). */
  term: GlossaryTermId;
  /** Libellé affiché ; par défaut celui du glossaire i18n. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * GlossaryTerm — glossaire contextuel réutilisable (audit .lovable/plan.md #10).
 * Survol souris = ouverture ; tap mobile / focus clavier = bascule ; toujours
 * relié via aria-describedby pour l'accessibilité. Une phrase, niveau débutant,
 * + un repère optionnel ("benchmark") uniquement si une donnée réelle existe déjà
 * dans le JSON i18n — jamais un chiffre inventé côté composant.
 */
export function GlossaryTerm({ term, children, className = "" }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  const label = children ?? t(`glossary.terms.${term}.label`);
  const definition = t(`glossary.terms.${term}.definition`);
  const benchmark = t(`glossary.terms.${term}.benchmark`, { defaultValue: "" });

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="underline decoration-dotted decoration-ink-3 underline-offset-2 text-inherit font-inherit cursor-help"
      >
        {label}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 bottom-full left-0 mb-2 w-64 max-w-[80vw] p-2.5 rounded-lg bg-ink text-paper text-caption leading-snug shadow-flat-2 normal-case"
        >
          <span className="block">{definition}</span>
          {benchmark && <span className="block mt-1 text-paper/70">{benchmark}</span>}
        </span>
      )}
    </span>
  );
}
