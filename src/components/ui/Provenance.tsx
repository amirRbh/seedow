import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Statut de preuve d'une donnée. C'est le seul vocabulaire autorisé — il n'y a
 * pas de quatrième cas : une donnée est mesurée, estimée, ou contestée.
 */
export type ProvenanceStatus = "verified" | "modelled" | "disputed" | "unknown";

interface Props {
  /** Fournisseur ou document d'origine (« Yahoo Finance », « Sustainalytics »…). */
  source?: string;
  /** Date de la donnée : ISO, Date, ou chaîne déjà formatée. */
  asOf?: string | Date;
  /** Part du portefeuille (ou de l'univers) réellement couverte, en %. */
  coverage?: number;
  /** Défaut : `verified` si une source est fournie, `unknown` sinon. */
  status?: ProvenanceStatus;
  /** Lien vers la source primaire — la rend cliquable. */
  href?: string;
  /** Précision libre ajoutée en fin de ligne (méthode, réserve, droit de réponse). */
  note?: string;
  className?: string;
}

const STATUS_CLASS: Record<ProvenanceStatus, string> = {
  verified: "provenance--verified",
  modelled: "provenance--modelled",
  disputed: "provenance--disputed",
  unknown: "",
};

const STATUS_LABEL: Record<ProvenanceStatus, string | null> = {
  // « Vérifié » n'a pas besoin d'être écrit : c'est l'état attendu, et
  // l'écrire partout banaliserait les deux cas qui comptent vraiment.
  verified: null,
  modelled: "data_provenance.status_modelled",
  disputed: "data_provenance.status_disputed",
  unknown: "data_provenance.status_unknown",
};

/**
 * Le crochet de provenance — motif signature de la DA V2 « Preuve »
 * (docs/DA-V2-PREUVE.md §4.4).
 *
 * Chaque chiffre porte sa source, sa date et sa couverture à l'écran, en
 * élément typographique de premier plan, pas en note de bas de page
 * (CLAUDE.md §1.2). Le statut n'est jamais porté par la seule couleur : un
 * `modelled` ou un `disputed` écrit son libellé, un filet pointillé double
 * l'ocre. Discipline : une attestation par BLOC de données, pas une par ligne
 * — sinon l'écran devient un formulaire.
 */
export function Provenance({
  source,
  asOf,
  coverage,
  status,
  href,
  note,
  className,
}: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const resolved: ProvenanceStatus = status ?? (source ? "verified" : "unknown");
  const statusKey = STATUS_LABEL[resolved];

  // Une date ISO est formatée dans la langue courante ; une chaîne déjà
  // lisible (« T4 2025 », « rapport annuel ») est reprise telle quelle.
  const dateLabel =
    asOf instanceof Date || (typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}/.test(asOf))
      ? formatDate(asOf, lang, { year: "numeric", month: "short", day: "numeric" })
      : asOf;

  const parts: React.ReactNode[] = [];
  if (source) {
    parts.push(
      href ? (
        <a
          key="src"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ice-ink underline underline-offset-2 hover:no-underline"
        >
          {source}
        </a>
      ) : (
        <span key="src">{source}</span>
      ),
    );
  } else {
    parts.push(<span key="src">{t("data_provenance.no_source")}</span>);
  }
  if (dateLabel) parts.push(<span key="date">{dateLabel}</span>);
  if (typeof coverage === "number" && Number.isFinite(coverage)) {
    parts.push(
      <span key="cov">{t("data_provenance.coverage", { pct: Math.round(coverage) })}</span>,
    );
  }
  if (statusKey) parts.push(<span key="status">{t(statusKey)}</span>);
  if (note) parts.push(<span key="note">{note}</span>);

  return (
    <p className={cn("provenance", STATUS_CLASS[resolved], className)}>
      {parts.map((node, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {node}
        </span>
      ))}
    </p>
  );
}
