/**
 * Ton Argent Vote — server functions.
 *
 * - listResolutions / getResolution : publiques (donnée d'AG publique + agrégat
 *   du Bloc). L'agrégat est calculé avec le service_role, qui ne renvoie que des
 *   comptes — jamais une ligne de vote nominative (protégée par RLS).
 * - getMyVotes / castVote : authentifiées (requireSupabaseAuth), scopées à
 *   l'utilisateur courant via `context.supabase` (RLS).
 *
 * Les tables `agm_resolutions` / `resolution_votes` viennent d'être créées et ne
 * sont pas encore dans les types Supabase auto-générés : on passe donc par un
 * client typé large (`as any`), comme le reste du repo le fait pour les objets
 * pas encore régénérés (cf. vues comprehension_*). À la prochaine régénération
 * des types par Lovable Cloud, ces casts pourront être retirés.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tallyVotes, emptyTally, type BlocTally, type VoteChoice } from "./bloc";
import { computeWrapped, emptyWrapped, type WrappedStats } from "./wrapped";

export interface Resolution {
  id: string;
  company: string;
  ticker: string | null;
  theme: string | null;
  title: string;
  summary: string;
  forLabel: string;
  againstLabel: string;
  fundsStance: string;
  sourceName: string;
  sourceUrl: string;
  meetingDate: string;
  closesAt: string;
  status: "open" | "closed";
  outcomePct: number | null;
  outcomeNote: string | null;
}

export interface ResolutionWithBloc {
  resolution: Resolution;
  bloc: BlocTally;
}

const RESOLUTION_COLUMNS =
  "id, company, ticker, theme, title, summary, for_label, against_label, funds_stance, source_name, source_url, meeting_date, closes_at, status, outcome_pct, outcome_note";

interface ResolutionRow {
  id: string;
  company: string;
  ticker: string | null;
  theme: string | null;
  title: string;
  summary: string;
  for_label: string;
  against_label: string;
  funds_stance: string;
  source_name: string;
  source_url: string;
  meeting_date: string;
  closes_at: string;
  status: string;
  outcome_pct: number | string | null;
  outcome_note: string | null;
}

function mapResolution(row: ResolutionRow): Resolution {
  return {
    id: row.id,
    company: row.company,
    ticker: row.ticker,
    theme: row.theme,
    title: row.title,
    summary: row.summary,
    forLabel: row.for_label,
    againstLabel: row.against_label,
    fundsStance: row.funds_stance,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    meetingDate: row.meeting_date,
    closesAt: row.closes_at,
    status: row.status === "closed" ? "closed" : "open",
    outcomePct: row.outcome_pct == null ? null : Number(row.outcome_pct),
    outcomeNote: row.outcome_note,
  };
}

/**
 * Agrège les votes par résolution avec le service_role. Ne renvoie qu'un
 * décompte (jamais une ligne). Borne de sécurité sur le nombre de lignes lues :
 * suffisant à l'échelle bêta, à remplacer par un COUNT groupé si le volume
 * explose.
 */
async function tallyByResolution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  resolutionIds: string[],
): Promise<Map<string, BlocTally>> {
  const byId = new Map<string, BlocTally>();
  if (resolutionIds.length === 0) return byId;

  const { data, error } = await admin
    .from("resolution_votes")
    .select("resolution_id, choice")
    .in("resolution_id", resolutionIds)
    .limit(100000);
  if (error) throw new Error(error.message);

  const grouped = new Map<string, { choice: string | null }[]>();
  for (const row of (data ?? []) as { resolution_id: string; choice: string | null }[]) {
    const list = grouped.get(row.resolution_id) ?? [];
    list.push({ choice: row.choice });
    grouped.set(row.resolution_id, list);
  }
  for (const id of resolutionIds) {
    byId.set(id, tallyVotes(grouped.get(id) ?? []));
  }
  return byId;
}

export const listResolutions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResolutionWithBloc[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data, error } = await admin
      .from("agm_resolutions")
      .select(RESOLUTION_COLUMNS)
      // Ouvertes d'abord, puis par échéance la plus proche.
      .order("status", { ascending: true })
      .order("closes_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as ResolutionRow[];
    const tallies = await tallyByResolution(
      admin,
      rows.map((r) => r.id),
    );

    return rows.map((row) => ({
      resolution: mapResolution(row),
      bloc: tallies.get(row.id) ?? emptyTally(),
    }));
  },
);

export const getResolution = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ResolutionWithBloc | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: row, error } = await admin
      .from("agm_resolutions")
      .select(RESOLUTION_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const tallies = await tallyByResolution(admin, [data.id]);
    return {
      resolution: mapResolution(row as ResolutionRow),
      bloc: tallies.get(data.id) ?? emptyTally(),
    };
  });

/** Les votes de l'utilisateur courant, sous forme { resolutionId: choice }. */
export const getMyVotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, VoteChoice>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data, error } = await db
      .from("resolution_votes")
      .select("resolution_id, choice")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const out: Record<string, VoteChoice> = {};
    for (const row of (data ?? []) as { resolution_id: string; choice: VoteChoice }[]) {
      out[row.resolution_id] = row.choice;
    }
    return out;
  });

export interface CastVoteResult {
  resolutionId: string;
  choice: VoteChoice;
  bloc: BlocTally;
}

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resolutionId: string; choice: VoteChoice }) =>
    z
      .object({
        resolutionId: z.string().uuid(),
        choice: z.enum(["for", "against", "abstain"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CastVoteResult> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { error } = await db.from("resolution_votes").upsert(
      {
        user_id: context.userId,
        resolution_id: data.resolutionId,
        choice: data.choice,
      },
      { onConflict: "user_id,resolution_id" },
    );
    if (error) throw new Error(error.message);

    // Décompte à jour, calculé avec le service_role (agrégat seul).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tallies = await tallyByResolution(supabaseAdmin as any, [data.resolutionId]);

    return {
      resolutionId: data.resolutionId,
      choice: data.choice,
      bloc: tallies.get(data.resolutionId) ?? emptyTally(),
    };
  });

/** Bilan « Seedow Wrapped » de l'utilisateur, agrégé à partir de ses vrais votes. */
export const getWrapped = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WrappedStats> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: voteRows, error } = await db
      .from("resolution_votes")
      .select("resolution_id, choice")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const votes = ((voteRows ?? []) as { resolution_id: string; choice: VoteChoice }[]).map(
      (r) => ({ resolutionId: r.resolution_id, choice: r.choice }),
    );
    if (votes.length === 0) return emptyWrapped();

    const resIds = Array.from(new Set(votes.map((v) => v.resolutionId)));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: resRows, error: rErr } = await admin
      .from("agm_resolutions")
      .select("id, company")
      .in("id", resIds);
    if (rErr) throw new Error(rErr.message);
    const resolutions = ((resRows ?? []) as { id: string; company: string }[]).map((r) => ({
      id: r.id,
      company: r.company,
    }));

    const tallies = await tallyByResolution(admin, resIds);
    const blocTotals: Record<string, number> = {};
    for (const [id, tally] of tallies) blocTotals[id] = tally.total;

    return computeWrapped(votes, resolutions, blocTotals);
  });
