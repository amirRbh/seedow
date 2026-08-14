import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { callAuthed } from "@/lib/authedServerFn";
import { getDataHealth, type DataHealthReport } from "@/lib/data-engine/health.functions";

export const Route = createFileRoute("/_authenticated/admin/data")({
  component: AdminDataPage,
});

/** Tableau de bord interne de santé des données d'ingestion (§20). */
function AdminDataPage() {
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callAuthed(getDataHealth, undefined as never)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm" style={{ color: "var(--alert)" }}>
          {error}
        </p>
        <Link to="/dashboard" className="text-label underline mt-4 inline-block">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  if (!report) {
    return <div className="max-w-5xl mx-auto px-6 py-12 text-label">Chargement…</div>;
  }

  const { quality, sources, connectorsImplemented, connectorsTotal } = report;
  const invalidIsin = quality.invalidIsinFundIds.length;
  const dupIsin = Object.keys(quality.duplicateIsin).length;
  const dupTicker = Object.keys(quality.duplicateTicker).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="apple-eyebrow" style={{ color: "var(--mint)" }}>
        Data engine
      </p>
      <h1 className="apple-title mt-2" style={{ fontSize: "clamp(22px,3vw,30px)" }}>
        Santé des données
      </h1>
      <p className="text-label mt-2" style={{ color: "var(--ink-2)" }}>
        Instantané au {new Date(report.generatedAt).toLocaleString("fr-FR")} — pilote l'effort
        d'ingestion (§20/§21).
      </p>

      <section
        className="grid gap-3 mt-8"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
      >
        <Stat label="Fonds suivis" value={quality.fundsTracked} />
        <Stat label="Sains (frais & complets)" value={quality.healthy} tone="good" />
        <Stat
          label="À mettre à jour"
          value={quality.needsUpdate}
          tone={quality.needsUpdate > 0 ? "warn" : "good"}
        />
        <Stat
          label="Sans holdings"
          value={quality.fundsWithoutHoldings}
          tone={quality.fundsWithoutHoldings > 0 ? "warn" : "good"}
        />
        <Stat
          label="Sans source"
          value={quality.fundsWithoutSource}
          tone={quality.fundsWithoutSource > 0 ? "warn" : "good"}
        />
        <Stat
          label="Connecteurs actifs"
          value={`${connectorsImplemented}/${connectorsTotal}`}
          tone="good"
        />
      </section>

      <h2 className="apple-title mt-10 mb-3" style={{ fontSize: "18px" }}>
        Sources
      </h2>
      <div style={{ overflowX: "auto", border: "1px solid var(--paper-3)", borderRadius: 14 }}>
        <table className="w-full text-body-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--paper-2)" }}>
              <Th>Source</Th>
              <Th>Priorité</Th>
              <Th>Automatisation</Th>
              <Th>Connecteur</Th>
              <Th>Santé</Th>
              <Th>Dernier contrôle</Th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.key} style={{ borderTop: "1px solid var(--paper-3)" }}>
                <Td>{s.name}</Td>
                <Td mono>P{s.priority}</Td>
                <Td mono>{s.automation ?? "—"}</Td>
                <Td>
                  <span
                    className="font-mono"
                    style={{ color: s.implemented ? "var(--mint)" : "var(--ink-2)" }}
                  >
                    {s.implemented ? "✓ actif" : "— à venir"}
                  </span>
                </Td>
                <Td mono>{s.health}</Td>
                <Td mono>
                  {s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleDateString("fr-FR") : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="apple-title mt-10 mb-3" style={{ fontSize: "18px" }}>
        Anomalies
      </h2>
      <ul className="text-body-sm flex flex-col gap-1" style={{ color: "var(--ink-2)" }}>
        <li>
          ISIN invalides :{" "}
          <strong style={{ color: invalidIsin ? "var(--alert)" : "var(--mint)" }}>
            {invalidIsin}
          </strong>
        </li>
        <li>
          Doublons ISIN :{" "}
          <strong style={{ color: dupIsin ? "var(--alert)" : "var(--mint)" }}>{dupIsin}</strong>
        </li>
        <li>
          Doublons ticker :{" "}
          <strong style={{ color: dupTicker ? "var(--alert)" : "var(--mint)" }}>{dupTicker}</strong>
        </li>
      </ul>

      <Link to="/dashboard" className="text-label underline mt-8 inline-block">
        Retour au tableau de bord
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn";
}) {
  const color = tone === "good" ? "var(--mint)" : tone === "warn" ? "var(--solar)" : "var(--ink)";
  return (
    <div
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--paper-3)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div className="font-mono" style={{ fontSize: 26, color }}>
        {value}
      </div>
      <div className="text-label mt-1" style={{ color: "var(--ink-2)" }}>
        {label}
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      className="text-label text-left"
      style={{ padding: "9px 12px", color: "var(--ink-2)", fontWeight: 600 }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <td className={mono ? "font-mono" : undefined} style={{ padding: "9px 12px" }}>
      {children}
    </td>
  );
}
