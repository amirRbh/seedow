import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RevealGroup } from "@/components/motion/Reveal";

/**
 * « Ce qu'on mesure, ce qu'on ne mesure pas ».
 *
 * Ce bloc a remplacé deux cartes qui affichaient des chiffres FABRIQUÉS (un
 * score de 74/100, une empreinte de −58 %, dix ans de performance comparée,
 * entièrement inventés). Il n'y avait pas de chiffre honnête à mettre à la
 * place : ce qui se démontre, c'est la LISTE de ce que Seedow mesure, et celle
 * de ce qu'il ne prétend pas mesurer. La seconde est la plus différenciante.
 *
 * DA V4 : deux cartes côte à côte, à poids égal. « Ne mesure pas » n'est pas un
 * défaut : son icône est un tiret neutre, pas une croix rouge (`--alert` reste
 * réservé au négatif réel, CLAUDE.md §4).
 */
export function MeasureScope() {
  const { t } = useTranslation();
  const measured = [
    t("landing.measure.measured_1"),
    t("landing.measure.measured_2"),
    t("landing.measure.measured_3"),
    t("landing.measure.measured_4"),
  ];
  const notMeasured = [
    t("landing.measure.not_1"),
    t("landing.measure.not_2"),
    t("landing.measure.not_3"),
  ];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="paper-card spot accent-mint p-7 sm:p-8">
          <h3>{t("landing.measure.measured_label")}</h3>
          <RevealGroup as="ul" className="mt-5 flex flex-col gap-3.5">
            {measured.map((line) => (
              <li key={line} className="flex items-start gap-3 text-body text-ink">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-mint text-paper">
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </RevealGroup>
        </div>

        <div className="paper-card-inset p-7 ring-1 ring-inset ring-paper-3 sm:p-8">
          <h3>{t("landing.measure.not_label")}</h3>
          <RevealGroup as="ul" className="mt-5 flex flex-col gap-3.5">
            {notMeasured.map((line) => (
              <li key={line} className="flex items-start gap-3 text-body text-ink-2">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-paper-inset text-ink-3">
                  <Minus aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </RevealGroup>
        </div>
      </div>
      <p className="mt-5 max-w-[70ch] text-body-sm leading-relaxed text-ink-3">
        {t("landing.measure.note")}
      </p>
    </div>
  );
}

/**
 * « Ce que le fonds dit » / « ce que ses données montrent » — la forme de
 * l'Observatoire, réduite à sa mécanique.
 *
 * Aucune valeur n'est affichée ici : ce sont les LIBELLÉS des deux colonnes que
 * l'Observatoire remplit avec des fonds réels. Montrer un exemple chiffré
 * reviendrait à désigner un fonds nommément depuis la page d'accueil, sur des
 * chiffres que le visiteur ne peut pas encore vérifier — c'est l'Observatoire
 * qui fait ça, avec la source et la date à côté de chaque ligne.
 */
export function ClaimVsData() {
  const { t } = useTranslation();
  const rows = [
    { claim: t("landing.observatory.row_1_claim"), data: t("landing.observatory.row_1_data") },
    { claim: t("landing.observatory.row_2_claim"), data: t("landing.observatory.row_2_data") },
    { claim: t("landing.observatory.row_3_claim"), data: t("landing.observatory.row_3_data") },
  ];

  return (
    <div className="paper-card spot p-6 sm:p-7">
      <div className="grid grid-cols-2 gap-x-4 px-1">
        <p className="stamp">{t("landing.observatory.col_claim")}</p>
        <p className="stamp">{t("landing.observatory.col_data")}</p>
      </div>
      <RevealGroup as="ul" className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.claim} className="grid grid-cols-2 gap-x-2">
            <span className="rounded-2xl rounded-r-md bg-paper-2 px-4 py-3.5 text-body-sm leading-snug text-ink-2">
              « {r.claim} »
            </span>
            <span className="tile-accent rounded-2xl rounded-l-md px-4 py-3.5 text-body-sm font-semibold leading-snug text-ink">
              {r.data}
            </span>
          </li>
        ))}
      </RevealGroup>
      <p className="mt-6 px-1 text-body-sm leading-relaxed text-ink-3">
        {t("landing.observatory.note")}
      </p>
    </div>
  );
}
