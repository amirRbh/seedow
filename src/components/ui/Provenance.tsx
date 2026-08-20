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
  /** Masque la pastille et ne garde que la ligne grise (blocs déjà étiquetés). */
  hideChip?: boolean;
  className?: string;
}

const CHIP_CLASS: Record<ProvenanceStatus, string> = {
  verified: "chip--verified",
  modelled: "chip--modelled",
  disputed: "chip--disputed",
  unknown: "",
};

const CHIP_LABEL: Record<ProvenanceStatus, string | null> = {
  // « Vérifié » se dit, parce que c'est justement l'information de valeur.
  verified: "data_provenance.status_verified",
  modelled: "data_provenance.status_modelled",
  disputed: "data_provenance.status_disputed",
  unknown: "data_provenance.status_unknown",
};

const LINE_CLASS: Record<ProvenanceStatus, string> = {
  verified: "",
  modelled: "provenance--modelled",
  disputed: "provenance--disputed",
  unknown: "",
};

function StatusIcon({ status }: { status: ProvenanceStatus }) {
  if (status === "verified") {
    return (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
        <path
          d="M2.5 8.5l3.5 3 7.5-8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "modelled") {
    return (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4.6V8l2.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 4.8v3.6M8 11.1v.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * L'état de preuve d'un chiffre — la seule chose que Seedow affiche et qu'aucun
 * concurrent ne peut copier sans avoir les données (CLAUDE.md §1.2).
 *
 * DA V3 : une pastille pour le STATUT, une ligne grise pour la source, la date
 * et la couverture. La V2 dessinait un crochet « ├ » répété sous chaque nombre :
 * trop bruyant, et ça lisait « outil interne » plutôt que produit fini.
 *
 * Le statut n'est jamais porté par la seule couleur : la pastille écrit son
 * libellé et porte une icône distincte (CLAUDE.md §4). Discipline inchangée :
 * une attestation par BLOC de données, pas une par ligne.
 */
export function Provenance({
  source,
  asOf,
  coverage,
  status,
  href,
  note,
  hideChip = false,
  className,
}: Props) {
  const { t } = useTranslation();
  const { lang } = useLang();

  const resolved: ProvenanceStatus = status ?? (source ? "verified" : "unknown");
  const chipKey = CHIP_LABEL[resolved];

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
          className="underline underline-offset-2 hover:no-underline"
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
  if (note) parts.push(<span key="note">{note}</span>);

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {!hideChip && chipKey && (
        <span className={cn("chip", CHIP_CLASS[resolved])}>
          <StatusIcon status={resolved} />
          {t(chipKey)}
        </span>
      )}
      <p className={cn("provenance", LINE_CLASS[resolved])}>
        {parts.map((node, i) => (
          <span key={i}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {node}
          </span>
        ))}
      </p>
    </div>
  );
}
