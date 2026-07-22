// Pure compound-interest simulator. No I/O, runs client-side, deterministic.

export interface SimulationInput {
  /** Lump sum invested today, in €. */
  initial: number;
  /** Monthly recurring contribution, in €. */
  monthly: number;
  /** Investment horizon in years. */
  years: number;
  /** Conservative net annual return assumption (e.g. 0.03). */
  annualReturnLow: number;
  /** Optimistic net annual return assumption (e.g. 0.07). */
  annualReturnHigh: number;
  /** Optional one-off market shock applied at the end (e.g. -0.2 = −20%). */
  shockPct?: number;
}

export interface SimulationOutcome {
  contributions: number; // total € put in
  low: number; // future value at low assumption
  mid: number; // average of low/high
  high: number; // future value at high assumption
  shocked: number | null; // mid after the optional shock
}

function fv(initial: number, monthly: number, annualRate: number, years: number): number {
  const n = Math.max(0, Math.round(years * 12));
  const r = annualRate / 12;
  const fvInitial = initial * Math.pow(1 + r, n);
  const fvMonthly = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  return fvInitial + fvMonthly;
}

export function runSimulation(input: SimulationInput): SimulationOutcome {
  const { initial, monthly, years, annualReturnLow, annualReturnHigh, shockPct } = input;
  const low = fv(initial, monthly, annualReturnLow, years);
  const high = fv(initial, monthly, annualReturnHigh, years);
  const mid = (low + high) / 2;
  const contributions = initial + monthly * Math.round(years * 12);
  const shocked = shockPct != null ? mid * (1 + shockPct) : null;
  return { contributions, low, mid, high, shocked };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));

export function formatSimulation(
  input: SimulationInput,
  out: SimulationOutcome,
  lang: "fr" | "en",
): string {
  const en = lang === "en";
  const yearsLabel = en ? "years" : "ans";
  const range = `**${en ? "€" : ""}${fmt(out.low)}${en ? "" : " €"}** ${en ? "to" : "à"} **${en ? "€" : ""}${fmt(out.high)}${en ? "" : " €"}**`;
  const gain = out.mid - out.contributions;
  const gainStr = `${en ? "€" : ""}${fmt(Math.abs(gain))}${en ? "" : " €"}`;
  const header = en
    ? `**Simulation.** ${input.monthly > 0 ? `€${fmt(input.monthly)}/month` : "Lump sum"}${input.initial > 0 && input.monthly > 0 ? ` + €${fmt(input.initial)} upfront` : ""} · ${input.years} ${yearsLabel} · net return ${(input.annualReturnLow * 100).toFixed(1)}–${(input.annualReturnHigh * 100).toFixed(1)} %`
    : `**Simulation.** ${input.monthly > 0 ? `${fmt(input.monthly)} €/mois` : "Versement unique"}${input.initial > 0 && input.monthly > 0 ? ` + ${fmt(input.initial)} € au départ` : ""} · ${input.years} ${yearsLabel} · rendement net ${(input.annualReturnLow * 100).toFixed(1)}–${(input.annualReturnHigh * 100).toFixed(1)} %`;

  const constat = en
    ? `**Constat.** You'd end up with ${range}, on top of ${en ? "€" : ""}${fmt(out.contributions)}${en ? "" : " €"} contributed.`
    : `**Constat.** Tu finirais avec ${range}, sur ${fmt(out.contributions)} € versés.`;

  const impact = en
    ? `**Impact.** That's roughly **${gainStr}** of compound growth — the math rewards consistency more than timing.`
    : `**Impact.** Soit environ **${gainStr}** d'intérêts cumulés — la régularité paie plus que le market timing.`;

  const shockLine =
    out.shocked != null
      ? `\n${
          en
            ? `**Shock test.** A ${Math.round(Math.abs((input.shockPct ?? 0) * 100))}% drop right before the end would leave you near **${en ? "€" : ""}${fmt(out.shocked)}${en ? "" : " €"}** — still above your contributions if held long enough.`
            : `**Stress-test.** Une baisse de ${Math.round(Math.abs((input.shockPct ?? 0) * 100))} % juste avant l'échéance te laisserait autour de **${fmt(out.shocked)} €** — toujours au-dessus de tes versements si tu tiens le cap.`
        }`
      : "";

  // Clôture volontairement explicative et neutre : Ethi n'incite jamais à
  // investir, ne fabrique pas d'urgence et ne fait pas de growth (CLAUDE.md
  // §5.2 / §5.6 / §1.5). On explique le mécanisme et on invite à explorer,
  // sans impératif du type « programme ce versement maintenant ».
  const piste = en
    ? `**Worth exploring.** The gap between what you put in and the result comes from compound interest — the longer the horizon, the larger that share. Try other durations or amounts to see how the range moves.`
    : `**Piste à explorer.** L'écart entre ce que tu verses et le résultat vient des intérêts composés — plus l'horizon est long, plus cette part grandit. Teste d'autres durées ou montants pour voir comment la fourchette bouge.`;

  const disclaimer = en
    ? `\n\n_⚠️ Estimate based on average assumptions. Past performance does not guarantee future returns, and your capital is not guaranteed._`
    : `\n\n_⚠️ Estimation basée sur des hypothèses moyennes. Les performances passées ne préjugent pas du futur, et ton capital n'est pas garanti._`;

  return `${header}\n\n${constat}\n${impact}${shockLine}\n${piste}${disclaimer}`;
}
