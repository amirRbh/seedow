import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Provenance } from "@/components/ui/Provenance";
import { cn } from "@/lib/utils";

/**
 * « Comment ça marche » — trois gestes, racontés au défilement.
 *
 * À gauche, le sommaire reste collé à l'écran et suit l'étape en cours ; à
 * droite, chaque étape est une carte avec sa petite démonstration. On comprend
 * le parcours en descendant, sans rien cliquer.
 *
 * ── Ce que les démonstrations affichent ────────────────────────────────────
 *
 * Aucun chiffre. La landing a déjà porté des valeurs fabriquées (un score, une
 * performance comparée) et elles ont été retirées : une démonstration chiffrée
 * désigne forcément un fonds, sur des données que le visiteur ne peut pas
 * encore vérifier. Ces trois vignettes montrent donc la FORME de chaque geste
 * — des convictions qu'on coche, des lignes retenues ou écartées, les trois
 * états de preuve — avec le vocabulaire réel du produit. Elles sont décoratives
 * (`aria-hidden`) : tout ce qu'elles disent est écrit dans le texte de l'étape.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // Une étape devient « en cours » quand elle traverse le milieu de l'écran.
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const steps = [
    { title: t("landing.v5.how.step1_title"), desc: t("landing.v5.how.step1_desc") },
    { title: t("landing.v5.how.step2_title"), desc: t("landing.v5.how.step2_desc") },
    { title: t("landing.v5.how.step3_title"), desc: t("landing.v5.how.step3_desc") },
  ];
  const accents = ["accent-mint", "accent-ice", "accent-volt"] as const;

  return (
    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <span className="chip chip--accent accent-mint">{t("landing.v5.how.eyebrow")}</span>
        <h2 className="display-lg mt-5 max-w-[12ch]">{t("landing.v5.how.title")}</h2>

        {/* Sommaire : l'étape en cours est marquée par le numéro plein ET le
            texte en encre — jamais par la couleur seule. */}
        <ol className="mt-10 hidden flex-col gap-1 lg:flex">
          {steps.map((step, i) => {
            const current = i === active;
            return (
              <li key={step.title}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() =>
                    stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left outline-none transition-colors duration-300",
                    "focus-visible:ring-2 focus-visible:ring-mint",
                    current ? "bg-paper shadow-card" : "hover:bg-paper-inset",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-full font-value text-body-sm transition-colors duration-300",
                      current ? "bg-ink text-paper" : "bg-paper-inset text-ink-3",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-body-lg font-semibold transition-colors duration-300",
                      current ? "text-ink" : "text-ink-3",
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="flex flex-col gap-5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={cn(
              accents[i],
              "paper-card spot overflow-hidden transition-[opacity,transform] duration-500 ease-brand motion-reduce:transition-none",
              i === active ? "opacity-100" : "lg:scale-[0.985] lg:opacity-60",
            )}
          >
            <div aria-hidden className="tile-accent m-3 rounded-[20px] p-5 sm:p-7">
              {i === 0 && <ConvictionsVisual live={i === active} />}
              {i === 1 && <FilterVisual live={i === active} />}
              {i === 2 && <ProofVisual />}
            </div>
            <div className="px-6 pt-3 pb-7 sm:px-8">
              <p className="font-value text-body-sm text-section-accent-ink">
                {t("landing.v5.how.step_label", { n: i + 1 })}
              </p>
              <h3 className="mt-2 text-[clamp(22px,2.6vw,28px)]">{step.title}</h3>
              <p className="mt-3 max-w-[52ch] text-body-lg leading-relaxed text-ink-2">
                {step.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Étape 1 — des convictions qui se cochent, l'une après l'autre. */
function ConvictionsVisual({ live }: { live: boolean }) {
  const { t } = useTranslation();
  const want = ["climat", "biodiversite", "humain", "egalite"] as const;
  const refuse = ["fossiles", "armes"] as const;
  // Combien de pastilles sont cochées : avance d'un cran tant que l'étape est
  // à l'écran, puis repart. En mouvement réduit, l'état final est affiché fixe.
  const total = want.length + refuse.length;
  const [count, setCount] = useState(2);

  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(total - 2);
      return;
    }
    const id = window.setInterval(() => setCount((c) => (c >= total - 1 ? 1 : c + 1)), 1100);
    return () => window.clearInterval(id);
  }, [live, total]);

  const pill = (label: string, on: boolean, tone: "mint" | "alert") => (
    <span
      key={label}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-body-sm font-semibold transition-all duration-500 ease-brand",
        on
          ? tone === "mint"
            ? "bg-mint text-paper"
            : "bg-alert text-paper"
          : "bg-paper text-ink-2 ring-1 ring-inset ring-paper-3",
      )}
    >
      {on ? (
        <Check className="size-4" strokeWidth={2.5} />
      ) : (
        <Plus className="size-4" strokeWidth={2.5} />
      )}
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {want.map((tag, i) => pill(t(`onboarding.steps.values.${tag}`), i < count, "mint"))}
      </div>
      <div className="flex flex-wrap gap-2">
        {refuse.map((tag, i) =>
          pill(t(`onboarding.steps.exclusions.${tag}`), i + want.length < count + 1, "alert"),
        )}
      </div>
    </div>
  );
}

/** Étape 2 — des lignes passées au filtre : certaines restent, d'autres non. */
function FilterVisual({ live }: { live: boolean }) {
  const { t } = useTranslation();
  // Largeurs purement graphiques : ce sont des silhouettes de lignes, pas des
  // valeurs. Aucune ne porte de chiffre.
  const rows = [
    { width: "78%", kept: true },
    { width: "62%", kept: true },
    { width: "70%", kept: false },
    { width: "54%", kept: true },
    { width: "66%", kept: false },
  ];
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row, i) => {
        const out = live && !row.kept;
        return (
          <li
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 transition-all duration-700 ease-brand",
              out && "translate-x-3 opacity-45",
            )}
            style={{ transitionDelay: live ? `${i * 90}ms` : "0ms" }}
          >
            <span
              className={cn(
                "flex h-7 w-7 flex-none items-center justify-center rounded-full transition-colors duration-500",
                out ? "bg-paper-inset text-ink-3" : "bg-section-accent text-paper",
              )}
            >
              {out ? (
                <Minus className="size-3.5" strokeWidth={3} />
              ) : (
                <Check className="size-3.5" strokeWidth={3} />
              )}
            </span>
            <span className="h-2.5 rounded-full bg-paper-inset" style={{ width: row.width }} />
            <span className="ml-auto flex-none text-caption font-semibold text-ink-3">
              {out ? t("landing.v5.how.visual_out") : t("landing.v5.how.visual_kept")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Étape 3 — les trois états de preuve qu'un chiffre peut porter dans Seedow. */
function ProofVisual() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2.5">
      {(["verified", "modelled", "disputed"] as const).map((status) => (
        <div key={status} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3.5">
          <Provenance status={status} source={t("landing.v5.how.visual_source")} />
        </div>
      ))}
    </div>
  );
}
